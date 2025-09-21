import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AttendanceEvent {
  type: string;
  userId: string;
  userName: string;
  timestamp: string;
  location: any;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
  severity: string;
}

interface DashboardStats {
  employeesAtWork: number;
  employeesOnBreak: number;
  totalHoursToday: number;
  activeAlerts: number;
  totalEmployees: number;
}

interface LiveEmployee {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy: number;
  };
  clockInTime: string | null;
  totalHoursToday: number;
}

type EventCallback = (data: any) => void;

export class WebSocketService {
  private static socket: Socket | null = null;
  private static isConnected = false;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 1000; // Start with 1 second
  private static eventListeners = new Map<string, EventCallback[]>();

  /**
   * Initialize WebSocket connection
   */
  static async connect(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found, cannot connect to WebSocket');
        return;
      }

      const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const wsURL = baseURL.replace(/^http/, 'ws');

      this.socket = io(wsURL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private static setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.warn('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Request initial dashboard data
      this.socket?.emit('request_dashboard_data');
      
      this.emit('connected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.emit('disconnected', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection_failed', { error: 'Max reconnection attempts reached' });
      } else {
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    });

    // Dashboard data events
    this.socket.on('dashboard_stats', (data: DashboardStats) => {
      this.emit('dashboard_stats', data);
    });

    this.socket.on('dashboard_stats_update', (data: DashboardStats) => {
      this.emit('dashboard_stats_update', data);
    });

    this.socket.on('live_employees', (data: LiveEmployee[]) => {
      this.emit('live_employees', data);
    });

    this.socket.on('live_employees_update', (data: LiveEmployee[]) => {
      this.emit('live_employees_update', data);
    });

    // Attendance events
    this.socket.on('attendance_event', (data: AttendanceEvent) => {
      this.emit('attendance_event', data);
    });

    this.socket.on('employee_location_update', (data: any) => {
      this.emit('employee_location_update', data);
    });

    // Alert events
    this.socket.on('new_alert', (data: Alert) => {
      this.emit('new_alert', data);
    });

    this.socket.on('personal_alert', (data: Alert) => {
      this.emit('personal_alert', data);
    });

    // Notification events
    this.socket.on('notification', (data: any) => {
      this.emit('notification', data);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  /**
   * Check if WebSocket is connected
   */
  static isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Send location update
   */
  static sendLocationUpdate(locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp?: string;
  }): void {
    if (this.isSocketConnected()) {
      this.socket?.emit('location_update', {
        ...locationData,
        timestamp: locationData.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Request dashboard data
   */
  static requestDashboardData(): void {
    if (this.isSocketConnected()) {
      this.socket?.emit('request_dashboard_data');
    }
  }

  /**
   * Add event listener
   */
  static addEventListener(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  static removeEventListener(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Remove all event listeners for an event
   */
  static removeAllEventListeners(event: string): void {
    this.eventListeners.delete(event);
  }

  /**
   * Emit event to all listeners
   */
  private static emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  static getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * Force reconnection
   */
  static async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    await this.connect();
  }
}

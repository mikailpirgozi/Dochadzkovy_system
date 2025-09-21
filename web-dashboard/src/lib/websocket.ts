import { io, Socket } from 'socket.io-client';

export interface AttendanceEvent {
  type: string;
  userId: string;
  userName: string;
  timestamp: string;
  location: Record<string, any>;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
  severity: string;
  resolved: boolean;
  user: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface DashboardStats {
  employeesAtWork: number;
  employeesOnBreak: number;
  totalHoursToday: number;
  activeAlerts: number;
  totalEmployees: number;
  clockedInEmployees: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    clockInTime: string;
    user: any;
  }>;
}

export interface LiveEmployee {
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

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: string;
    label: string;
  }>;
  period: string;
  startDate: string;
  endDate: string;
}

type EventCallback<T = any> = (data: T) => void;

export class WebSocketService {
  private static socket: Socket | null = null;
  private static isConnected = false;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 1000;
  private static eventListeners = new Map<string, EventCallback[]>();

  /**
   * Initialize WebSocket connection
   */
  static async connect(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, cannot connect to WebSocket');
        return;
      }

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // Socket.IO server runs on the same HTTP server, not separate WebSocket server
      const wsURL = baseURL.replace('/api', '');

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
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Request initial dashboard data
      this.socket?.emit('request_dashboard_data');
      
      // Emit connected event to listeners
      this.emitToListeners('connected', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.emitToListeners('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emitToListeners('connection_failed', error);
      }
    });

    // Dashboard events
    this.socket.on('dashboard_stats', (data: DashboardStats) => {
      this.emitToListeners('dashboard_stats', data);
    });

    this.socket.on('dashboard_stats_update', (data: DashboardStats) => {
      this.emitToListeners('dashboard_stats_update', data);
    });

    // Live employees
    this.socket.on('live_employees', (data: LiveEmployee[]) => {
      this.emitToListeners('live_employees', data);
    });

    this.socket.on('live_employees_update', (data: LiveEmployee[]) => {
      this.emitToListeners('live_employees_update', data);
    });

    // Attendance events
    this.socket.on('attendance_event', (event: AttendanceEvent) => {
      this.emitToListeners('attendance_event', event);
    });

    // Alerts
    this.socket.on('alert_created', (alert: Alert) => {
      this.emitToListeners('alert_created', alert);
    });

    this.socket.on('alert_resolved', (alert: Alert) => {
      this.emitToListeners('alert_resolved', alert);
    });

    // Chart data updates
    this.socket.on('chart_data_update', (data: ChartData) => {
      this.emitToListeners('chart_data_update', data);
    });

    // Geofence violations
    this.socket.on('geofence_violation', (data: any) => {
      this.emitToListeners('geofence_violation', data);
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
    }
  }

  /**
   * Reconnect to WebSocket
   */
  static async reconnect(): Promise<void> {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.connect();
  }

  /**
   * Check if socket is connected
   */
  static isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Add event listener
   */
  static addEventListener<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as EventCallback);
  }

  /**
   * Remove event listener
   */
  static removeEventListener<T = any>(event: string, callback: EventCallback<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback as EventCallback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private static emitToListeners(event: string, data: any): void {
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
   * Request dashboard data
   */
  static requestDashboardData(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('request_dashboard_data');
    }
  }

  /**
   * Request live employees data
   */
  static requestLiveEmployees(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('request_live_employees');
    }
  }

  /**
   * Request chart data
   */
  static requestChartData(type: 'weekly' | 'monthly' | 'comparison', params?: Record<string, any>): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('request_chart_data', { type, ...params });
    }
  }

  /**
   * Join live dashboard room
   */
  static joinLiveDashboard(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_live_dashboard');
    }
  }

  /**
   * Leave live dashboard room
   */
  static leaveLiveDashboard(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_live_dashboard');
    }
  }
}

// Export types
export type {
  ChartData,
  EventCallback
};

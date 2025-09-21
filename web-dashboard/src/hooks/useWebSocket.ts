import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface AttendanceEvent {
  type: string;
  userId: string;
  userName: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
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

interface UseWebSocketReturn {
  isConnected: boolean;
  dashboardStats: DashboardStats | null;
  liveEmployees: LiveEmployee[];
  recentEvents: AttendanceEvent[];
  activeAlerts: Alert[];
  connectionStatus: {
    connected: boolean;
    reconnectAttempts: number;
  };
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [liveEmployees, setLiveEmployees] = useState<LiveEmployee[]>([]);
  const [recentEvents, setRecentEvents] = useState<AttendanceEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(() => {
    if (socket?.connected) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('No auth token found, cannot connect to WebSocket');
      return;
    }

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsURL = baseURL.replace(/^http/, 'ws');

    const newSocket = io(wsURL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setReconnectAttempts(0);
      // Request initial dashboard data
      newSocket.emit('request_dashboard_data');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      setReconnectAttempts(prev => prev + 1);
    });

    // Dashboard data events
    newSocket.on('dashboard_stats', (data: DashboardStats) => {
      setDashboardStats(data);
    });

    newSocket.on('dashboard_stats_update', (data: DashboardStats) => {
      setDashboardStats(data);
    });

    newSocket.on('live_employees', (data: LiveEmployee[]) => {
      setLiveEmployees(data);
    });

    newSocket.on('live_employees_update', (data: LiveEmployee[]) => {
      setLiveEmployees(data);
    });

    // Attendance events
    newSocket.on('attendance_event', (data: AttendanceEvent) => {
      setRecentEvents(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 events
    });

    // Alert events
    newSocket.on('new_alert', (data: Alert) => {
      setActiveAlerts(prev => [data, ...prev]);
    });

    newSocket.on('personal_alert', (data: Alert) => {
      setActiveAlerts(prev => [data, ...prev]);
    });

    // Error handling
    newSocket.on('error', (error: unknown) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    dashboardStats,
    liveEmployees,
    recentEvents,
    activeAlerts,
    connectionStatus: {
      connected: isConnected,
      reconnectAttempts,
    },
    connect,
    disconnect,
    reconnect,
  };
};

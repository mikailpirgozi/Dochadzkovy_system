import { useEffect, useState, useCallback } from 'react';
import { WebSocketService } from '../services/websocket.service';

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

interface UseWebSocketReturn {
  isConnected: boolean;
  dashboardStats: DashboardStats | null;
  liveEmployees: LiveEmployee[];
  recentEvents: AttendanceEvent[];
  activeAlerts: Alert[];
  connectionStatus: {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  };
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendLocationUpdate: (locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp?: string;
  }) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [liveEmployees, setLiveEmployees] = useState<LiveEmployee[]>([]);
  const [recentEvents, setRecentEvents] = useState<AttendanceEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleDashboardStats = useCallback((data: DashboardStats) => {
    setDashboardStats(data);
  }, []);

  const handleDashboardStatsUpdate = useCallback((data: DashboardStats) => {
    setDashboardStats(data);
  }, []);

  const handleLiveEmployees = useCallback((data: LiveEmployee[]) => {
    setLiveEmployees(data);
  }, []);

  const handleLiveEmployeesUpdate = useCallback((data: LiveEmployee[]) => {
    setLiveEmployees(data);
  }, []);

  const handleAttendanceEvent = useCallback((event: AttendanceEvent) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 events
  }, []);

  const handleNewAlert = useCallback((alert: Alert) => {
    setActiveAlerts(prev => [alert, ...prev]);
  }, []);

  const handlePersonalAlert = useCallback((alert: Alert) => {
    setActiveAlerts(prev => [alert, ...prev]);
  }, []);

  useEffect(() => {
    // Add event listeners
    WebSocketService.addEventListener('connected', handleConnect);
    WebSocketService.addEventListener('disconnected', handleDisconnect);
    WebSocketService.addEventListener('dashboard_stats', handleDashboardStats);
    WebSocketService.addEventListener('dashboard_stats_update', handleDashboardStatsUpdate);
    WebSocketService.addEventListener('live_employees', handleLiveEmployees);
    WebSocketService.addEventListener('live_employees_update', handleLiveEmployeesUpdate);
    WebSocketService.addEventListener('attendance_event', handleAttendanceEvent);
    WebSocketService.addEventListener('new_alert', handleNewAlert);
    WebSocketService.addEventListener('personal_alert', handlePersonalAlert);

    // Connect to WebSocket
    WebSocketService.connect();

    return () => {
      // Remove event listeners
      WebSocketService.removeEventListener('connected', handleConnect);
      WebSocketService.removeEventListener('disconnected', handleDisconnect);
      WebSocketService.removeEventListener('dashboard_stats', handleDashboardStats);
      WebSocketService.removeEventListener('dashboard_stats_update', handleDashboardStatsUpdate);
      WebSocketService.removeEventListener('live_employees', handleLiveEmployees);
      WebSocketService.removeEventListener('live_employees_update', handleLiveEmployeesUpdate);
      WebSocketService.removeEventListener('attendance_event', handleAttendanceEvent);
      WebSocketService.removeEventListener('new_alert', handleNewAlert);
      WebSocketService.removeEventListener('personal_alert', handlePersonalAlert);
    };
  }, [
    handleConnect,
    handleDisconnect,
    handleDashboardStats,
    handleDashboardStatsUpdate,
    handleLiveEmployees,
    handleLiveEmployeesUpdate,
    handleAttendanceEvent,
    handleNewAlert,
    handlePersonalAlert,
  ]);

  const connect = useCallback(async () => {
    await WebSocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    WebSocketService.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    await WebSocketService.reconnect();
  }, []);

  const sendLocationUpdate = useCallback((locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp?: string;
  }) => {
    WebSocketService.sendLocationUpdate(locationData);
  }, []);

  const connectionStatus = WebSocketService.getConnectionStatus();

  return {
    isConnected,
    dashboardStats,
    liveEmployees,
    recentEvents,
    activeAlerts,
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    sendLocationUpdate,
  };
};

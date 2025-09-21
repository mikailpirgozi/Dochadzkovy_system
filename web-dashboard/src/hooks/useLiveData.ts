import { useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';

interface LiveDataOptions {
  autoConnect?: boolean;
  pollInterval?: number;
  maxEvents?: number;
  maxAlerts?: number;
}

interface UseLiveDataReturn {
  // Connection status
  isConnected: boolean;
  connectionStatus: {
    connected: boolean;
    reconnectAttempts: number;
  };

  // Dashboard data
  dashboardStats: {
    employeesAtWork: number;
    employeesOnBreak: number;
    totalHoursToday: number;
    activeAlerts: number;
    totalEmployees: number;
  } | null;

  // Live employees
  liveEmployees: Array<{
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
  }>;

  // Recent events
  recentEvents: Array<{
    type: string;
    userId: string;
    userName: string;
    timestamp: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  }>;

  // Active alerts
  activeAlerts: Array<{
    id: string;
    type: string;
    message: string;
    userId: string;
    userName: string;
    timestamp: string;
    severity: string;
  }>;

  // Actions
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  refreshData: () => void;

  // Computed stats
  computedStats: {
    totalActiveEmployees: number;
    employeesOutside: number;
    averageHoursPerEmployee: number;
    criticalAlerts: number;
    recentActivity: number; // Events in last 5 minutes
    employeesByStatus: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  };
}

export const useLiveData = (options: LiveDataOptions = {}): UseLiveDataReturn => {
  const {
    autoConnect = true,
    pollInterval = 30000, // 30 seconds
    maxEvents = 100,
    maxAlerts = 50,
  } = options;

  const {
    isConnected,
    dashboardStats,
    liveEmployees,
    recentEvents: wsRecentEvents,
    activeAlerts: wsActiveAlerts,
    connectionStatus,
    connect,
    disconnect,
    reconnect,
  } = useWebSocket();

  // const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Limit the number of events and alerts to prevent memory issues
  const recentEvents = useMemo(() => wsRecentEvents.slice(0, maxEvents), [wsRecentEvents, maxEvents]);
  const activeAlerts = useMemo(() => wsActiveAlerts.slice(0, maxAlerts), [wsActiveAlerts, maxAlerts]);

  // Computed statistics
  const computedStats = useMemo(() => {
    const employeesByStatus = liveEmployees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = activeAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentActivity = recentEvents.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime > fiveMinutesAgo;
    }).length;

    return {
      totalActiveEmployees: liveEmployees.length,
      employeesOutside: liveEmployees.filter(emp => 
        emp.status === 'OUTSIDE_GEOFENCE' || emp.status === 'LOCATION_DISABLED'
      ).length,
      averageHoursPerEmployee: liveEmployees.length > 0 
        ? liveEmployees.reduce((sum, emp) => sum + emp.totalHoursToday, 0) / liveEmployees.length
        : 0,
      criticalAlerts: activeAlerts.filter(alert => 
        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
      ).length,
      recentActivity,
      employeesByStatus,
      alertsBySeverity,
    };
  }, [liveEmployees, activeAlerts, recentEvents]);

  const refreshData = useCallback(() => {
    // setLastRefresh(new Date());
    // The WebSocket connection will automatically refresh data
  }, []);

  // Auto-refresh data periodically
  useEffect(() => {
    if (!isConnected || !pollInterval) return;

    const interval = setInterval(() => {
      refreshData();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isConnected, pollInterval, refreshData]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }
  }, [autoConnect, isConnected, connect]);

  return {
    // Connection status
    isConnected,
    connectionStatus,

    // Dashboard data
    dashboardStats,

    // Live employees
    liveEmployees,

    // Recent events
    recentEvents,

    // Active alerts
    activeAlerts,

    // Actions
    connect,
    disconnect,
    reconnect,
    refreshData,

    // Computed stats
    computedStats,
  };
};

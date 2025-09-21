import { useState, useEffect, useCallback } from 'react';
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
    maxReconnectAttempts: number;
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
    location: any;
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
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  refreshData: () => void;
  sendLocationUpdate: (locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp?: string;
  }) => void;

  // Computed stats
  computedStats: {
    totalActiveEmployees: number;
    employeesOutside: number;
    averageHoursPerEmployee: number;
    criticalAlerts: number;
    recentActivity: number; // Events in last 5 minutes
  };
}

export const useLiveData = (options: LiveDataOptions = {}): UseLiveDataReturn => {
  const {
    autoConnect = true,
    pollInterval = 30000, // 30 seconds
    maxEvents = 50,
    maxAlerts = 20,
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
    sendLocationUpdate,
  } = useWebSocket();

  const [, setLastRefresh] = useState<Date>(new Date());

  // Limit the number of events and alerts to prevent memory issues
  const recentEvents = wsRecentEvents.slice(0, maxEvents);
  const activeAlerts = wsActiveAlerts.slice(0, maxAlerts);

  // Computed statistics
  const computedStats = {
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
    recentActivity: recentEvents.filter(event => {
      const eventTime = new Date(event.timestamp);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return eventTime > fiveMinutesAgo;
    }).length,
  };

  const refreshData = useCallback(() => {
    setLastRefresh(new Date());
    // The WebSocket service will automatically request fresh data
    if (isConnected) {
      // WebSocketService.requestDashboardData() is called automatically
    }
  }, [isConnected]);

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
    sendLocationUpdate,

    // Computed stats
    computedStats,
  };
};

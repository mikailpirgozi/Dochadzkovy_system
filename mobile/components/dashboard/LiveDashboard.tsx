import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebSocketService } from '../../src/services/websocket.service';

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

interface AttendanceEvent {
  type: string;
  userId: string;
  userName: string;
  timestamp: string;
  location: any;
}

interface LiveDashboardProps {
  onEmployeePress?: (employee: LiveEmployee) => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({ onEmployeePress }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [recentEvents, setRecentEvents] = useState<AttendanceEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Setup WebSocket event listeners
    const setupListeners = () => {
      WebSocketService.addEventListener('connected', handleConnected);
      WebSocketService.addEventListener('disconnected', handleDisconnected);
      WebSocketService.addEventListener('dashboard_stats', handleDashboardStats);
      WebSocketService.addEventListener('dashboard_stats_update', handleDashboardStats);
      WebSocketService.addEventListener('live_employees', handleLiveEmployees);
      WebSocketService.addEventListener('live_employees_update', handleLiveEmployees);
      WebSocketService.addEventListener('attendance_event', handleAttendanceEvent);
      WebSocketService.addEventListener('connection_failed', handleConnectionFailed);
    };

    const cleanup = () => {
      WebSocketService.removeEventListener('connected', handleConnected);
      WebSocketService.removeEventListener('disconnected', handleDisconnected);
      WebSocketService.removeEventListener('dashboard_stats', handleDashboardStats);
      WebSocketService.removeEventListener('dashboard_stats_update', handleDashboardStats);
      WebSocketService.removeEventListener('live_employees', handleLiveEmployees);
      WebSocketService.removeEventListener('live_employees_update', handleLiveEmployees);
      WebSocketService.removeEventListener('attendance_event', handleAttendanceEvent);
      WebSocketService.removeEventListener('connection_failed', handleConnectionFailed);
    };

    setupListeners();
    
    // Connect to WebSocket
    WebSocketService.connect();
    setIsConnected(WebSocketService.isSocketConnected());

    return cleanup;
  }, []);

  const handleConnected = () => {
    setIsConnected(true);
  };

  const handleDisconnected = () => {
    setIsConnected(false);
  };

  const handleDashboardStats = (data: DashboardStats) => {
    setStats(data);
  };

  const handleLiveEmployees = (data: LiveEmployee[]) => {
    setEmployees(data);
  };

  const handleAttendanceEvent = (event: AttendanceEvent) => {
    // Add to recent events (keep last 10)
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
  };

  const handleConnectionFailed = () => {
    Alert.alert(
      'Pripojenie zlyhalo',
      'Nepodarilo sa pripojiť k live dashboard. Skúste obnoviť.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Obnoviť', onPress: handleReconnect }
      ]
    );
  };

  const handleReconnect = async () => {
    setRefreshing(true);
    try {
      await WebSocketService.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    WebSocketService.requestDashboardData();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'CLOCKED_IN':
        return '#10b981'; // green
      case 'ON_BREAK':
        return '#f59e0b'; // yellow
      case 'ON_PERSONAL':
        return '#8b5cf6'; // purple
      case 'BUSINESS_TRIP':
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'CLOCKED_IN':
        return 'V práci';
      case 'ON_BREAK':
        return 'Na prestávke';
      case 'ON_PERSONAL':
        return 'Osobné voľno';
      case 'BUSINESS_TRIP':
        return 'Služobná cesta';
      default:
        return 'Offline';
    }
  };

  const formatEventTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventType = (type: string): string => {
    switch (type) {
      case 'CLOCK_IN':
        return 'Príchod';
      case 'CLOCK_OUT':
        return 'Odchod';
      case 'BREAK_START':
        return 'Začiatok prestávky';
      case 'BREAK_END':
        return 'Koniec prestávky';
      case 'PERSONAL_START':
        return 'Začiatok osobného voľna';
      case 'PERSONAL_END':
        return 'Koniec osobného voľna';
      default:
        return type;
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* Connection Status */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-800">Live Dashboard</Text>
          <View className="flex-row items-center">
            <View 
              className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <Text className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Pripojené' : 'Odpojené'}
            </Text>
          </View>
        </View>

        {/* Dashboard Stats */}
        {stats && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Aktuálny stav</Text>
            <View className="flex-row flex-wrap">
              <View className="bg-white rounded-lg p-4 shadow-sm mr-2 mb-2 flex-1 min-w-[45%]">
                <View className="flex-row items-center">
                  <Ionicons name="people" size={20} color="#10b981" />
                  <Text className="ml-2 text-sm text-gray-600">V práci</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.employeesAtWork}
                </Text>
              </View>
              
              <View className="bg-white rounded-lg p-4 shadow-sm mb-2 flex-1 min-w-[45%]">
                <View className="flex-row items-center">
                  <Ionicons name="restaurant" size={20} color="#f59e0b" />
                  <Text className="ml-2 text-sm text-gray-600">Na prestávke</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.employeesOnBreak}
                </Text>
              </View>
              
              <View className="bg-white rounded-lg p-4 shadow-sm mr-2 flex-1 min-w-[45%]">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={20} color="#3b82f6" />
                  <Text className="ml-2 text-sm text-gray-600">Hodiny dnes</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.totalHoursToday}h
                </Text>
              </View>
              
              <View className="bg-white rounded-lg p-4 shadow-sm flex-1 min-w-[45%]">
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={20} color="#ef4444" />
                  <Text className="ml-2 text-sm text-gray-600">Upozornenia</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-1">
                  {stats.activeAlerts}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Live Employees */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Aktívni zamestnanci ({employees.length})
          </Text>
          {employees.length > 0 ? (
            employees.map((employee) => (
              <TouchableOpacity
                key={employee.id}
                className="bg-white rounded-lg p-4 shadow-sm mb-2"
                onPress={() => onEmployeePress?.(employee)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-800">
                      {employee.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <View 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: getStatusColor(employee.status) }}
                      />
                      <Text className="text-sm text-gray-600">
                        {getStatusText(employee.status)}
                      </Text>
                    </View>
                    {employee.clockInTime && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Príchod: {formatEventTime(employee.clockInTime)}
                      </Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-medium text-gray-800">
                      {employee.totalHoursToday.toFixed(1)}h
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {new Date(employee.lastLocation.timestamp).toLocaleTimeString('sk-SK', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-white rounded-lg p-6 shadow-sm">
              <Text className="text-center text-gray-500">
                Žiadni aktívni zamestnanci
              </Text>
            </View>
          )}
        </View>

        {/* Recent Events */}
        <View>
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Posledné aktivity
          </Text>
          {recentEvents.length > 0 ? (
            recentEvents.map((event, index) => (
              <View key={`${event.userId}-${event.timestamp}-${index}`} className="bg-white rounded-lg p-3 shadow-sm mb-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">
                      {event.userName}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {formatEventType(event.type)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {formatEventTime(event.timestamp)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white rounded-lg p-6 shadow-sm">
              <Text className="text-center text-gray-500">
                Žiadne posledné aktivity
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

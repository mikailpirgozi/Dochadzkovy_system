import { useState, useEffect } from 'react';
import { StatsCard } from '../components/dashboard/stats-card';
import { LiveStatsCards } from '../components/dashboard/live-stats-cards';
import { LiveEmployeeList } from '../components/dashboard/live-employee-list';
import { LiveActivityFeed } from '../components/dashboard/live-activity-feed';
import { dashboardApi } from '../lib/api';
import { WebSocketService, type DashboardStats as LiveDashboardStats, type LiveEmployee, type AttendanceEvent, type Alert as WSAlert } from '../lib/websocket';
import { useDebounce } from '../hooks/useDebounce';
import { 
  Users, 
  Clock, 
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  clockedInEmployees: number;
  totalCompanies: number;
  activeAlerts: number;
  todayAttendance: number;
  avgWorkingHours: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    clockedInEmployees: 0,
    totalCompanies: 0,
    activeAlerts: 0,
    todayAttendance: 0,
    avgWorkingHours: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Live dashboard state
  const [liveStats, setLiveStats] = useState<LiveDashboardStats | null>(null);
  const [liveEmployees, setLiveEmployees] = useState<LiveEmployee[]>([]);
  const [recentEvents, setRecentEvents] = useState<AttendanceEvent[]>([]);
  const [alerts, setAlerts] = useState<WSAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [liveLoading, setLiveLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();
      
      // Handle both direct response and wrapped response
      const data = response?.data?.data || response?.data || response;
      
      if (data && (data.success !== false)) {
        // Map backend response to frontend interface
        setStats({
          totalEmployees: data.totalEmployees || 0,
          clockedInEmployees: data.employeesAtWork || data.clockedInEmployees || 0,
          totalCompanies: 1, // Single company for now
          activeAlerts: data.activeAlerts || 0,
          todayAttendance: data.totalHoursToday || data.todayAttendance || 0,
          avgWorkingHours: data.avgWorkingHours || 0
        });
      } else {
        // Set default values if data is missing
        setStats({
          totalEmployees: 0,
          clockedInEmployees: 0,
          totalCompanies: 0,
          activeAlerts: 0,
          todayAttendance: 0,
          avgWorkingHours: 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      
      // Show user-friendly error message for rate limiting
      if (error?.isRateLimit) {
        console.warn('Rate limit reached, using cached data or defaults');
      }
      
      // Set default values on error (graceful degradation)
      setStats({
        totalEmployees: 0,
        clockedInEmployees: 0,
        totalCompanies: 0,
        activeAlerts: 0,
        todayAttendance: 0,
        avgWorkingHours: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch function to prevent too many rapid calls
  const debouncedFetchStats = useDebounce(fetchDashboardStats, 1000);

  useEffect(() => {
    fetchDashboardStats();
    setupWebSocket();
    
    // Reduced auto-refresh to every 60 seconds to reduce API load
    const interval = setInterval(debouncedFetchStats, 60000);
    
    return () => {
      clearInterval(interval);
      cleanupWebSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupWebSocket = () => {
    // Setup WebSocket event listeners
    WebSocketService.addEventListener('connected', handleConnected);
    WebSocketService.addEventListener('disconnected', handleDisconnected);
    WebSocketService.addEventListener<LiveDashboardStats>('dashboard_stats', handleLiveStats);
    WebSocketService.addEventListener<LiveDashboardStats>('dashboard_stats_update', handleLiveStats);
    WebSocketService.addEventListener<LiveEmployee[]>('live_employees', handleLiveEmployees);
    WebSocketService.addEventListener<LiveEmployee[]>('live_employees_update', handleLiveEmployees);
    WebSocketService.addEventListener<AttendanceEvent>('attendance_event', handleAttendanceEvent);
    WebSocketService.addEventListener<WSAlert>('alert_created', handleAlertCreated);
    WebSocketService.addEventListener<WSAlert>('alert_resolved', handleAlertResolved);

    // Connect to WebSocket
    WebSocketService.connect();
    setIsConnected(WebSocketService.isSocketConnected());
  };

  const cleanupWebSocket = () => {
    WebSocketService.removeEventListener('connected', handleConnected);
    WebSocketService.removeEventListener('disconnected', handleDisconnected);
    WebSocketService.removeEventListener<LiveDashboardStats>('dashboard_stats', handleLiveStats);
    WebSocketService.removeEventListener<LiveDashboardStats>('dashboard_stats_update', handleLiveStats);
    WebSocketService.removeEventListener<LiveEmployee[]>('live_employees', handleLiveEmployees);
    WebSocketService.removeEventListener<LiveEmployee[]>('live_employees_update', handleLiveEmployees);
    WebSocketService.removeEventListener<AttendanceEvent>('attendance_event', handleAttendanceEvent);
    WebSocketService.removeEventListener<WSAlert>('alert_created', handleAlertCreated);
    WebSocketService.removeEventListener<WSAlert>('alert_resolved', handleAlertResolved);
    WebSocketService.disconnect();
  };

  const handleConnected = () => {
    setIsConnected(true);
    setLiveLoading(false);
  };

  const handleDisconnected = () => {
    setIsConnected(false);
  };

  const handleLiveStats = (data: LiveDashboardStats) => {
    setLiveStats(data);
    setLiveLoading(false);
  };

  const handleLiveEmployees = (data: LiveEmployee[]) => {
    setLiveEmployees(data);
  };

  const handleAttendanceEvent = (event: AttendanceEvent) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
  };

  const handleAlertCreated = (alert: WSAlert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  const handleAlertResolved = (alert: WSAlert) => {
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Dashboard</h1>
          <p className="text-gray-600">Real-time prehľad dochádzky a aktivity zamestnancov</p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Pripojené' : 'Odpojené'}
          </span>
        </div>
      </div>

      {/* Live Stats Cards */}
      <LiveStatsCards stats={liveStats} loading={liveLoading} />

      {/* Live Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Employees */}
        <LiveEmployeeList 
          employees={liveEmployees} 
          loading={liveLoading}
          onEmployeeClick={(employee) => {
            console.log('Employee clicked:', employee);
            // TODO: Open employee detail modal or navigate to employee page
          }}
        />
        
        {/* Live Activity Feed */}
        <LiveActivityFeed 
          events={recentEvents} 
          loading={liveLoading}
          maxEvents={10}
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktívne upozornenia ({alerts.length})</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.user.firstName} {alert.user.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleTimeString('sk-SK')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback Stats Grid (when WebSocket is not connected) */}
      {!isConnected && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Základné štatistiky (offline)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="Celkom zamestnancov"
              value={(stats.totalEmployees || 0).toString()}
              icon={Users}
              color="blue"
              subtitle="Aktívni používatelia"
            />
            
            <StatsCard
              title="V práci teraz"
              value={(stats.clockedInEmployees || 0).toString()}
              icon={Clock}
              color="green"
              subtitle="Pripnutí zamestnanci"
            />
            
            <StatsCard
              title="Aktívne alerty"
              value={(stats.activeAlerts || 0).toString()}
              icon={AlertTriangle}
              color="red"
              subtitle="Vyžadujú pozornosť"
            />
          </div>
        </div>
      )}
    </div>
  );
}

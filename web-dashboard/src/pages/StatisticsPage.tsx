import { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { dashboardApi } from '../lib/api';
import { useDebounce, useThrottle } from '../hooks/useDebounce';
// Chart types are now handled by ChartContainer
import { ChartContainer } from '../components/charts/ChartContainer';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle
} from 'lucide-react';

type Period = 'day' | 'week' | 'month';

interface EmployeeStatistic {
  id: string;
  name: string;
  email: string;
  workingHours: number;
  breakTime: number;
  workingDays: number;
  overtime: number;
  averageHoursPerDay: number;
  firstActivity: string | null;
  lastActivity: string | null;
  totalEvents: number;
  status: string;
}

interface StatisticsResponse {
  period: Period;
  startDate: string;
  endDate: string;
  totalEmployees: number;
  statistics: EmployeeStatistic[];
}

interface DayActivity {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    notes?: string;
    qrVerified: boolean;
  }>;
  summary: {
    clockInTime: string | null;
    clockOutTime: string | null;
    totalWorkingTime: number;
    totalBreakTime: number;
    breaks: Array<{
      type: 'BREAK' | 'PERSONAL';
      startTime: string;
      endTime: string | null;
      duration: number;
    }>;
  };
}

export function StatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [dayActivities, setDayActivities] = useState<DayActivity[]>([]);
  
  // Chart data is now handled by ChartContainer

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    try {
      // Load employee statistics
      const statsResponse = await dashboardApi.getEmployeeStatistics(
        selectedPeriod,
        selectedDate.toISOString()
      );
      
      if (statsResponse.data.success) {
        setStatistics(statsResponse.data.data);
      }

      // Load day activities if viewing a single day
      if (selectedPeriod === 'day') {
        const activitiesResponse = await dashboardApi.getDayActivities(
          selectedDate.toISOString().split('T')[0]
        );
        
        if (activitiesResponse.data.success) {
          setDayActivities(activitiesResponse.data.data.activities || []);
        }
      }
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      
      // Handle rate limiting gracefully
      if (error?.isRateLimit) {
        console.warn('Rate limit reached, using cached data or defaults');
        // Keep existing data instead of clearing it
      } else {
        // Clear data only for non-rate-limit errors
        setStatistics(null);
        setDayActivities([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedDate]);

  // Chart data loading is now handled by ChartContainer

  // Debounced loading to prevent excessive API calls
  useDebounce(loadStatistics, 500);
  
  // Throttled refresh for manual refreshes
  useThrottle(loadStatistics, 3000);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (selectedPeriod) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  const formatDateRange = () => {
    if (!statistics) return '';
    
    const start = new Date(statistics.startDate);
    const end = new Date(statistics.endDate);
    
    if (selectedPeriod === 'day') {
      return start.toLocaleDateString('sk-SK');
    } else if (selectedPeriod === 'week') {
      return `${start.toLocaleDateString('sk-SK')} - ${end.toLocaleDateString('sk-SK')}`;
    } else {
      return start.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  };

  const formatTimeFromString = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translateEventType = (type: string): string => {
    switch (type) {
      case 'CLOCK_IN': return 'Príchod';
      case 'CLOCK_OUT': return 'Odchod';
      case 'BREAK_START': return 'Začiatok obeda';
      case 'BREAK_END': return 'Koniec obeda';
      case 'PERSONAL_START': return 'Začiatok súkromných vecí';
      case 'PERSONAL_END': return 'Koniec súkromných vecí';
      default: return type;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'CLOCKED_IN': return 'bg-green-100 text-green-800';
      case 'ON_BREAK': return 'bg-yellow-100 text-yellow-800';
      case 'ON_PERSONAL': return 'bg-purple-100 text-purple-800';
      case 'CLOCKED_OUT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalHours = (stats: EmployeeStatistic[]): number => {
    return stats.reduce((total, stat) => total + stat.workingHours, 0);
  };

  const calculateAverageHours = (stats: EmployeeStatistic[]): number => {
    if (stats.length === 0) return 0;
    const total = calculateTotalHours(stats);
    return Math.round((total / stats.length) * 10) / 10;
  };

  const getFilteredEmployees = () => {
    if (!statistics) return [];
    if (selectedEmployeeId === 'all') return statistics.statistics;
    return statistics.statistics.filter(emp => emp.id === selectedEmployeeId);
  };

  const getFilteredActivities = () => {
    if (selectedEmployeeId === 'all') return dayActivities;
    return dayActivities.filter(activity => activity.user.id === selectedEmployeeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredEmployees = getFilteredEmployees();
  const filteredActivities = getFilteredActivities();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Štatistiky</h1>
          <p className="text-gray-600">Detailný prehľad dochádzky a výkonnosti zamestnancov</p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportovať
        </Button>
      </div>

      {/* Period Selector */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Obdobie</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as Period[]).map((period) => (
              <button
                key={period}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => handlePeriodChange(period)}
              >
                {period === 'day' ? 'Deň' : period === 'week' ? 'Týždeň' : 'Mesiac'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange('prev')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Predchádzajúce
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatDateRange()}
            </div>
            <div className="text-sm text-gray-600">
              {selectedPeriod === 'day' ? 'Deň' : 
               selectedPeriod === 'week' ? 'Týždeň' : 'Mesiac'}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange('next')}
            className="flex items-center gap-2"
          >
            Nasledujúce
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Charts Section */}
      <ChartContainer />

      {/* Employee Filter */}
      {statistics && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Zamestnanec</h2>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Všetci zamestnanci ({statistics.totalEmployees})</option>
              {statistics.statistics.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedEmployeeId === 'all' ? 'Celkový počet' : 'Vybraný zamestnanec'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedEmployeeId === 'all' ? statistics.totalEmployees : '1'}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Celkové hodiny</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(calculateTotalHours(filteredEmployees) * 60)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Priemerné hodiny</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateAverageHours(filteredEmployees)}h
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktívni zamestnanci</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredEmployees.filter(s => s.workingHours > 0).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Employee Statistics Cards */}
      {statistics && filteredEmployees.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedEmployeeId === 'all' 
                ? `Všetci zamestnanci (${filteredEmployees.length})` 
                : `Zamestnanec: ${filteredEmployees[0]?.name}`}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Employee Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatTime(employee.workingHours * 60)}
                    </div>
                    <div className="text-xs text-gray-600">Pracovný čas</div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatTime(employee.breakTime * 60)}
                    </div>
                    <div className="text-xs text-gray-600">Prestávky</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {employee.workingDays}
                    </div>
                    <div className="text-xs text-gray-600">
                      {employee.workingDays === 1 ? 'Pracovný deň' : 'Pracovné dni'}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {employee.averageHoursPerDay.toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-600">Priemer/deň</div>
                  </div>
                </div>

                {/* Overtime Warning */}
                {employee.overtime > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-sm font-medium text-red-700">
                        Nadčas: {formatTime(employee.overtime * 60)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Activity Times */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prvá aktivita:</span>
                    <span className="font-medium">
                      {employee.firstActivity
                        ? formatTimeFromString(employee.firstActivity)
                        : 'Žiadna'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Posledná aktivita:</span>
                    <span className="font-medium">
                      {employee.lastActivity
                        ? formatTimeFromString(employee.lastActivity)
                        : 'Žiadna'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Celkové udalosti:</span>
                    <span className="font-medium">{employee.totalEvents}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Day Activities */}
      {selectedPeriod === 'day' && filteredActivities.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Detailné aktivity - {selectedDate.toLocaleDateString('sk-SK')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredActivities.map((activity) => (
              <div key={activity.user.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {activity.user.firstName} {activity.user.lastName}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {activity.events.length} udalostí
                  </span>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Príchod</p>
                      <p className="font-medium">
                        {activity.summary.clockInTime
                          ? formatTimeFromString(activity.summary.clockInTime)
                          : 'Neprihlásený'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Odchod</p>
                      <p className="font-medium">
                        {activity.summary.clockOutTime
                          ? formatTimeFromString(activity.summary.clockOutTime)
                          : 'Stále v práci'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pracovný čas</p>
                      <p className="font-medium text-green-600">
                        {formatTime(activity.summary.totalWorkingTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Prestávky</p>
                      <p className="font-medium text-orange-600">
                        {formatTime(activity.summary.totalBreakTime)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Events Timeline */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Časová os udalostí:
                  </h4>
                  <div className="space-y-2">
                    {activity.events.map((event) => (
                      <div key={event.id} className="flex items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">
                            {translateEventType(event.type)}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {formatTimeFromString(event.timestamp)}
                          </span>
                        </div>
                        {event.notes && (
                          <span className="text-gray-500 text-xs">{event.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

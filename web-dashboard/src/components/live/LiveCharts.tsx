import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useLiveData } from '../../hooks/useLiveData';
import { 
  BarChart3, 
  TrendingUp, 
  RefreshCw, 
  Users,
  Clock,
  AlertTriangle,
  WifiOff
} from 'lucide-react';

interface LiveChartsProps {
  className?: string;
}

export const LiveCharts: React.FC<LiveChartsProps> = ({ className = '' }) => {
  const { 
    dashboardStats, 
    recentEvents, 
    activeAlerts, 
    computedStats, 
    isConnected,
    refreshData 
  } = useLiveData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '8h' | '24h'>('4h');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Generate hourly activity data based on recent events
  const generateHourlyData = () => {
    const hours = timeRange === '1h' ? 1 : timeRange === '4h' ? 4 : timeRange === '8h' ? 8 : 24;
    const now = new Date();
    const data = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const eventsInHour = recentEvents.filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= hourStart && eventTime < hourEnd;
      });

      data.push({
        hour: hourStart.getHours(),
        label: hourStart.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
        events: eventsInHour.length,
        clockIns: eventsInHour.filter(e => e.type === 'CLOCK_IN').length,
        clockOuts: eventsInHour.filter(e => e.type === 'CLOCK_OUT').length,
        breaks: eventsInHour.filter(e => e.type.includes('BREAK')).length,
      });
    }

    return data;
  };

  const hourlyData = generateHourlyData();
  const maxEvents = Math.max(...hourlyData.map(d => d.events), 1);

  // Employee status distribution
  const statusData = Object.entries(computedStats.employeesByStatus).map(([status, count]) => ({
    status: status.replace('_', ' ').toLowerCase(),
    count,
    percentage: computedStats.totalActiveEmployees > 0 
      ? (count / computedStats.totalActiveEmployees * 100).toFixed(1)
      : '0'
  }));

  // Alert severity distribution
  const alertData = Object.entries(computedStats.alertsBySeverity).map(([severity, count]) => ({
    severity: severity.toLowerCase(),
    count,
    percentage: activeAlerts.length > 0 
      ? (count / activeAlerts.length * 100).toFixed(1)
      : '0'
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Live grafy</h2>
          {!isConnected && (
            <div className="flex items-center space-x-1 text-red-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Offline</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '4h', '8h', '24h'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Obnoviť</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Activity Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Aktivita za {timeRange}</h3>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="space-y-2">
            {hourlyData.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 text-sm text-gray-600 text-right">
                  {item.label}
                </div>
                <div className="flex-1 flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(item.events / maxEvents) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {item.events > 0 && item.events}
                    </div>
                  </div>
                  <div className="w-8 text-sm text-gray-600 text-right">
                    {item.events}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Príchody</div>
                <div className="text-lg font-semibold text-green-600">
                  {hourlyData.reduce((sum, d) => sum + d.clockIns, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Odchody</div>
                <div className="text-lg font-semibold text-red-600">
                  {hourlyData.reduce((sum, d) => sum + d.clockOuts, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Prestávky</div>
                <div className="text-lg font-semibold text-yellow-600">
                  {hourlyData.reduce((sum, d) => sum + d.breaks, 0)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Employee Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Status zamestnancov</h3>
            <Users className="h-5 w-5 text-blue-600" />
          </div>

          {statusData.length > 0 ? (
            <div className="space-y-3">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status.includes('work') ? 'bg-green-500' :
                      item.status.includes('break') ? 'bg-yellow-500' :
                      item.status.includes('outside') ? 'bg-red-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.percentage}%</span>
                    <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Žiadne dáta o statusoch
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {computedStats.totalActiveEmployees}
              </div>
              <div className="text-sm text-gray-600">Celkom aktívnych</div>
            </div>
          </div>
        </Card>

        {/* Alert Severity Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rozdelenie upozornení</h3>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>

          {alertData.length > 0 ? (
            <div className="space-y-3">
              {alertData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.severity === 'critical' ? 'bg-red-500' :
                      item.severity === 'high' ? 'bg-orange-500' :
                      item.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {item.severity === 'critical' ? 'Kritické' :
                       item.severity === 'high' ? 'Vysoké' :
                       item.severity === 'medium' ? 'Stredné' :
                       'Nízke'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.percentage}%</span>
                    <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-green-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">Žiadne aktívne upozornenia</div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {computedStats.criticalAlerts}
              </div>
              <div className="text-sm text-gray-600">Kritických upozornení</div>
            </div>
          </div>
        </Card>

        {/* Real-time Stats */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Real-time štatistiky</h3>
            <Clock className="h-5 w-5 text-purple-600" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardStats?.totalHoursToday || 0}h
              </div>
              <div className="text-sm text-blue-600">Hodiny dnes</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {computedStats.averageHoursPerEmployee.toFixed(1)}h
              </div>
              <div className="text-sm text-green-600">Priemer/osoba</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {computedStats.recentActivity}
              </div>
              <div className="text-sm text-purple-600">Aktivita (5 min)</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {computedStats.employeesOutside}
              </div>
              <div className="text-sm text-yellow-600">Mimo geofence</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            Aktualizované: {new Date().toLocaleTimeString('sk-SK')}
          </div>
        </Card>
      </div>
    </div>
  );
};

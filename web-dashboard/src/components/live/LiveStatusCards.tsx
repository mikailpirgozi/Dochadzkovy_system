import React from 'react';
import { Card } from '../ui/card';
import { useLiveData } from '../../hooks/useLiveData';
import { 
  Users, 
  Coffee, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

interface LiveStatusCardsProps {
  className?: string;
}

export const LiveStatusCards: React.FC<LiveStatusCardsProps> = ({ className = '' }) => {
  const { dashboardStats, computedStats, isConnected } = useLiveData();

  if (!dashboardStats) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const StatusCard = ({ 
    title, 
    value, 
    subtitle,
    icon: Icon, 
    color = 'blue',
    trend
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
    trend?: 'up' | 'down' | 'stable';
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      red: 'text-red-600 bg-red-100',
      purple: 'text-purple-600 bg-purple-100',
      cyan: 'text-cyan-600 bg-cyan-100',
    };

    return (
      <Card className="p-6 relative">
        {!isConnected && (
          <div className="absolute top-2 right-2">
            <WifiOff className="h-4 w-4 text-red-500" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <div className={`flex items-center text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' && '↗️'}
              {trend === 'down' && '↘️'}
              {trend === 'stable' && '➡️'}
              <span className="ml-1">
                {trend === 'up' ? 'Rastúci trend' : 
                 trend === 'down' ? 'Klesajúci trend' : 
                 'Stabilný'}
              </span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className={className}>
      {/* Connection Status */}
      <div className="mb-6 flex items-center justify-center">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? 'Live pripojenie aktívne' : 'Offline režim'}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Zamestnanci v práci"
          value={dashboardStats.employeesAtWork}
          subtitle={`z ${dashboardStats.totalEmployees} celkom`}
          icon={Users}
          color="green"
        />
        
        <StatusCard
          title="Na prestávke"
          value={dashboardStats.employeesOnBreak}
          subtitle="Aktívne prestávky"
          icon={Coffee}
          color="yellow"
        />
        
        <StatusCard
          title="Hodiny dnes"
          value={`${dashboardStats.totalHoursToday}h`}
          subtitle={`Priemer: ${computedStats.averageHoursPerEmployee.toFixed(1)}h/osoba`}
          icon={Clock}
          color="blue"
        />
        
        <StatusCard
          title="Aktívne upozornenia"
          value={dashboardStats.activeAlerts}
          subtitle={`${computedStats.criticalAlerts} kritických`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <StatusCard
          title="Mimo geofence"
          value={computedStats.employeesOutside}
          subtitle="Zamestnanci mimo pracoviska"
          icon={MapPin}
          color="purple"
        />
        
        <StatusCard
          title="Nedávna aktivita"
          value={computedStats.recentActivity}
          subtitle="Posledných 5 minút"
          icon={Activity}
          color="cyan"
        />

        <StatusCard
          title="Aktívni zamestnanci"
          value={computedStats.totalActiveEmployees}
          subtitle="Online a sledovaní"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Status Breakdown */}
      {Object.keys(computedStats.employeesByStatus).length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rozdelenie podľa statusu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(computedStats.employeesByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ').toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Last Update */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center space-x-2">
          <Activity className="h-4 w-4" />
          <span>Naposledy aktualizované: {new Date().toLocaleTimeString('sk-SK')}</span>
        </div>
      </div>
    </div>
  );
};

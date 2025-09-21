import React from 'react';
import { Users, Coffee, Clock, AlertTriangle } from 'lucide-react';
import { StatsCard } from './stats-card';
import type { DashboardStats } from '../../lib/websocket';

interface LiveStatsCardsProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

export const LiveStatsCards: React.FC<LiveStatsCardsProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Zamestnanci v práci"
          value="--"
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Na prestávke"
          value="--"
          icon={Coffee}
          color="yellow"
        />
        <StatsCard
          title="Hodiny dnes"
          value="--"
          icon={Clock}
          color="blue"
          subtitle="h"
        />
        <StatsCard
          title="Aktívne upozornenia"
          value="--"
          icon={AlertTriangle}
          color="red"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Zamestnanci v práci"
        value={stats.employeesAtWork}
        icon={Users}
        color="green"
        subtitle={`z ${stats.totalEmployees}`}
      />
      <StatsCard
        title="Na prestávke"
        value={stats.employeesOnBreak}
        icon={Coffee}
        color="yellow"
      />
      <StatsCard
        title="Hodiny dnes"
        value={stats.totalHoursToday.toFixed(1)}
        icon={Clock}
        color="blue"
        subtitle="h"
      />
      <StatsCard
        title="Aktívne upozornenia"
        value={stats.activeAlerts}
        icon={AlertTriangle}
        color={stats.activeAlerts > 0 ? "red" : "green"}
      />
    </div>
  );
};

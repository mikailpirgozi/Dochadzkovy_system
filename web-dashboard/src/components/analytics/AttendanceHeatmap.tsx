import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { AdvancedAnalyticsService, type HeatmapData } from '../../lib/analytics';
import { Clock, AlertCircle } from 'lucide-react';

interface AttendanceHeatmapProps {
  className?: string;
}

export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ className = '' }) => {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();
  }, []);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const heatmapData = await AdvancedAnalyticsService.getAttendanceHeatmap();
      setData(heatmapData);
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setError('Nepodarilo sa načítať heatmap dáta');
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity: string, value: number) => {
    const opacity = Math.max(0.1, Math.min(1, value / 100));
    
    switch (intensity) {
      case 'high':
        return `rgba(239, 68, 68, ${opacity})`; // Red
      case 'medium':
        return `rgba(245, 158, 11, ${opacity})`; // Yellow
      case 'low':
        return `rgba(156, 163, 175, ${opacity})`; // Gray
      default:
        return `rgba(156, 163, 175, 0.1)`;
    }
  };

  const getDayAbbreviation = (day: string) => {
    const dayMap: Record<string, string> = {
      'Monday': 'Po',
      'Tuesday': 'Ut',
      'Wednesday': 'St',
      'Thursday': 'Št',
      'Friday': 'Pi',
      'Saturday': 'So',
      'Sunday': 'Ne',
    };
    return dayMap[day] || day.slice(0, 2);
  };

  const getHourLabel = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getPeakHours = () => {
    const hourlyTotals = hours.map(hour => ({
      hour,
      total: data
        .filter(item => item.hour === hour)
        .reduce((sum, item) => sum + item.value, 0)
    }));
    
    return hourlyTotals
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(item => getHourLabel(item.hour));
  };

  const getBusiestDay = () => {
    const dailyTotals = days.map(day => ({
      day,
      total: data
        .filter(item => item.day === day)
        .reduce((sum, item) => sum + item.value, 0)
    }));
    
    const busiest = dailyTotals.reduce((max, current) => 
      current.total > max.total ? current : max
    );
    
    return getDayAbbreviation(busiest.day);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </Card>
    );
  }

  const peakHours = getPeakHours();
  const busiestDay = getBusiestDay();

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Heatmapa aktivity</h3>
          <p className="text-sm text-gray-600">Aktivita zamestnancov podľa času a dňa</p>
        </div>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Hour labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for day labels */}
            {hours.filter((_, i) => i % 2 === 0).map(hour => (
              <div key={hour} className="w-6 text-xs text-center text-gray-500">
                {hour}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {days.map(day => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-8 text-xs text-gray-600 text-right pr-2">
                {getDayAbbreviation(day)}
              </div>
              {hours.map(hour => {
                const cellData = data.find(item => item.day === day && item.hour === hour);
                const value = cellData?.value || 0;
                const intensity = cellData?.intensity || 'low';
                
                return (
                  <div
                    key={hour}
                    className="w-3 h-3 mr-px mb-px rounded-sm cursor-pointer hover:ring-2 hover:ring-blue-300"
                    style={{ backgroundColor: getIntensityColor(intensity, value) }}
                    title={`${getDayAbbreviation(day)} ${getHourLabel(hour)}: ${value}% aktivita`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-600">Nízka</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('low', 20) }}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('medium', 50) }}></div>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('high', 80) }}></div>
          </div>
          <span className="text-xs text-gray-600">Vysoká</span>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-gray-600">
            Najrušnejší deň: <span className="font-medium">{busiestDay}</span>
          </p>
          <p className="text-xs text-gray-600">
            Peak hodiny: <span className="font-medium">{peakHours.join(', ')}</span>
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Insight:</strong> Najvyššia aktivita je počas pracovných hodín (8:00-17:00) 
          v pracovné dni. {busiestDay} je najrušnejší deň v týždni.
        </p>
        <p className="text-sm text-blue-800 mt-1">
          💡 Optimálne plánovanie meetingov: {peakHours.join(', ')}
        </p>
      </div>
    </Card>
  );
};

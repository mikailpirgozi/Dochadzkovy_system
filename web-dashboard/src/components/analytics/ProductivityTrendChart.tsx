import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card } from '../ui/card';
import { AdvancedAnalyticsService, type TimeSeriesData } from '../../lib/analytics';
import { TrendingUp, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProductivityTrendChartProps {
  period: 'week' | 'month' | 'quarter';
  className?: string;
}

export const ProductivityTrendChart: React.FC<ProductivityTrendChartProps> = ({ 
  period, 
  className = '' 
}) => {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProductivityTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        const trends = await AdvancedAnalyticsService.getProductivityTrends(period);
        setData(trends);
      } catch (err) {
        console.error('Error loading productivity trends:', err);
        setError('Nepodarilo sa načítať trendy produktivity');
      } finally {
        setLoading(false);
      }
    };

    loadProductivityTrends();
  }, [period]);

  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date);
      return period === 'week' 
        ? date.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric' })
        : period === 'month'
        ? date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })
        : date.toLocaleDateString('sk-SK', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Produktivita (%)',
        data: data.map(item => item.value),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Cieľ (75%)',
        data: data.map(() => 75),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return `Produktivita: ${context.parsed.y}%`;
            } else {
              return `Cieľ: ${context.parsed.y}%`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const getAverageProductivity = () => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length);
  };

  const getTrend = () => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-7).reduce((sum, item) => sum + item.value, 0) / Math.min(7, data.length);
    const earlier = data.slice(0, -7).reduce((sum, item) => sum + item.value, 0) / Math.max(1, data.length - 7);
    
    if (recent > earlier + 2) return 'up';
    if (recent < earlier - 2) return 'down';
    return 'stable';
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

  const trend = getTrend();
  const averageProductivity = getAverageProductivity();

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trend produktivity</h3>
          <p className="text-sm text-gray-600">
            {period === 'week' ? 'Posledný týždeň' : 
             period === 'month' ? 'Posledný mesiac' : 
             'Posledný štvrťrok'}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <TrendingUp className={`h-4 w-4 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`} />
            <span className="text-sm font-medium text-gray-600">
              Priemer: {averageProductivity}%
            </span>
          </div>
        </div>
      </div>

      <div className="h-80 mb-6">
        <Line data={chartData} options={options} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">
            {Math.max(...data.map(item => item.value))}%
          </div>
          <div className="text-xs text-gray-500">Maximum</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600">
            {averageProductivity}%
          </div>
          <div className="text-xs text-gray-500">Priemer</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-purple-600">
            {Math.min(...data.map(item => item.value))}%
          </div>
          <div className="text-xs text-gray-500">Minimum</div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Insight:</strong> {
            trend === 'up' ? 'Produktivita rastie, dobrá práca!' :
            trend === 'down' ? 'Produktivita klesá, zvážte optimalizáciu procesov.' :
            'Produktivita je stabilná, udržujte aktuálne tempo.'
          }
        </p>
        {averageProductivity >= 75 && (
          <p className="text-sm text-blue-800 mt-1">
            ✅ Dosahujete cieľovú produktivitu 75%
          </p>
        )}
        {averageProductivity < 75 && (
          <p className="text-sm text-blue-800 mt-1">
            📈 Pre dosiahnutie cieľa potrebujete zvýšiť produktivitu o {75 - averageProductivity}%
          </p>
        )}
      </div>
    </Card>
  );
};

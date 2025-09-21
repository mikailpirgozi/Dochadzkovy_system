import React from 'react';
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
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { WeeklyChartData } from '../../lib/charts';

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

interface WeeklyChartProps {
  data: WeeklyChartData;
  loading?: boolean;
  className?: string;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ 
  data, 
  loading = false, 
  className = '' 
}) => {
  if (loading || !data || !data.dailyData || !data.labels || !data.datasets) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset) => ({
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.color,
      backgroundColor: dataset.color + '20',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: dataset.color,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
    })),
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
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: `Týždenné štatistiky (${new Date(data.startDate).toLocaleDateString('sk-SK')} - ${new Date(data.endDate).toLocaleDateString('sk-SK')})`,
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 30,
        },
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
          label: function(context: TooltipItem<'line'>) {
            const value = context.parsed.y;
            return `${context.dataset.label || 'Data'}: ${value.toFixed(1)}h`;
          },
          afterBody: function(context: TooltipItem<'line'>[]) {
            if (context.length > 0 && data.dailyData && data.dailyData.length > 0) {
              const dataIndex = context[0].dataIndex;
              const dayData = data.dailyData[dataIndex];
              if (dayData) {
                return [
                  `Celkové hodiny: ${(dayData.totalHours || 0).toFixed(1)}h`,
                  `Priemerné hodiny: ${(dayData.averageHours || 0).toFixed(1)}h`,
                  `Aktívnych zamestnancov: ${dayData.activeEmployees || 0}`,
                ];
              }
            }
            return [];
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
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: string | number) {
            return value + 'h';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      line: {
        borderWidth: 3,
      },
    },
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border ${className}`}>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Weekly Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.dailyData && data.dailyData.length > 0 
              ? data.dailyData.reduce((sum, day) => sum + (day.totalHours || 0), 0).toFixed(1)
              : '0.0'
            }h
          </div>
          <div className="text-sm text-gray-500">Celkové hodiny</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.dailyData && data.dailyData.length > 0 
              ? (data.dailyData.reduce((sum, day) => sum + (day.averageHours || 0), 0) / data.dailyData.length).toFixed(1)
              : '0.0'
            }h
          </div>
          <div className="text-sm text-gray-500">Priemerné hodiny/deň</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data.dailyData && data.dailyData.length > 0 
              ? Math.max(...data.dailyData.map(day => day.activeEmployees || 0))
              : 0
            }
          </div>
          <div className="text-sm text-gray-500">Max. zamestnancov</div>
        </div>
      </div>
    </div>
  );
};
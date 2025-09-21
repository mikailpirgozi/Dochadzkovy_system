import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthlyChartData } from '../../lib/charts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyChartProps {
  data: MonthlyChartData;
  loading?: boolean;
  className?: string;
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ 
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
      backgroundColor: dataset.color + '80',
      borderColor: dataset.color,
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
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
        text: `Mesačné štatistiky (${new Date(data.startDate).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })})`,
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
          label: function(context: any) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toFixed(1)}h`;
          },
          afterBody: function(context: any) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              const dayData = data.dailyData[dataIndex];
              if (dayData) {
                return [
                  `Celkové hodiny: ${dayData.totalHours.toFixed(1)}h`,
                  `Priemerné hodiny: ${dayData.averageHours.toFixed(1)}h`,
                  `Aktívnych zamestnancov: ${dayData.activeEmployees}`,
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
          maxRotation: 45,
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
          callback: function(value: any) {
            return value + 'h';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border ${className}`}>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Monthly Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
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
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {data.dailyData && data.dailyData.length > 0 
              ? data.dailyData.filter(day => (day.activeEmployees || 0) > 0).length
              : 0
            }
          </div>
          <div className="text-sm text-gray-500">Aktívnych dní</div>
        </div>
      </div>
    </div>
  );
};
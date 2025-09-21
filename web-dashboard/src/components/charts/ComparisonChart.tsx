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
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ComparisonChartData } from '../../lib/charts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonChartProps {
  data: ComparisonChartData;
  loading?: boolean;
  className?: string;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ 
  data, 
  loading = false, 
  className = '' 
}) => {
  if (loading || !data || !data.labels || !data.datasets) {
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
        text: `Porovnanie zamestnancov (${data.period === 'week' ? 'Týždeň' : 'Mesiac'} - ${new Date(data.startDate).toLocaleDateString('sk-SK')} až ${new Date(data.endDate).toLocaleDateString('sk-SK')})`,
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
          label: function(context: TooltipItem<'bar'>) {
            const value = context.parsed.y;
            const datasetIndex = context.datasetIndex;
            const dataset = data.datasets[datasetIndex];
            return [
              `${context.dataset.label || 'Data'}: ${value.toFixed(1)}h`,
              `Priemer/deň: ${(dataset?.averageHoursPerDay || 0).toFixed(1)}h`,
              `Pracovných dní: ${dataset?.workingDays || 0}`,
            ];
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
  };

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border ${className}`}>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Comparison Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data.employeeCount || 0}
          </div>
          <div className="text-sm text-gray-500">Porovnaných zamestnancov</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.datasets && data.datasets.length > 0 
              ? (data.datasets.reduce((sum, ds) => sum + (ds.data ? ds.data.reduce((s, d) => s + (d || 0), 0) : 0), 0) / data.datasets.length).toFixed(1)
              : '0.0'
            }h
          </div>
          <div className="text-sm text-gray-500">Priemerné hodiny celkom</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data.datasets && data.datasets.length > 0 
              ? (data.datasets.reduce((sum, ds) => sum + (ds.averageHoursPerDay || 0), 0) / data.datasets.length).toFixed(1)
              : '0.0'
            }h
          </div>
          <div className="text-sm text-gray-500">Priemerné hodiny/deň</div>
        </div>
        </div>

        {/* Employee Performance Ranking */}
        {data.datasets.length > 0 && (
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Rebríček výkonnosti</h4>
            <div className="space-y-2">
              {data.datasets
                .map((dataset, index) => ({
                  ...dataset,
                  totalHours: dataset.data ? dataset.data.reduce((sum, hours) => sum + (hours || 0), 0) : 0,
                  index,
                }))
                .sort((a, b) => b.totalHours - a.totalHours)
                .slice(0, 5)
                .map((dataset, rank) => (
                  <div key={dataset.index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                        {rank + 1}
                      </div>
                      <div className="flex-shrink-0 w-4 h-4 rounded-full" style={{ backgroundColor: dataset.color }}></div>
                      <span className="font-medium text-gray-800">{dataset.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{dataset.totalHours.toFixed(1)}h</div>
                      <div className="text-sm text-gray-500">{(dataset.averageHoursPerDay || 0).toFixed(1)}h/deň</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
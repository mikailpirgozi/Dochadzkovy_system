import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card } from '../ui/card';
import { AdvancedAnalyticsService } from '../../lib/analytics';
import { DollarSign, TrendingUp, TrendingDown, Lightbulb, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CostAnalysisChartProps {
  period: 'week' | 'month' | 'quarter';
  className?: string;
}

export const CostAnalysisChart: React.FC<CostAnalysisChartProps> = ({ 
  period, 
  className = '' 
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'trend' | 'breakdown'>('trend');

  useEffect(() => {
    const loadCostAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const costData = await AdvancedAnalyticsService.getCostAnalysis(period);
      setData(costData);
    } catch (err) {
      console.error('Error loading cost analysis:', err);
      setError('Nepodarilo sa načítať analýzu nákladov');
    } finally {
      setLoading(false);
    }
    };

    loadCostAnalysis();
  }, [period]);

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

  if (error || !data) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </Card>
    );
  }

  // Trend Chart Data
  const trendChartData = {
    labels: data.totalCosts.map((item: any) => {
      const date = new Date(item.date);
      return period === 'week' 
        ? date.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric' })
        : period === 'month'
        ? date.toLocaleDateString('sk-SK', { day: 'numeric' })
        : date.toLocaleDateString('sk-SK', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Celkové náklady (€)',
        data: data.totalCosts.map((item: any) => item.value),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 4,
      }
    ],
  };

  // Breakdown Chart Data
  const breakdownChartData = {
    labels: data.costBreakdown.map((item: any) => item.category),
    datasets: [
      {
        data: data.costBreakdown.map((item: any) => item.amount),
        backgroundColor: data.costBreakdown.map((item: any) => item.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            if (viewMode === 'trend') {
              return `Náklady: €${context.parsed.y.toLocaleString()}`;
            } else {
              const total = data.costBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: €${context.parsed.toLocaleString()} (${percentage}%)`;
            }
          },
        },
      },
    },
    scales: viewMode === 'trend' ? {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: {
          callback: function(value: any) {
            return '€' + value.toLocaleString();
          },
        },
      },
    } : undefined,
  };

  const getTotalCost = () => {
    return data.costBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);
  };

  const getProjectedSavings = () => {
    return data.projections.savingsOpportunities.reduce(
      (sum: number, opportunity: any) => sum + opportunity.potentialSavings, 
      0
    );
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analýza nákladov</h3>
          <p className="text-sm text-gray-600">
            Prehľad nákladov na pracovnú silu a optimalizačné príležitosti
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('trend')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'trend'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trend
            </button>
            <button
              onClick={() => setViewMode('breakdown')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'breakdown'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rozdelenie
            </button>
          </div>
          <DollarSign className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="h-64 mb-6">
        {viewMode === 'trend' ? (
          <Bar data={trendChartData} options={chartOptions} />
        ) : (
          <Doughnut data={breakdownChartData} options={chartOptions} />
        )}
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            €{getTotalCost().toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Celkové náklady</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            €{data.projections.nextPeriod.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Projekcia</div>
          <div className="flex items-center justify-center mt-1">
            {data.projections.trend === 'increasing' ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : data.projections.trend === 'decreasing' ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4" />
            )}
            <span className={`text-xs ml-1 ${
              data.projections.trend === 'increasing' ? 'text-red-500' : 
              data.projections.trend === 'decreasing' ? 'text-green-500' : 
              'text-gray-500'
            }`}>
              {data.projections.trend === 'increasing' ? 'Rastúci' : 
               data.projections.trend === 'decreasing' ? 'Klesajúci' : 
               'Stabilný'}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            €{getProjectedSavings().toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Potenciálne úspory</div>
        </div>
      </div>

      {/* Savings Opportunities */}
      {data.projections.savingsOpportunities.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center mb-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
            <h4 className="text-md font-semibold text-gray-900">Príležitosti na úspory</h4>
          </div>
          <div className="space-y-2">
            {data.projections.savingsOpportunities.map((opportunity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    opportunity.difficulty === 'easy' ? 'bg-green-500' :
                    opportunity.difficulty === 'medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-800">
                    {opportunity.area}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    opportunity.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    opportunity.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {opportunity.difficulty === 'easy' ? 'Jednoduché' :
                     opportunity.difficulty === 'medium' ? 'Stredné' :
                     'Náročné'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    €{opportunity.potentialSavings.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">mesačne</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Breakdown Table */}
      {viewMode === 'breakdown' && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Detailné rozdelenie nákladov</h4>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategória
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suma
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Podiel
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.costBreakdown.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{item.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
};

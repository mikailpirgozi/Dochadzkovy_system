import React, { useState, useEffect } from 'react';
import { ChartsService, type WeeklyChartData, type MonthlyChartData, type ComparisonChartData } from '../../lib/charts';
import { WeeklyChart } from './WeeklyChart';
import { MonthlyChart } from './MonthlyChart';
import { ComparisonChart } from './ComparisonChart';

interface ChartContainerProps {
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ className = '' }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyChartData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [weekly, monthly, comparison] = await Promise.all([
        ChartsService.getWeeklyChartData(),
        ChartsService.getMonthlyChartData(),
        ChartsService.getComparisonChartData('week'),
      ]);

      setWeeklyData(weekly);
      setMonthlyData(monthly);
      setComparisonData(comparison);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Chyba pri načítavaní grafických dát');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, []);

  const handleRefresh = () => {
    loadChartData();
  };

  if (error) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-sm border ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chyba pri načítavaní grafov</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Skúsiť znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Grafické prehľady</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg 
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? 'Načítavam...' : 'Obnoviť'}</span>
        </button>
      </div>

      {/* Weekly Chart */}
      {weeklyData ? (
        <WeeklyChart data={weeklyData} loading={loading} />
      ) : (
        <WeeklyChart data={{} as WeeklyChartData} loading={true} />
      )}

      {/* Monthly Chart */}
      {monthlyData ? (
        <MonthlyChart data={monthlyData} loading={loading} />
      ) : (
        <MonthlyChart data={{} as MonthlyChartData} loading={true} />
      )}

      {/* Comparison Chart */}
      {comparisonData ? (
        <ComparisonChart data={comparisonData} loading={loading} />
      ) : (
        <ComparisonChart data={{} as ComparisonChartData} loading={true} />
      )}
    </div>
  );
};

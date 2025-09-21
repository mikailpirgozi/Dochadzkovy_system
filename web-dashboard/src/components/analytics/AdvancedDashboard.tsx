import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AdvancedAnalyticsService, type AdvancedAnalytics } from '../../lib/analytics';
import { ProductivityTrendChart } from './ProductivityTrendChart';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import { CostAnalysisChart } from './CostAnalysisChart';
import { DepartmentComparison } from './DepartmentComparison';
import { PredictiveInsights } from './PredictiveInsights';
import { AnomalyDetection } from './AnomalyDetection';
import { BenchmarkComparison } from './BenchmarkComparison';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Clock,
  AlertTriangle,
  Target,
  RefreshCw,
  Download
} from 'lucide-react';

interface AdvancedDashboardProps {
  className?: string;
}

export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod, selectedDepartment]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await AdvancedAnalyticsService.getAdvancedAnalytics();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAnalytics();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting analytics data...');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nepodarilo sa načítať analytics
        </h3>
        <Button onClick={loadAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Skúsiť znovu
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pokročilé Analytics</h1>
          <p className="text-gray-600 mt-1">
            Posledná aktualizácia: {lastUpdated.toLocaleString('sk-SK')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period === 'week' ? 'Týždeň' : period === 'month' ? 'Mesiac' : 'Štvrťrok'}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Všetky oddelenia</option>
            {analytics.departmentComparison.map((dept) => (
              <option key={dept.departmentId} value={dept.departmentId}>
                {dept.departmentName}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Obnoviť
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Produktivita</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.productivity.productivityScore}%
              </p>
              <div className="flex items-center mt-1">
                {getTrendIcon(analytics.productivity.productivityTrend)}
                <span className={`text-sm ml-1 ${getTrendColor(analytics.productivity.productivityTrend)}`}>
                  {analytics.productivity.productivityTrend === 'up' ? '+5%' : 
                   analytics.productivity.productivityTrend === 'down' ? '-2%' : '0%'} tento mesiac
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Priemerné hodiny/deň</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.productivity.averageHoursPerDay.toFixed(1)}h
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Efektivita: {analytics.productivity.efficiencyRating}%
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Celkové náklady</p>
              <p className="text-2xl font-bold text-gray-900">
                €{analytics.predictions.costAnalysis.totalCosts.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Nadčasy: €{analytics.predictions.costAnalysis.overtimeCosts.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Punktualita</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.attendancePatterns.punctualityScore}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Oneskorenia: {analytics.attendancePatterns.lateArrivals}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityTrendChart period={selectedPeriod} />
        <AttendanceHeatmap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostAnalysisChart period={selectedPeriod} />
        <DepartmentComparison departments={analytics.departmentComparison} />
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PredictiveInsights predictions={analytics.predictions} />
        <AnomalyDetection anomalies={analytics.anomalies} />
        <BenchmarkComparison benchmarks={analytics.benchmarks} />
      </div>
    </div>
  );
};

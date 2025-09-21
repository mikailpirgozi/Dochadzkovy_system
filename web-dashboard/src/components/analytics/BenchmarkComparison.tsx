import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Target, TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';

interface BenchmarkComparisonProps {
  benchmarks: {
    industryAverage: {
      hoursPerWeek: number;
      overtimePercentage: number;
      attendanceRate: number;
    };
    companyGoals: {
      targetHoursPerWeek: number;
      maxOvertimePercentage: number;
      minAttendanceRate: number;
    };
    performance: {
      vsIndustry: 'above' | 'below' | 'average';
      vsGoals: 'above' | 'below' | 'meeting';
      improvementAreas: string[];
    };
  };
  className?: string;
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ 
  benchmarks, 
  className = '' 
}) => {
  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case 'above': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'below': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'average': 
      case 'meeting': return <Target className="h-4 w-4 text-blue-600" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'above': return 'text-green-600 bg-green-100';
      case 'below': return 'text-red-600 bg-red-100';
      case 'average':
      case 'meeting': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceLabel = (performance: string) => {
    switch (performance) {
      case 'above': return 'Nad priemerom';
      case 'below': return 'Pod priemerom';
      case 'average': return 'Priemer';
      case 'meeting': return 'Plní ciele';
      default: return 'Neznáme';
    }
  };

  const BenchmarkItem = ({ 
    title, 
    current, 
    target, 
    industry, 
    unit = '',
    isGoodWhenHigh = true 
  }: {
    title: string;
    current: number;
    target: number;
    industry: number;
    unit?: string;
    isGoodWhenHigh?: boolean;
  }) => {
    const vsTarget = current >= target;
    const vsIndustry = isGoodWhenHigh ? current >= industry : current <= industry;
    
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-3">{title}</h5>
        
        <div className="space-y-3">
          {/* Current vs Target */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className={`h-4 w-4 mr-2 ${vsTarget ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm text-gray-600">vs Cieľ</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{current}{unit}</div>
              <div className="text-xs text-gray-500">Cieľ: {target}{unit}</div>
            </div>
          </div>

          {/* Current vs Industry */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Award className={`h-4 w-4 mr-2 ${vsIndustry ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm text-gray-600">vs Priemer</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{current}{unit}</div>
              <div className="text-xs text-gray-500">Priemer: {industry}{unit}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                vsTarget && vsIndustry ? 'bg-green-500' :
                vsTarget || vsIndustry ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ 
                width: `${Math.min(100, Math.max(10, (current / Math.max(target, industry)) * 100))}%` 
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Target className="h-6 w-6 text-blue-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Benchmark porovnanie</h3>
          <p className="text-sm text-gray-600">Výkonnosť vs priemer a ciele</p>
        </div>
      </div>

      {/* Overall Performance */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${getPerformanceColor(benchmarks.performance.vsIndustry)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">vs Priemer odvetvia</div>
              <div className="text-sm opacity-80">
                {getPerformanceLabel(benchmarks.performance.vsIndustry)}
              </div>
            </div>
            {getPerformanceIcon(benchmarks.performance.vsIndustry)}
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getPerformanceColor(benchmarks.performance.vsGoals)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">vs Firemné ciele</div>
              <div className="text-sm opacity-80">
                {getPerformanceLabel(benchmarks.performance.vsGoals)}
              </div>
            </div>
            {getPerformanceIcon(benchmarks.performance.vsGoals)}
          </div>
        </div>
      </div>

      {/* Detailed Benchmarks */}
      <div className="space-y-4 mb-6">
        <BenchmarkItem
          title="Hodiny za týždeň"
          current={40} // This should come from actual data
          target={benchmarks.companyGoals.targetHoursPerWeek}
          industry={benchmarks.industryAverage.hoursPerWeek}
          unit="h"
          isGoodWhenHigh={true}
        />

        <BenchmarkItem
          title="Percentuálny podiel nadčasov"
          current={8} // This should come from actual data
          target={benchmarks.companyGoals.maxOvertimePercentage}
          industry={benchmarks.industryAverage.overtimePercentage}
          unit="%"
          isGoodWhenHigh={false}
        />

        <BenchmarkItem
          title="Miera dochádzky"
          current={95} // This should come from actual data
          target={benchmarks.companyGoals.minAttendanceRate}
          industry={benchmarks.industryAverage.attendanceRate}
          unit="%"
          isGoodWhenHigh={true}
        />
      </div>

      {/* Improvement Areas */}
      {benchmarks.performance.improvementAreas.length > 0 && (
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <h4 className="font-semibold text-orange-800">Oblasti na zlepšenie</h4>
          </div>
          <ul className="text-sm text-orange-700 space-y-1">
            {benchmarks.performance.improvementAreas.map((area, index) => (
              <li key={index} className="flex items-center">
                <div className="w-1 h-1 bg-orange-600 rounded-full mr-2" />
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Ďalšia aktualizácia benchmarkov: Budúci týždeň
          </div>
          <Button variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Nastaviť nové ciele
          </Button>
        </div>
      </div>
    </Card>
  );
};

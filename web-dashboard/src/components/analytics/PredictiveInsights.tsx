import React from 'react';
import { Card } from '../ui/card';
import { TrendingUp, AlertTriangle, DollarSign, Sparkles } from 'lucide-react';

interface PredictiveInsightsProps {
  predictions: {
    nextWeekProjection: {
      expectedHours: number;
      likelyOvertime: number;
      riskFactors: string[];
    };
    burnoutRisk: {
      level: 'low' | 'medium' | 'high';
      affectedEmployees: number;
      recommendations: string[];
    };
    costAnalysis: {
      regularCosts: number;
      overtimeCosts: number;
      totalCosts: number;
      costPerHour: number;
      projectedMonthlyCost: number;
    };
  };
  className?: string;
}

export const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ 
  predictions, 
  className = '' 
}) => {
  const getBurnoutRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBurnoutRiskLabel = (level: string) => {
    switch (level) {
      case 'high': return 'Vysoké riziko';
      case 'medium': return 'Stredné riziko';
      case 'low': return 'Nízke riziko';
      default: return 'Neznáme';
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Sparkles className="h-6 w-6 text-purple-600 mr-3" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Prediktívne insights</h3>
          <p className="text-sm text-gray-600">AI-powered predpovede a odporúčania</p>
        </div>
      </div>

      {/* Next Week Projection */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="font-semibold text-blue-800">Projekcia nasledujúceho týždňa</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {predictions.nextWeekProjection.expectedHours}h
            </div>
            <div className="text-sm text-blue-600">Očakávané hodiny</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {predictions.nextWeekProjection.likelyOvertime}h
            </div>
            <div className="text-sm text-orange-600">Pravdepodobné nadčasy</div>
          </div>
        </div>

        {predictions.nextWeekProjection.riskFactors.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-blue-800 mb-2">Rizikové faktory:</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              {predictions.nextWeekProjection.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-blue-600 rounded-full mr-2" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Burnout Risk */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <h4 className="font-semibold text-gray-800">Riziko vyhorenia</h4>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBurnoutRiskColor(predictions.burnoutRisk.level)}`}>
            {getBurnoutRiskLabel(predictions.burnoutRisk.level)}
          </span>
        </div>

        <div className="mb-3">
          <div className="text-lg font-bold text-gray-900">
            {predictions.burnoutRisk.affectedEmployees} zamestnancov
          </div>
          <div className="text-sm text-gray-600">môže byť ovplyvnených</div>
        </div>

        {predictions.burnoutRisk.recommendations.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-800 mb-2">Odporúčania:</h5>
            <ul className="text-sm text-gray-700 space-y-1">
              {predictions.burnoutRisk.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-orange-600 rounded-full mr-2" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Cost Projection */}
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="flex items-center mb-3">
          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
          <h4 className="font-semibold text-green-800">Projekcia nákladov</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-bold text-green-600">
              €{predictions.costAnalysis.projectedMonthlyCost.toLocaleString()}
            </div>
            <div className="text-sm text-green-600">Mesačná projekcia</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              €{predictions.costAnalysis.costPerHour}
            </div>
            <div className="text-sm text-blue-600">Náklady/hodina</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Základné mzdy:</span>
            <span className="font-medium">€{predictions.costAnalysis.regularCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-orange-700">Nadčasy:</span>
            <span className="font-medium">€{predictions.costAnalysis.overtimeCosts.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

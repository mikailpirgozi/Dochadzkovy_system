import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, Clock, TrendingUp, Users, Eye } from 'lucide-react';

interface Anomaly {
  type: 'unusual_pattern' | 'performance_drop' | 'attendance_issue' | 'overtime_spike';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedEmployees: string[];
  recommendations: string[];
  detectedAt: string;
}

interface AnomalyDetectionProps {
  anomalies: Anomaly[];
  className?: string;
}

export const AnomalyDetection: React.FC<AnomalyDetectionProps> = ({ 
  anomalies, 
  className = '' 
}) => {
  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'unusual_pattern': return Clock;
      case 'performance_drop': return TrendingUp;
      case 'attendance_issue': return Users;
      case 'overtime_spike': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  const getAnomalyColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Vysoká';
      case 'medium': return 'Stredná';
      case 'low': return 'Nízka';
      default: return 'Neznáma';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'unusual_pattern': return 'Neobvyklý vzorec';
      case 'performance_drop': return 'Pokles výkonu';
      case 'attendance_issue': return 'Problém s dochádzkou';
      case 'overtime_spike': return 'Nárast nadčasov';
      default: return type;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('sk-SK');
  };

  if (anomalies.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center mb-4">
          <Eye className="h-6 w-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Detekcia anomálií</h3>
            <p className="text-sm text-gray-600">AI monitoring neobvyklých vzorcov</p>
          </div>
        </div>

        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-green-600" />
          </div>
          <h4 className="text-lg font-medium text-green-800 mb-2">Žiadne anomálie</h4>
          <p className="text-green-600">
            Všetky vzorce vyzerajú normálne. Systém nedetekoval žiadne neobvyklé aktivity.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Detekcia anomálií</h3>
          <p className="text-sm text-gray-600">AI monitoring neobvyklých vzorcov</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 font-medium">
            {anomalies.length} {anomalies.length === 1 ? 'anomália' : 'anomálií'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {anomalies.map((anomaly, index) => {
          const IconComponent = getAnomalyIcon(anomaly.type);
          const colorClasses = getAnomalyColor(anomaly.severity);
          
          return (
            <div key={index} className={`border rounded-lg p-4 ${colorClasses}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <IconComponent className="h-5 w-5 mr-3" />
                  <div>
                    <h4 className="font-semibold">{getTypeLabel(anomaly.type)}</h4>
                    <p className="text-sm opacity-80">
                      Závažnosť: {getSeverityLabel(anomaly.severity)}
                    </p>
                  </div>
                </div>
                <div className="text-xs opacity-70">
                  {formatTime(anomaly.detectedAt)}
                </div>
              </div>

              <p className="text-sm mb-3 opacity-90">
                {anomaly.description}
              </p>

              {anomaly.affectedEmployees.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium mb-1">Ovplyvnení zamestnanci:</h5>
                  <div className="flex flex-wrap gap-1">
                    {anomaly.affectedEmployees.map((employee, empIndex) => (
                      <span key={empIndex} className="inline-block px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                        {employee}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {anomaly.recommendations.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Odporúčania:</h5>
                  <ul className="text-sm space-y-1">
                    {anomaly.recommendations.map((recommendation, recIndex) => (
                      <li key={recIndex} className="flex items-start">
                        <div className="w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0" />
                        <span className="opacity-90">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-red-600">
              {anomalies.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-xs text-gray-600">Vysoká závažnosť</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {anomalies.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-xs text-gray-600">Stredná závažnosť</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {anomalies.filter(a => a.severity === 'low').length}
            </div>
            <div className="text-xs text-gray-600">Nízka závažnosť</div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4">
        <Button variant="outline" className="w-full" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Zobraziť detailnú analýzu
        </Button>
      </div>
    </Card>
  );
};

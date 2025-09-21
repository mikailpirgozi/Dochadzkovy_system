import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useLiveData } from '../../hooks/useLiveData';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  MapPin, 
  Clock, 
  Coffee,
  ZapOff,
  AlarmClock,
  LogOut,
  ChevronDown,
  ChevronUp,
  WifiOff
} from 'lucide-react';

interface LiveAlertsProps {
  maxItems?: number;
  showHeader?: boolean;
  onAlertResolve?: (alertId: string) => void;
  className?: string;
}

export const LiveAlerts: React.FC<LiveAlertsProps> = ({ 
  maxItems = 20,
  showHeader = true,
  onAlertResolve,
  className = ''
}) => {
  const { activeAlerts, computedStats, isConnected } = useLiveData();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getSeverityConfig = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          icon: AlertCircle,
          label: 'Kritické'
        };
      case 'HIGH':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
          icon: AlertTriangle,
          label: 'Vysoké'
        };
      case 'MEDIUM':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: Info,
          label: 'Stredné'
        };
      case 'LOW':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          label: 'Nízke'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          icon: Info,
          label: 'Neznáme'
        };
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'GEOFENCE_VIOLATION':
        return MapPin;
      case 'OVERTIME_WARNING':
        return Clock;
      case 'BREAK_OVERRUN':
        return Coffee;
      case 'LOCATION_DISABLED':
        return ZapOff;
      case 'LATE_ARRIVAL':
        return AlarmClock;
      case 'EARLY_DEPARTURE':
        return LogOut;
      default:
        return AlertTriangle;
    }
  };

  const translateAlertType = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'GEOFENCE_VIOLATION':
        return 'Porušenie geofence';
      case 'OVERTIME_WARNING':
        return 'Nadčasové upozornenie';
      case 'BREAK_OVERRUN':
        return 'Predĺžená prestávka';
      case 'LOCATION_DISABLED':
        return 'Vypnutá poloha';
      case 'LATE_ARRIVAL':
        return 'Meškanie';
      case 'EARLY_DEPARTURE':
        return 'Predčasný odchod';
      default:
        return type;
    }
  };

  const formatTime = (timestamp: string): { relative: string; absolute: string } => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    let relative: string;
    if (diffMins < 1) {
      relative = 'Práve teraz';
    } else if (diffMins < 60) {
      relative = `Pred ${diffMins} min`;
    } else if (diffHours < 24) {
      relative = `Pred ${diffHours}h`;
    } else {
      relative = date.toLocaleDateString('sk-SK', { 
        month: 'short', 
        day: 'numeric'
      });
    }

    const absolute = date.toLocaleString('sk-SK');

    return { relative, absolute };
  };

  const handleAlertClick = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  const handleResolveAlert = (alertId: string) => {
    if (onAlertResolve) {
      onAlertResolve(alertId);
    } else {
      // TODO: Implement default alert resolution
      console.log('Resolving alert:', alertId);
    }
  };

  const displayAlerts = activeAlerts.slice(0, maxItems);

  return (
    <Card className={className}>
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Aktívne upozornenia</h2>
            {!isConnected && (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Offline</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>{computedStats.criticalAlerts}</span>
                <span>Kritické</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Žiadne aktívne upozornenia
            </h3>
            <p className="text-gray-500">
              Všetko v poriadku! Upozornenia sa zobrazia automaticky.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayAlerts.map((alert) => {
              const severityConfig = getSeverityConfig(alert.severity);
              const AlertTypeIcon = getAlertTypeIcon(alert.type);
              const SeverityIcon = severityConfig.icon;
              const timeInfo = formatTime(alert.timestamp);
              const isExpanded = expandedAlert === alert.id;
              
              return (
                <div 
                  key={alert.id}
                  className={`border-l-4 ${severityConfig.borderColor} bg-white border border-gray-200 rounded-lg shadow-sm`}
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleAlertClick(alert.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 ${severityConfig.color}`}>
                          <AlertTypeIcon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {translateAlertType(alert.type)}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}>
                              <SeverityIcon className="h-3 w-3 mr-1" />
                              {severityConfig.label}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {alert.userName}
                          </p>
                          
                          <p className="text-sm text-gray-800 mb-2" title={timeInfo.absolute}>
                            {alert.message}
                          </p>
                          
                          <p className="text-xs text-gray-500">
                            {timeInfo.relative}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveAlert(alert.id);
                          }}
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Vyriešiť
                        </Button>
                        
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">ID upozornenia:</span>
                          <p className="text-gray-600 font-mono text-xs">{alert.id}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Typ:</span>
                          <p className="text-gray-600">{alert.type}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Používateľ:</span>
                          <p className="text-gray-600">{alert.userName}</p>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Čas vzniku:</span>
                          <p className="text-gray-600">{timeInfo.absolute}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <span className="font-medium text-gray-700 block mb-2">Úplná správa:</span>
                        <p className="text-gray-800 bg-white p-3 rounded border">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {displayAlerts.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span>Zobrazených {displayAlerts.length} z {activeAlerts.length} upozornení</span>
              {activeAlerts.length > maxItems && (
                <Button variant="outline" size="sm">
                  Zobraziť všetky upozornenia
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useLiveData } from '../../hooks/useLiveData';
import { 
  Activity, 
  LogIn, 
  LogOut, 
  Coffee, 
  Play, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Clock,
  WifiOff
} from 'lucide-react';

interface LiveActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ 
  maxItems = 50,
  showHeader = true,
  className = ''
}) => {
  const { recentEvents, isConnected, refreshData } = useLiveData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return LogIn;
      case 'CLOCK_OUT':
        return LogOut;
      case 'BREAK_START':
        return Coffee;
      case 'BREAK_END':
        return Play;
      case 'LOCATION_UPDATE':
        return MapPin;
      case 'GEOFENCE_ENTER':
        return CheckCircle;
      case 'GEOFENCE_EXIT':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getEventColor = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return 'text-green-600';
      case 'CLOCK_OUT':
        return 'text-red-600';
      case 'BREAK_START':
        return 'text-yellow-600';
      case 'BREAK_END':
        return 'text-blue-600';
      case 'LOCATION_UPDATE':
        return 'text-purple-600';
      case 'GEOFENCE_ENTER':
        return 'text-green-600';
      case 'GEOFENCE_EXIT':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const translateEventType = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return 'Príchod do práce';
      case 'CLOCK_OUT':
        return 'Odchod z práce';
      case 'BREAK_START':
        return 'Začiatok prestávky';
      case 'BREAK_END':
        return 'Koniec prestávky';
      case 'LOCATION_UPDATE':
        return 'Aktualizácia polohy';
      case 'GEOFENCE_ENTER':
        return 'Vstup do pracoviska';
      case 'GEOFENCE_EXIT':
        return 'Opustenie pracoviska';
      default:
        return eventType;
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

  const displayEvents = recentEvents.slice(0, maxItems);

  return (
    <Card className={`${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Live aktivita</h2>
            {!isConnected && (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Offline</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Obnoviť</span>
          </Button>
        </div>
      )}

      <div className="p-6">
        {displayEvents.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Žiadne nedávne aktivity
            </h3>
            <p className="text-gray-500">
              {isConnected 
                ? 'Aktivity sa zobrazia v reálnom čase' 
                : 'Pripojte sa pre live aktualizácie'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayEvents.map((event, index) => {
              const IconComponent = getEventIcon(event.type);
              const timeInfo = formatTime(event.timestamp);
              
              return (
                <div 
                  key={`${event.timestamp}-${event.userId}-${index}`}
                  className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`flex-shrink-0 ${getEventColor(event.type)}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {event.userName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {translateEventType(event.type)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500" title={timeInfo.absolute}>
                          {timeInfo.relative}
                        </p>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.type === 'CLOCK_IN' ? 'bg-green-100 text-green-800' :
                          event.type === 'CLOCK_OUT' ? 'bg-red-100 text-red-800' :
                          event.type === 'BREAK_START' ? 'bg-yellow-100 text-yellow-800' :
                          event.type === 'BREAK_END' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    
                    {event.location && (
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>
                          {event.location.latitude.toFixed(6)}, {event.location.longitude.toFixed(6)}
                          {event.location.accuracy && (
                            <span className="ml-1">(±{Math.round(event.location.accuracy)}m)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {displayEvents.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            Zobrazených {displayEvents.length} z {recentEvents.length} aktivít
            {recentEvents.length > maxItems && (
              <div className="mt-2">
                <Button variant="outline" size="sm">
                  Zobraziť viac aktivít
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

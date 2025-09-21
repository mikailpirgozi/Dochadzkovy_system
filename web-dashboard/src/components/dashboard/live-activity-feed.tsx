import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Clock } from 'lucide-react';
import type { AttendanceEvent } from '../../lib/websocket';

interface LiveActivityFeedProps {
  events: AttendanceEvent[];
  loading?: boolean;
  maxEvents?: number;
}

const getEventTypeColor = (type: string): string => {
  switch (type) {
    case 'CLOCK_IN':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CLOCK_OUT':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'BREAK_START':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'BREAK_END':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PERSONAL_START':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'PERSONAL_END':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getEventTypeText = (type: string): string => {
  switch (type) {
    case 'CLOCK_IN':
      return 'Príchod';
    case 'CLOCK_OUT':
      return 'Odchod';
    case 'BREAK_START':
      return 'Začiatok prestávky';
    case 'BREAK_END':
      return 'Koniec prestávky';
    case 'PERSONAL_START':
      return 'Začiatok osobného voľna';
    case 'PERSONAL_END':
      return 'Koniec osobného voľna';
    default:
      return type;
  }
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) {
    return 'Práve teraz';
  } else if (diffMins < 60) {
    return `Pred ${diffMins} min`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `Pred ${hours}h`;
  } else {
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ 
  events, 
  loading = false,
  maxEvents = 10
}) => {
  const displayEvents = events.slice(0, maxEvents);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Posledné aktivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Posledné aktivity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayEvents.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Žiadne posledné aktivity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayEvents.map((event, index) => (
              <div
                key={`${event.userId}-${event.timestamp}-${index}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.userName}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={getEventTypeColor(event.type)} 
                        variant="outline"
                      >
                        {getEventTypeText(event.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatTime(event.timestamp)}</span>
                </div>
              </div>
            ))}
            
            {events.length > maxEvents && (
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500">
                  a ďalších {events.length - maxEvents} aktivít...
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

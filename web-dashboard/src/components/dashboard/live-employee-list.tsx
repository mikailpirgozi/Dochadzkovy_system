import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, MapPin, User } from 'lucide-react';
import type { LiveEmployee } from '../../lib/websocket';

interface LiveEmployeeListProps {
  employees: LiveEmployee[];
  loading?: boolean;
  onEmployeeClick?: (employee: LiveEmployee) => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'CLOCKED_IN':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ON_BREAK':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ON_PERSONAL':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'BUSINESS_TRIP':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'CLOCKED_IN':
      return 'V práci';
    case 'ON_BREAK':
      return 'Na prestávke';
    case 'ON_PERSONAL':
      return 'Osobné voľno';
    case 'BUSINESS_TRIP':
      return 'Služobná cesta';
    default:
      return 'Offline';
  }
};

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const LiveEmployeeList: React.FC<LiveEmployeeListProps> = ({ 
  employees, 
  loading = false, 
  onEmployeeClick 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Aktívni zamestnanci
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-16"></div>
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
          <User className="h-5 w-5 mr-2" />
          Aktívni zamestnanci ({employees.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Žiadni aktívni zamestnanci</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`p-4 border border-gray-200 rounded-lg transition-colors ${
                  onEmployeeClick ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
                onClick={() => onEmployeeClick?.(employee)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {employee.name}
                      </h4>
                      <Badge className={getStatusColor(employee.status)} variant="outline">
                        {getStatusText(employee.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      {employee.clockInTime && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Príchod: {formatTime(employee.clockInTime)}</span>
                        </div>
                      )}
                      
                      {employee.lastLocation && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            Poloha: {formatTime(employee.lastLocation.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {employee.email}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {employee.totalHoursToday.toFixed(1)}h dnes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

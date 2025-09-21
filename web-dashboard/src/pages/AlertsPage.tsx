import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { getAlertTypeColor, getAlertTypeText, getAuthData } from '../lib/utils';
import { dashboardApi } from '../lib/api';

interface Alert {
  id: string;
  type: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
  isResolved: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const authData = getAuthData();
    if (authData) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await dashboardApi.getActiveAlerts();
      
      if (response.data.success && Array.isArray(response.data.data)) {
        // Map backend response to frontend interface
        const mappedAlerts = response.data.data.map((alert: Record<string, unknown>) => ({
          id: alert.id,
          type: alert.type,
          message: alert.message,
          userId: alert.userId,
          userName: (() => {
            if (alert.user && typeof alert.user === 'object' && 'firstName' in alert.user && 'lastName' in alert.user) {
              const user = alert.user as { firstName: string; lastName: string };
              const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
              return fullName || 'Neznámy používateľ';
            }
            return 'Neznámy používateľ';
          })(),
          timestamp: alert.createdAt,
          isResolved: alert.isResolved,
          severity: alert.severity ?? 'MEDIUM'
        }));
        setAlerts(mappedAlerts);
      } else {
        // No alerts or empty response
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Set empty array on error
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await dashboardApi.resolveAlert(alertId);
      
      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, isResolved: true } : alert
      ));
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Chyba pri riešení alertu');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !alert.isResolved;
    if (filter === 'resolved') return alert.isResolved;
    return alert.severity === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alerty</h1>
        <p className="text-gray-600">Sledovanie a riešenie upozornení systému</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Aktívne</p>
              <p className="text-lg font-semibold text-gray-900">
                {alerts.filter(a => !a.isResolved).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vyriešené</p>
              <p className="text-lg font-semibold text-gray-900">
                {alerts.filter(a => a.isResolved).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vysoká priorita</p>
              <p className="text-lg font-semibold text-gray-900">
                {alerts.filter(a => a.severity === 'HIGH' && !a.isResolved).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Dnes</p>
              <p className="text-lg font-semibold text-gray-900">
                {alerts.filter(a => 
                  new Date(a.timestamp).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Všetky alerty</option>
            <option value="unresolved">Nevyriešené</option>
            <option value="resolved">Vyriešené</option>
            <option value="HIGH">Vysoká priorita</option>
            <option value="MEDIUM">Stredná priorita</option>
            <option value="LOW">Nízka priorita</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Zoznam alertov ({filteredAlerts.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredAlerts.map((alert) => (
            <div key={alert.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {alert.isResolved ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAlertTypeColor(alert.type)}`}>
                        {getAlertTypeText(alert.type)}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <div className="mt-1 text-sm text-gray-500">
                      <span>{alert.userName}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(alert.timestamp).toLocaleString('sk-SK')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!alert.isResolved && (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Vyriešiť
                    </button>
                  )}
                  <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Detail
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredAlerts.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadne alerty</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? 'Momentálne nie sú žiadne alerty.'
                  : 'Žiadne alerty nevyhovujú filtru.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

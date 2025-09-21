import { useState, useEffect } from 'react';
import { MapPin, Users, Clock, AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../lib/api';

interface LiveEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  lastSeen: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export function LiveMapPage() {
  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [stats, setStats] = useState({
    online: 0,
    inGeofence: 0,
    onBreak: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveData();
  }, []);

  const fetchLiveData = async () => {
    try {
      // Fetch employees and their live locations
      const [employeesResponse, statsResponse] = await Promise.all([
        dashboardApi.getEmployees(),
        dashboardApi.getStats()
      ]);

      if (employeesResponse.data.success && employeesResponse.data.data) {
        const mappedEmployees = employeesResponse.data.data.users.map((user: Record<string, unknown>) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          status: user.isActive ? 'V práci' : 'Offline',
          lastSeen: user.updatedAt,
          location: null // Will be populated from location API
        }));
        setEmployees(mappedEmployees);
      }

      if (statsResponse.data.success && statsResponse.data.data) {
        setStats({
          online: statsResponse.data.data.employeesAtWork || 0,
          inGeofence: statsResponse.data.data.employeesAtWork || 0,
          onBreak: statsResponse.data.data.employeesOnBreak || 0,
          alerts: statsResponse.data.data.activeAlerts || 0
        });
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Mapa</h1>
        <p className="text-gray-600">Sledovanie pozícií zamestnancov v reálnom čase</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Online</p>
              <p className="text-lg font-semibold text-gray-900">{stats.online}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">V geofence</p>
              <p className="text-lg font-semibold text-gray-900">{stats.inGeofence}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Na obede</p>
              <p className="text-lg font-semibold text-gray-900">{stats.onBreak}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Alerty</p>
              <p className="text-lg font-semibold text-gray-900">{stats.alerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mapa pozícií</h2>
        </div>
        
        <div className="p-6">
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Mapa sa načítava</h3>
              <p className="text-gray-500">
                Integrácia s Google Maps/OpenStreetMap bude implementovaná v ďalšej fáze
              </p>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>• GPS pozície zamestnancov</p>
                <p>• Geofence hranice</p>
                <p>• Historické trasy</p>
                <p>• Real-time aktualizácie</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Zamestnanci online</h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Žiadni zamestnanci online</p>
                </div>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        employee.status === 'V práci' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Users className={`h-5 w-5 ${
                          employee.status === 'V práci' ? 'text-green-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        employee.status === 'V práci' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {employee.status}
                      </div>
                      <div className="text-sm text-gray-500">
                        Posledná aktualizácia: {new Date(employee.lastSeen).toLocaleString('sk-SK')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

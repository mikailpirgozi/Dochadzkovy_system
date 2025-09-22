import { useState, useEffect } from 'react';
import { Settings, Save, MapPin, Bell, Loader2 } from 'lucide-react';
import { dashboardApi } from '../lib/api';

export function SettingsPage() {
  const [settings, setSettings] = useState({
    workingHours: {
      start: '08:00',
      end: '17:00'
    },
    breakSettings: {
      maxBreakDuration: 60, // minutes
      requireBreakApproval: false
    },
    geofenceSettings: {
      alertAfterMinutes: 5,
      strictMode: true
    },
    notifications: {
      emailAlerts: true,
      pushNotifications: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardApi.getCompanySettings();
        if (response.success && response.data) {
          setSettings(response.data);
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        setError('Nepodarilo sa načítať nastavenia');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      console.log('Saving settings:', settings);
      
      const response = await dashboardApi.updateCompanySettings(settings);
      
      if (response.success) {
        setSuccessMessage('Nastavenia boli úspešne uložené');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.message || 'Nepodarilo sa uložiť nastavenia');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Nepodarilo sa uložiť nastavenia');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (path: string, value: unknown) => {
    const keys = path.split('.');
    const newSettings = { ...settings };
    let current = newSettings as Record<string, unknown>;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Načítavam nastavenia...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nastavenia</h1>
          <p className="text-gray-600">Konfigurácia systému a firemných pravidiel</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ukladám...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Uložiť zmeny
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Chyba</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Úspech</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Pracovný čas</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Začiatok pracovného času
              </label>
              <input
                type="time"
                value={settings.workingHours.start}
                onChange={(e) => updateSetting('workingHours.start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koniec pracovného času
              </label>
              <input
                type="time"
                value={settings.workingHours.end}
                onChange={(e) => updateSetting('workingHours.end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Break Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Nastavenia prestávok</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximálna dĺžka prestávky (minúty)
              </label>
              <input
                type="number"
                min="15"
                max="240"
                value={settings.breakSettings.maxBreakDuration}
                onChange={(e) => updateSetting('breakSettings.maxBreakDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.breakSettings.requireBreakApproval}
                  onChange={(e) => updateSetting('breakSettings.requireBreakApproval', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Vyžadovať schválenie prestávky</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Geofence nastavenia</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upozorniť po opustení (minúty)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.geofenceSettings.alertAfterMinutes}
                onChange={(e) => updateSetting('geofenceSettings.alertAfterMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.geofenceSettings.strictMode}
                  onChange={(e) => updateSetting('geofenceSettings.strictMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Prísny režim</span>
              </label>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Prísny režim:</strong> Zamedzuje pipnutie mimo definovanej oblasti<br />
              <strong>Alert po:</strong> {settings.geofenceSettings.alertAfterMinutes} minútach mimo pracoviska
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notifikácie</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.emailAlerts}
                onChange={(e) => updateSetting('notifications.emailAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Email alerty</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.pushNotifications}
                onChange={(e) => updateSetting('notifications.pushNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Push notifikácie</span>
            </label>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Email alerty:</strong> Zasielanie upozornení na email adresu správcu<br />
              <strong>Push notifikácie:</strong> Okamžité upozornenia v mobilnej aplikácii
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

import { useState } from 'react';
import { Settings, Save, MapPin, Bell, Shield } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState({
    // Company settings
    companyName: 'Test Firma',
    workingHours: {
      start: '08:00',
      end: '17:00',
      lunchBreak: 60
    },
    
    // Geofence settings
    geofence: {
      latitude: 48.1486,
      longitude: 17.1077,
      radius: 100
    },
    
    // Notification settings
    notifications: {
      emailAlerts: true,
      pushNotifications: true,
      smsAlerts: false,
      alertTypes: {
        leftGeofence: true,
        longBreak: true,
        missingClockOut: true,
        businessTripRequest: true
      }
    },
    
    // Security settings
    security: {
      requireGPS: true,
      requireQRCode: true,
      allowManualCorrections: true,
      autoClockOut: true,
      autoClockOutHours: 12
    }
  });

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // TODO: Implement settings save
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
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Uložiť zmeny
        </button>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Firemné nastavenia</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Názov firmy
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => updateSetting('companyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Obedná prestávka (minúty)
              </label>
              <input
                type="number"
                value={settings.workingHours.lunchBreak}
                onChange={(e) => updateSetting('workingHours.lunchBreak', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zemepisná šírka
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.geofence.latitude}
                onChange={(e) => updateSetting('geofence.latitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zemepisná dĺžka
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.geofence.longitude}
                onChange={(e) => updateSetting('geofence.longitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Polomer (metre)
              </label>
              <input
                type="number"
                value={settings.geofence.radius}
                onChange={(e) => updateSetting('geofence.radius', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Aktuálna pozícia:</strong> Bratislava, Slovensko<br />
              <strong>Polomer:</strong> {settings.geofence.radius}m od stredu pracoviska
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.smsAlerts}
                onChange={(e) => updateSetting('notifications.smsAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">SMS alerty</span>
            </label>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Typy alertov</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.alertTypes.leftGeofence}
                  onChange={(e) => updateSetting('notifications.alertTypes.leftGeofence', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Opustenie pracoviska</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.alertTypes.longBreak}
                  onChange={(e) => updateSetting('notifications.alertTypes.longBreak', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Dlhá prestávka</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.alertTypes.missingClockOut}
                  onChange={(e) => updateSetting('notifications.alertTypes.missingClockOut', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Chýbajúce odpipnutie</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.alertTypes.businessTripRequest}
                  onChange={(e) => updateSetting('notifications.alertTypes.businessTripRequest', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Žiadosti o služobné cesty</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Bezpečnosť</h2>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security.requireGPS}
                onChange={(e) => updateSetting('security.requireGPS', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Vyžadovať GPS</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security.requireQRCode}
                onChange={(e) => updateSetting('security.requireQRCode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Vyžadovať QR kód</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security.allowManualCorrections}
                onChange={(e) => updateSetting('security.allowManualCorrections', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Povoliť manuálne opravy</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security.autoClockOut}
                onChange={(e) => updateSetting('security.autoClockOut', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Automatické odpipnutie</span>
            </label>
          </div>
          
          {settings.security.autoClockOut && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Automatické odpipnutie po (hodiny)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.security.autoClockOutHours}
                onChange={(e) => updateSetting('security.autoClockOutHours', parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

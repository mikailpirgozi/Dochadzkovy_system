import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon, type LatLngExpression, type LatLngBoundsExpression } from 'leaflet';
import type { Employee, Company } from '@/lib/types';
import { formatTime, getStatusText, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveMapProps {
  employees: Employee[];
  company: Company;
}

// Custom marker icons for different statuses
const createCustomIcon = (_status: string, color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const getMarkerIcon = (status: string) => {
  switch (status) {
    case 'CLOCKED_IN':
      return createCustomIcon(status, '#10b981'); // green
    case 'ON_BREAK':
      return createCustomIcon(status, '#f59e0b'); // yellow
    case 'ON_PERSONAL':
      return createCustomIcon(status, '#f97316'); // orange
    case 'BUSINESS_TRIP':
      return createCustomIcon(status, '#3b82f6'); // blue
    default:
      return createCustomIcon(status, '#6b7280'); // gray
  }
};

export function LiveMap({ employees, company }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Filter employees with location data
  const employeesWithLocation = employees.filter(emp => 
    emp.lastLocation && 
    emp.lastLocation.latitude && 
    emp.lastLocation.longitude
  );

  // Calculate center and radius - use default values if geofence doesn't exist
  const latitude = company.geofence?.latitude ?? 0;
  const longitude = company.geofence?.longitude ?? 0;
  const radius = company.geofence?.radius ?? 100;
  
  const center: LatLngExpression = useMemo(() => [latitude, longitude], [latitude, longitude]);

  // Auto-fit map to show all employees
  useEffect(() => {
    if (mapRef.current && employeesWithLocation.length > 0) {
      const map = mapRef.current;
      const bounds = employeesWithLocation.map(emp => [
        emp.lastLocation!.latitude,
        emp.lastLocation!.longitude
      ] as LatLngExpression);
      
      // Include company center in bounds
      bounds.push(center);
      
      map.fitBounds(bounds as LatLngBoundsExpression, { padding: [20, 20] });
    }
  }, [employeesWithLocation, center]);

  if (!company.geofence) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Geofence nie je nastavený pre túto firmu</p>
      </div>
    );
  }

  return (
    <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Company geofence */}
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
          }}
        />
        
        {/* Company center marker */}
        <Marker position={center}>
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-gray-900">{company.name}</h3>
              <p className="text-sm text-gray-600">Pracovisko</p>
              <p className="text-xs text-gray-500">
                Radius: {radius}m
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Employee markers */}
        {employeesWithLocation.map((employee) => (
          <Marker
            key={employee.id}
            position={[
              employee.lastLocation!.latitude,
              employee.lastLocation!.longitude
            ]}
            icon={getMarkerIcon(employee.status)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {employee.name}
                  </h3>
                  <Badge className={getStatusColor(employee.status)}>
                    {getStatusText(employee.status)}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Email: {employee.email}</p>
                  
                  {employee.clockInTime && (
                    <p>Príchod: {formatTime(employee.clockInTime)}</p>
                  )}
                  
                  <p>Odpracované: {employee.totalHoursToday}h</p>
                  
                  {employee.lastLocation && (
                    <>
                      <p>Posledná aktualizácia: {formatTime(employee.lastLocation.timestamp)}</p>
                      <p>Presnosť GPS: ±{Math.round(employee.lastLocation.accuracy)}m</p>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

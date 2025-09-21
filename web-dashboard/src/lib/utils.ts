import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from "date-fns";
import { sk } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export const formatDate = (date: string | Date, formatStr: string = "dd.MM.yyyy") => {
  return format(new Date(date), formatStr, { locale: sk });
};

export const formatTime = (date: string | Date) => {
  return format(new Date(date), "HH:mm", { locale: sk });
};

export const formatDateTime = (date: string | Date) => {
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: sk });
};

export const formatRelativeTime = (date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sk });
};

// Working hours calculations
export const calculateWorkingHours = (clockIn: string, clockOut?: string): number => {
  const startTime = new Date(clockIn);
  const endTime = clockOut ? new Date(clockOut) : new Date();
  
  return differenceInHours(endTime, startTime);
};

export const calculateWorkingMinutes = (clockIn: string, clockOut?: string): number => {
  const startTime = new Date(clockIn);
  const endTime = clockOut ? new Date(clockOut) : new Date();
  
  return differenceInMinutes(endTime, startTime);
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}min`;
  }
  
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

// GPS utilities
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const isWithinGeofence = (
  userLat: number,
  userLon: number,
  geofenceLat: number,
  geofenceLon: number,
  radius: number
): boolean => {
  const distance = calculateDistance(userLat, userLon, geofenceLat, geofenceLon);
  return distance <= radius;
};

// Status utilities
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'CLOCKED_IN':
      return 'text-green-600 bg-green-100';
    case 'CLOCKED_OUT':
      return 'text-gray-600 bg-gray-100';
    case 'ON_BREAK':
      return 'text-yellow-600 bg-yellow-100';
    case 'ON_PERSONAL':
      return 'text-orange-600 bg-orange-100';
    case 'BUSINESS_TRIP':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'CLOCKED_IN':
      return 'V práci';
    case 'CLOCKED_OUT':
      return 'Mimo práce';
    case 'ON_BREAK':
      return 'Na obede';
    case 'ON_PERSONAL':
      return 'Súkromné veci';
    case 'BUSINESS_TRIP':
      return 'Služobná cesta';
    default:
      return 'Neznámy';
  }
};

export const getAlertTypeColor = (type: string): string => {
  switch (type) {
    case 'LEFT_GEOFENCE':
      return 'text-red-600 bg-red-100';
    case 'LONG_BREAK':
      return 'text-orange-600 bg-orange-100';
    case 'MISSING_CLOCK_OUT':
      return 'text-yellow-600 bg-yellow-100';
    case 'GPS_DISABLED':
      return 'text-purple-600 bg-purple-100';
    case 'BUSINESS_TRIP_REQUEST':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getAlertTypeText = (type: string): string => {
  switch (type) {
    case 'LEFT_GEOFENCE':
      return 'Opustil pracovisko';
    case 'LONG_BREAK':
      return 'Dlhý obed';
    case 'MISSING_CLOCK_OUT':
      return 'Chýba odpipnutie';
    case 'GPS_DISABLED':
      return 'GPS vypnuté';
    case 'BUSINESS_TRIP_REQUEST':
      return 'Žiadosť o služobnú cestu';
    default:
      return 'Neznámy alert';
  }
};

// File download utilities
export const downloadFile = (blob: Blob, filename: string, mimeType: string) => {
  const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Local storage utilities
export const getAuthData = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  const companySlug = localStorage.getItem('company_slug');
  
  if (!token || !userData || !companySlug) return null;
  
  try {
    return {
      token,
      user: JSON.parse(userData),
      companySlug
    };
  } catch {
    return null;
  }
};

export const setAuthData = (token: string, user: Record<string, unknown>, companySlug: string) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_data', JSON.stringify(user));
  localStorage.setItem('company_slug', companySlug);
};

export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('company_slug');
};

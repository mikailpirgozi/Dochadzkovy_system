// Shared types for mobile app

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  pushToken?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  company: Company;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  qrCode: string;
  settings: CompanySettings;
  geofence: GeofenceData;
  isActive: boolean;
}

export interface CompanySettings {
  workingHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  breakSettings: {
    maxBreakDuration: number; // minutes
    requireBreakApproval: boolean;
  };
  geofenceSettings: {
    alertAfterMinutes: number;
    strictMode: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    pushNotifications: boolean;
  };
}

export interface GeofenceData {
  latitude: number;
  longitude: number;
  radius: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: string;
}

export interface AttendanceEvent {
  id: string;
  userId: string;
  companyId: string;
  type: EventType;
  timestamp: string;
  location: LocationData;
  qrVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationLog {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  isActive: boolean;
}

export interface Alert {
  id: string;
  userId: string;
  companyId: string;
  type: AlertType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Correction {
  id: string;
  userId: string;
  companyId: string;
  originalEventId: string;
  requestedChange: Record<string, unknown>;
  reason: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessTrip {
  id: string;
  userId: string;
  companyId: string;
  destination: string;
  purpose: string;
  estimatedStart: string;
  estimatedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: BusinessTripStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type EventType = 
  | 'CLOCK_IN' 
  | 'CLOCK_OUT' 
  | 'BREAK_START' 
  | 'BREAK_END' 
  | 'PERSONAL_START' 
  | 'PERSONAL_END' 
  | 'BUSINESS_TRIP_START' 
  | 'BUSINESS_TRIP_END';

export type AlertType = 
  | 'LEFT_GEOFENCE' 
  | 'LONG_BREAK' 
  | 'MISSING_CLOCK_OUT' 
  | 'GPS_DISABLED' 
  | 'BUSINESS_TRIP_REQUEST' 
  | 'CORRECTION_REQUEST' 
  | 'SYSTEM_ERROR';

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BusinessTripStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type AttendanceStatus = 
  | 'CLOCKED_OUT' 
  | 'CLOCKED_IN' 
  | 'ON_BREAK' 
  | 'PERSONAL' 
  | 'BUSINESS_TRIP';

// API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  companySlug: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ClockInRequest {
  qrCode: string;
  location: LocationData;
  notes?: string;
}

export interface ClockOutRequest {
  qrCode?: string;
  location: LocationData;
  notes?: string;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

// App state types
export interface AuthState {
  user: User | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AttendanceState {
  currentStatus: AttendanceStatus;
  lastEvent: AttendanceEvent | null;
  todayEvents: AttendanceEvent[];
  isLoading: boolean;
  error: string | null;
}

export interface LocationState {
  currentLocation: LocationData | null;
  isTracking: boolean;
  isInGeofence: boolean;
  lastUpdate: string | null;
  error: string | null;
}

// Form types
export interface LoginFormData {
  companySlug: string;
  email: string;
  password: string;
}

export interface CorrectionFormData {
  originalEventId: string;
  requestedTime: string;
  reason: string;
}

export interface BusinessTripFormData {
  destination: string;
  purpose: string;
  estimatedStart: string;
  estimatedEnd: string;
  notes?: string;
}

// Navigation types
export interface RootStackParamList {
  '(tabs)': undefined;
  modal: undefined;
  login: undefined;
  'qr-scanner': undefined;
  'correction-request': { eventId?: string };
  'business-trip-request': undefined;
}

export interface TabsParamList {
  index: undefined;
  history: undefined;
  profile: undefined;
}

// Utility types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = {
  [P in keyof T]?: T[P];
};
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

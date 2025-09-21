// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  qrCode: string;
  settings: Record<string, unknown>;
  geofence: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Attendance types
export interface AttendanceEvent {
  id: string;
  userId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END' | 'PERSONAL_START' | 'PERSONAL_END' | 'BUSINESS_TRIP_START' | 'BUSINESS_TRIP_END';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  qrVerified: boolean;
  notes?: string;
  createdAt: string;
  user: User;
}

export interface LocationLog {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  user: User;
}

// Alert types
export interface Alert {
  id: string;
  userId: string;
  type: 'LEFT_GEOFENCE' | 'LONG_BREAK' | 'MISSING_CLOCK_OUT' | 'GPS_DISABLED' | 'BUSINESS_TRIP_REQUEST';
  message: string;
  resolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
  user: User;
}

// Dashboard types
export interface DashboardStats {
  employeesAtWork: number;
  employeesOnBreak: number;
  totalHoursToday: number;
  activeAlerts: number;
  totalEmployees: number;
  clockedInEmployees: Employee[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK' | 'ON_PERSONAL' | 'BUSINESS_TRIP';
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy: number;
  };
  clockInTime?: string;
  totalHoursToday: number;
  user: User;
}

// Report types
export interface AttendanceReport {
  employees: EmployeeReport[];
  totalHours: number;
  averageHoursPerDay: number;
  workingDays: number;
}

export interface EmployeeReport {
  id: string;
  name: string;
  email: string;
  totalHours: number;
  workingDays: number;
  averageHoursPerDay: number;
  punctualityScore: number;
  events: AttendanceEvent[];
}

// Form types
export interface DateRange {
  from: Date;
  to: Date;
}

export interface CreateEmployeeData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'MANAGER' | 'EMPLOYEE';
}

// Socket.IO event types
export interface SocketEvents {
  'location-update': (data: { userId: string; location: LocationLog }) => void;
  'attendance-event': (data: AttendanceEvent) => void;
  'alert-created': (data: Alert) => void;
  'alert-resolved': (data: { alertId: string; resolvedBy: string }) => void;
  'employee-status-changed': (data: { userId: string; status: Employee['status'] }) => void;
}

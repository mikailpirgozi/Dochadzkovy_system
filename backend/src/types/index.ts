import type { Request, Response, NextFunction } from 'express';
import type { 
  User, 
  Company, 
  AttendanceEvent, 
  LocationLog, 
  Alert, 
  Correction, 
  BusinessTrip,
  UserRole,
  EventType,
  AlertType,
  CorrectionStatus,
  BusinessTripStatus
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Company,
  AttendanceEvent,
  LocationLog,
  Alert,
  Correction,
  BusinessTrip,
  UserRole,
  EventType,
  AlertType,
  CorrectionStatus,
  BusinessTripStatus
};

// Extended Prisma types with relations
export interface UserWithCompany extends User {
  company: Company;
}

export interface AttendanceEventWithUser extends AttendanceEvent {
  user: User;
  correctionApplied: boolean;
}

export interface CorrectionWithDetails extends Correction {
  user: User;
  originalEvent?: AttendanceEvent;
  reviewedByUser?: User;
  reviewNotes: string | null;
}

export interface BusinessTripWithUser extends BusinessTrip {
  user: User;
  approver?: User;
}

export interface AlertWithUser extends Alert {
  user: User;
}

// Notification preferences types
export interface NotificationPreferences {
  push: {
    geofence: boolean;
    break: boolean;
    shift: boolean;
    corrections: boolean;
    businessTrips: boolean;
  };
  email: {
    geofence: boolean;
    break: boolean;
    shift: boolean;
    corrections: boolean;
    businessTrips: boolean;
  };
}

// NotificationPreferences is already exported as interface above

export interface UserWithNotifications extends Omit<User, 'notificationSettings'> {
  notificationSettings: NotificationPreferences;
  pushTokenPlatform: string | null;
  pushTokenUpdatedAt: Date | null;
}

// Extended Request type with user and company context
export interface AuthenticatedRequest extends Request {
  user: User;
  company: Company;
}

// Custom middleware types for authenticated routes
export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AuthenticatedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// Type guard to check if request is authenticated
export const isAuthenticatedRequest = (req: Request): req is AuthenticatedRequest => {
  return 'user' in req && 'company' in req;
};

// Override Express RequestHandler to accept AuthenticatedRequest
declare module 'express' {
  interface Request {
    user?: User;
    company?: Company;
  }
}

// Custom RequestHandler type that accepts AuthenticatedRequest (duplicate removed)

// Module augmentation removed to avoid type conflicts

// Location types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceData {
  latitude: number;
  longitude: number;
  radius: number;
}

// JWT types
export interface JWTPayload {
  userId: string;
  companyId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  companySlug: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companySlug: string;
  role?: UserRole;
}

export interface LoginResponse {
  user: Omit<User, 'password'> & { company: Company };
  tokens: TokenPair;
}

// Attendance types
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

export interface AttendanceEventWithUserBasic extends AttendanceEvent {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

// Location tracking types
export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface GeofenceEvent {
  userId: string;
  eventType: 'enter' | 'exit';
  location: LocationData;
  timestamp: Date;
}

// Alert types
export interface CreateAlertRequest {
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AlertWithUserBasic extends Alert {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

// Correction types
export interface CreateCorrectionRequest {
  originalEventId: string;
  requestedChange: Record<string, unknown>;
  reason: string;
}

export interface CorrectionWithDetailsBasic extends Correction {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  originalEvent?: AttendanceEvent;
}

// Business trip types
export interface CreateBusinessTripRequest {
  destination: string;
  purpose: string;
  estimatedStart: string;
  estimatedEnd: string;
  notes?: string;
}

export interface BusinessTripWithDetails extends BusinessTrip {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  approver?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
}

// Company types
export interface CreateCompanyRequest {
  name: string;
  slug: string;
  geofence: GeofenceData;
  settings?: Record<string, unknown>;
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

// User types
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

export interface UserWithCompany extends Omit<User, 'password'> {
  company: Company;
}

// Dashboard types
export interface DashboardStats {
  employeesAtWork: number;
  employeesOnBreak: number;
  totalHoursToday: number;
  activeAlerts: number;
  totalEmployees: number;
}

export interface EmployeeStatus {
  userId: string;
  firstName: string;
  lastName: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK' | 'PERSONAL' | 'BUSINESS_TRIP';
  lastEvent?: AttendanceEvent;
  lastLocation?: LocationLog;
  hoursToday: number;
}

// Report types
export interface AttendanceReport {
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  totalDays: number;
  averageHoursPerDay: number;
  punctualityScore: number;
  events: AttendanceEvent[];
}

export interface CompanyReport {
  companyId: string;
  companyName: string;
  totalEmployees: number;
  totalHours: number;
  averageHoursPerEmployee: number;
  employees: AttendanceReport[];
}

// Push notification types
export interface PushNotificationData {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string | number | boolean>;
  sound?: boolean;
  badge?: number;
  duration?: number;
  hours?: number;
}

export interface NotificationTarget {
  userId?: string;
  userIds?: string[];
  role?: UserRole;
  companyId?: string;
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Audit types
export interface AuditLogData {
  userId?: string;
  companyId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Database query types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  companyId?: string;
  eventType?: EventType;
  status?: string;
}

// Export types
export interface ExportOptions {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'csv' | 'excel';
  includeBreaks?: boolean;
  includePersonal?: boolean;
  includeBusinessTrips?: boolean;
  includeCorrections?: boolean;
  groupBy?: 'user' | 'date' | 'none';
  columns?: string[];
}

// Utility types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = {
  [P in keyof T]?: T[P];
};
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Environment types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  EXPO_ACCESS_TOKEN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string;
  ADMIN_DASHBOARD_URL: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string;
}

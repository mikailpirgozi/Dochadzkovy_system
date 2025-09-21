import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  ClockInRequest, 
  ClockOutRequest,
  LocationUpdateRequest,
  User,
  AttendanceEvent,
  LocationLog,
  Alert,
  Correction,
  BusinessTrip
} from '../types/index.js';

// Get API URL from app config
const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000/api';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  COMPANY_SLUG: 'company_slug',
} as const;

class ApiService {
  public client: AxiosInstance;
  private companySlug: string | null = null;

  constructor() {
    console.warn('🔗 API Service initialized with URL:', API_URL);
    
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 15000, // Increased timeout for mobile networks
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadStoredData();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token and company slug
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (this.companySlug) {
          config.headers['X-Company-Slug'] = this.companySlug;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and network errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Log network errors for debugging
        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
          console.error('🚨 Network Error - Check if backend is running and accessible:', {
            baseURL: API_URL,
            error: error.message,
            code: error.code
          });
        }

        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              if (response.data?.accessToken && response.data?.refreshToken) {
                await this.storeTokens(response.data.accessToken, response.data.refreshToken);
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
              }
              return this.client(originalRequest);
            }
          } catch {
            // Refresh failed, redirect to login
            await this.clearStoredData();
            // You might want to emit an event here to redirect to login
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async loadStoredData(): Promise<void> {
    try {
      this.companySlug = await AsyncStorage.getItem(STORAGE_KEYS.COMPANY_SLUG);
    } catch {
      // Failed to load stored data
    }
  }

  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  }

  private async storeUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.COMPANY_SLUG, user.company.slug);
    this.companySlug = user.company.slug;
  }

  private async clearStoredData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.COMPANY_SLUG,
      ]);
      this.companySlug = null;
    } catch {
      // Failed to clear stored data
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Clear any existing data before login
    await this.clearStoredData();
    
    this.companySlug = data.companySlug;
    const response = await this.client.post<ApiResponse<LoginResponse>>('/auth/login', data);
    
    if (response.data.success && response.data.data) {
      await this.storeTokens(
        response.data.data.tokens.accessToken,
        response.data.data.tokens.refreshToken
      );
      await this.storeUserData(response.data.data.user);
    }
    
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.client.post<ApiResponse>('/auth/logout');
      return response.data;
    } finally {
      await this.clearStoredData();
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const response = await this.client.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.client.put<ApiResponse<User>>('/auth/me', data);
    return response.data;
  }

  async updateDevice(deviceId: string, pushToken?: string): Promise<ApiResponse> {
    const response = await this.client.put<ApiResponse>('/auth/device', {
      deviceId,
      pushToken,
    });
    return response.data;
  }

  // Attendance endpoints
  async clockIn(data: ClockInRequest): Promise<ApiResponse<AttendanceEvent>> {
    const response = await this.client.post<ApiResponse<AttendanceEvent>>('/attendance/clock-in', data);
    return response.data;
  }

  async clockOut(data: ClockOutRequest): Promise<ApiResponse<AttendanceEvent>> {
    const response = await this.client.post<ApiResponse<AttendanceEvent>>('/attendance/clock-out', data);
    return response.data;
  }

  async startBreak(data: { type: 'BREAK' | 'PERSONAL'; location: { latitude: number; longitude: number; accuracy: number; timestamp?: string }; notes?: string }): Promise<ApiResponse<AttendanceEvent>> {
    const response = await this.client.post<ApiResponse<AttendanceEvent>>('/attendance/break-start', data);
    return response.data;
  }

  async endBreak(data: { location: { latitude: number; longitude: number; accuracy: number; timestamp?: string }; notes?: string }): Promise<ApiResponse<AttendanceEvent>> {
    const response = await this.client.post<ApiResponse<AttendanceEvent>>('/attendance/break-end', data);
    return response.data;
  }

  async getAttendanceEvents(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<AttendanceEvent[]>> {
    const response = await this.client.get<ApiResponse<AttendanceEvent[]>>('/attendance/events', {
      params,
    });
    return response.data;
  }

  async getAttendanceStatus(): Promise<ApiResponse<{ status: string; lastEvent?: AttendanceEvent }>> {
    const response = await this.client.get<ApiResponse<{ status: string; lastEvent?: AttendanceEvent }>>('/attendance/status');
    return response.data;
  }

  // Location endpoints
  async updateLocation(data: LocationUpdateRequest): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/attendance/location', data);
    return response.data;
  }

  async getLocationHistory(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<LocationLog[]>> {
    const response = await this.client.get<ApiResponse<LocationLog[]>>('/location/history', {
      params,
    });
    return response.data;
  }

  // Alerts endpoints
  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    const response = await this.client.get<ApiResponse<Alert[]>>('/alerts');
    return response.data;
  }

  // Corrections endpoints
  async createCorrection(data: {
    originalEventId: string;
    requestedChange: Record<string, unknown>;
    reason: string;
  }): Promise<ApiResponse<Correction>> {
    const response = await this.client.post<ApiResponse<Correction>>('/corrections', data);
    return response.data;
  }

  async getCorrections(): Promise<ApiResponse<Correction[]>> {
    const response = await this.client.get<ApiResponse<Correction[]>>('/corrections');
    return response.data;
  }

  // Business trips endpoints
  async createBusinessTrip(data: {
    destination: string;
    purpose: string;
    estimatedStart: string;
    estimatedEnd: string;
    notes?: string;
  }): Promise<ApiResponse<BusinessTrip>> {
    const response = await this.client.post<ApiResponse<BusinessTrip>>('/business-trips', data);
    return response.data;
  }

  async getBusinessTrips(): Promise<ApiResponse<BusinessTrip[]>> {
    const response = await this.client.get<ApiResponse<BusinessTrip[]>>('/business-trips');
    return response.data;
  }

  async startBusinessTrip(tripId: string, location: { latitude: number; longitude: number; accuracy: number }): Promise<ApiResponse<BusinessTrip>> {
    const response = await this.client.put<ApiResponse<BusinessTrip>>(`/business-trips/${tripId}/start`, {
      location,
    });
    return response.data;
  }

  // Utility methods
  async getStoredUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch {
      // Failed to get stored user data
      return null;
    }
  }

  async getStoredTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const [accessToken, refreshToken] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);

      if (accessToken[1] && refreshToken[1]) {
        return {
          accessToken: accessToken[1],
          refreshToken: refreshToken[1],
        };
      }

      return null;
    } catch {
      // Failed to get stored tokens
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      return !!tokens?.accessToken;
    } catch {
      return false;
    }
  }

  // Set company slug for API requests
  setCompanySlug(slug: string): void {
    this.companySlug = slug;
  }

  // Get current company slug
  getCompanySlug(): string | null {
    return this.companySlug;
  }

  // Handle API errors
  private handleError(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  // Dashboard and Statistics APIs
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/dashboard/stats');
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  // Chart APIs
  async getWeeklyChartData(startDate?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      
      const response = await this.client.get('/dashboard/charts/weekly', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Weekly chart data error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getMonthlyChartData(year?: number, month?: number): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;
      
      const response = await this.client.get('/dashboard/charts/monthly', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Monthly chart data error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getComparisonChartData(
    period: 'week' | 'month',
    userIds?: string[],
    startDate?: string
  ): Promise<ApiResponse<any>> {
    try {
      const params: any = { period };
      if (userIds && userIds.length > 0) params.userIds = userIds.join(',');
      if (startDate) params.startDate = startDate;
      
      const response = await this.client.get('/dashboard/charts/comparison', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Comparison chart data error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getEmployeeStatistics(period: 'day' | 'week' | 'month', date?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = { period };
      if (date) params.date = date;
      
      const response = await this.client.get('/dashboard/statistics', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Employee statistics error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getDayActivities(date: string, userId?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = { date };
      if (userId) params.userId = userId;
      
      const response = await this.client.get('/dashboard/day-activities', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Day activities error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getRecentActivity(limit?: number): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (limit) params.limit = limit;
      
      const response = await this.client.get('/dashboard/recent-activity', { params });
      return {
        success: true,
        data: response.data?.data
      };
    } catch (error) {
      console.error('Recent activity error:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;

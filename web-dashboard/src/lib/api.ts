import axios, { type AxiosError, type AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Rate limiting and retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

// Request queue to prevent too many concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private maxConcurrent = 3; // Limit concurrent requests

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.running++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processNext();
        }
      });
      
      this.processNext();
    });
  }

  private processNext() {
    if (this.running < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const requestQueue = new RequestQueue();

// Exponential backoff retry function
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retryCount = 0
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    
    if (
      retryCount < RETRY_CONFIG.maxRetries &&
      status &&
      RETRY_CONFIG.retryableStatusCodes.includes(status)
    ) {
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, retryCount) + Math.random() * 1000,
        RETRY_CONFIG.maxDelay
      );
      
      console.warn(`Request failed with status ${status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retryCount + 1);
    }
    
    throw error;
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add company slug header
    const companySlug = localStorage.getItem('company_slug');
    if (companySlug) {
      config.headers['x-company-slug'] = companySlug;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and rate limiting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('company_slug');
      window.location.href = '/';
    } else if (error.response?.status === 429) {
      // Add user-friendly message for rate limiting
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter 
        ? `Príliš veľa požiadaviek. Skúste znovu za ${retryAfter} sekúnd.`
        : 'Príliš veľa požiadaviek. Skúste znovu o chvíľu.';
      
      // Create a more user-friendly error
      const enhancedError = new Error(message) as Error & {
        isRateLimit: boolean;
        retryAfter?: string;
        originalError: AxiosError;
      };
      enhancedError.isRateLimit = true;
      enhancedError.retryAfter = retryAfter;
      enhancedError.originalError = error;
      
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  }
);

// Enhanced API request wrapper with queue and retry
const makeRequest = async <T>(requestFn: () => Promise<AxiosResponse<T>>): Promise<T> => {
  return requestQueue.add(async () => {
    return retryWithBackoff(async () => {
      const response = await requestFn();
      return response.data;
    });
  });
};

export default api;

// API service functions with enhanced error handling and queuing
export const dashboardApi = {
  // Dashboard stats
  getStats: () => makeRequest(() => api.get('/dashboard/stats', { 
    params: { _t: Date.now() } // Cache busting
  })),
  
  // Live employee locations
  getLiveLocations: (companyId: string) => 
    makeRequest(() => api.get(`/companies/${companyId}/employees/live-locations`)),
  
  // Active alerts
  getActiveAlerts: () => makeRequest(() => api.get('/alerts/active')),
  
  // Company info
  getCompany: (slug: string) => makeRequest(() => api.get(`/companies/${slug}`)),
  
  // Reports
  getAttendanceReport: (params: Record<string, unknown>) => 
    makeRequest(() => api.get('/reports/attendance', { params })),
  
  exportCSV: (params: Record<string, unknown>) => 
    makeRequest(() => api.get('/export/csv', { params, responseType: 'blob' })),
  
  exportExcel: (params: Record<string, unknown>) => 
    makeRequest(() => api.get('/export/excel', { params, responseType: 'blob' })),
  
  // Employee management
  getEmployees: () => makeRequest(() => api.get('/users')),
  createEmployee: (data: Record<string, unknown>) => makeRequest(() => api.post('/users', data)),
  updateEmployee: (id: string, data: Record<string, unknown>) => makeRequest(() => api.put(`/users/${id}`, data)),
  deleteEmployee: (id: string) => makeRequest(() => api.delete(`/users/${id}`)),
  
  // Alert management
  resolveAlert: (id: string) => makeRequest(() => api.patch(`/alerts/${id}/resolve`)),
  getAlertStats: (hours?: number) => 
    makeRequest(() => api.get('/alerts/stats', { params: { hours } })),
  
  // Settings management
  getCompanySettings: (slug: string) => makeRequest(() => api.get(`/companies/${slug}/settings`)),
  updateCompanySettings: (slug: string, data: Record<string, unknown>) => makeRequest(() => api.put(`/companies/${slug}/settings`, data)),
  
  // Statistics APIs
  getEmployeeStatistics: (period: 'day' | 'week' | 'month', date?: string) => {
    const params: Record<string, string> = { period };
    if (date) params.date = date;
    return makeRequest(() => api.get('/dashboard/statistics', { params }));
  },
  
  getDayActivities: (date: string, userId?: string) => {
    const params: Record<string, string> = { date };
    if (userId) params.userId = userId;
    return makeRequest(() => api.get('/dashboard/day-activities', { params }));
  },
  
  getRecentActivity: (limit?: number) => {
    const params: Record<string, string | number> = {};
    if (limit) params.limit = limit;
    return makeRequest(() => api.get('/dashboard/recent-activity', { params }));
  },

  // Chart APIs
  getWeeklyChartData: (startDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    return makeRequest(() => api.get('/dashboard/charts/weekly', { params }));
  },

  getMonthlyChartData: (year?: number, month?: number) => {
    const params: Record<string, string | number> = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return makeRequest(() => api.get('/dashboard/charts/monthly', { params }));
  },

  getComparisonChartData: (period: 'week' | 'month', userIds?: string[], startDate?: string) => {
    const params: Record<string, string> = { period };
    if (userIds && userIds.length > 0) params.userIds = userIds.join(',');
    if (startDate) params.startDate = startDate;
    return makeRequest(() => api.get('/dashboard/charts/comparison', { params }));
  },
};

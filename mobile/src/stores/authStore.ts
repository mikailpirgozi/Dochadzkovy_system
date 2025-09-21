import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiService } from '../services/api';
import type { User, Company, LoginRequest } from '../types';
import type { PermissionResponse } from 'expo-notifications';

// Define RegisterRequest type locally since it's not exported from types
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companySlug: string;
}

interface AuthState {
  // State
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearSession: () => Promise<void>;
  
  // Device management
  registerDevice: () => Promise<void>;
  updatePushToken: (token: string) => Promise<void>;
}

const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  DEVICE_REGISTERED: 'device_registered',
} as const;

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    company: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Login action
    login: async (credentials: LoginRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        // Clear any existing session data before login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.DEVICE_REGISTERED,
        ]);
        
        const response = await apiService.login(credentials);
        
        if (response.success && response.data) {
          const { user } = response.data;
          
          // Store user data
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
          
          set({ 
            user, 
            company: user.company,
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
          
          // Register device after successful login
          await get().registerDevice();
        } else {
          throw new Error(response.message ?? 'Login failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        set({ 
          error: errorMessage, 
          isLoading: false,
          isAuthenticated: false,
          user: null 
        });
        throw error;
      }
    },

    // Register action
    register: async (_data: RegisterRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        // For now, registration redirects to login
        // In a full implementation, you might have a separate register endpoint
        throw new Error('Registration not implemented - please contact your company admin');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Registration failed';
        set({ 
          error: errorMessage, 
          isLoading: false 
        });
        throw error;
      }
    },

    // Logout action
    logout: async () => {
      set({ isLoading: true });
      
      try {
        await apiService.logout();
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error);
      } finally {
        // Clear local state and storage
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.DEVICE_REGISTERED,
        ]);
        
        set({ 
          user: null, 
          company: null,
          isAuthenticated: false, 
          isLoading: false,
          error: null 
        });
      }
    },

    // Refresh user data
    refreshUser: async () => {
      const { isAuthenticated } = get();
      
      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await apiService.getProfile();
        
        if (response.success && response.data) {
          const user = response.data;
          
          // Update stored user data
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
          
          set({ user });
        }
      } catch (error) {
        console.warn('Failed to refresh user data:', error);
        // Don't logout on refresh failure, might be temporary network issue
      }
    },

    // Clear error
    clearError: () => {
      set({ error: null });
    },

    // Force clear all session data (for debugging)
    clearSession: async () => {
      try {
        // Clear API service data
        await apiService.logout();
        
        // Clear local state
        set({ 
          user: null, 
          company: null,
          isAuthenticated: false, 
          isLoading: false,
          error: null 
        });
        
        // Clear all stored data
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.DEVICE_REGISTERED,
        ]);
        
        console.warn('Session cleared successfully');
      } catch (error) {
        console.error('Failed to clear session:', error);
      }
    },

    // Restore session from storage
    restoreSession: async () => {
      set({ isLoading: true });
      
      try {
        // Check if we have stored tokens
        const isAuthenticated = await apiService.isAuthenticated();
        
        if (isAuthenticated) {
          // Try to get user data from storage first
          const storedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
          
          if (storedUserData) {
            const user = JSON.parse(storedUserData);
            set({ 
              user, 
              company: user.company,
              isAuthenticated: true, 
              isLoading: false 
            });
            
            // Refresh user data in background
            get().refreshUser();
          } else {
            // No stored user data, fetch from API
            const response = await apiService.getProfile();
            
            if (response.success && response.data) {
              const user = response.data;
              
              await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
              
              set({ 
                user, 
                company: user.company,
                isAuthenticated: true, 
                isLoading: false 
              });
            } else {
              throw new Error('Failed to get user profile');
            }
          }
          
          // Ensure device is registered
          await get().registerDevice();
        } else {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      } catch (error) {
        console.warn('Failed to restore session:', error);
        
        // Clear invalid session
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.DEVICE_REGISTERED,
        ]);
        
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null 
        });
      }
    },

    // Update profile
    updateProfile: async (data: Partial<User>) => {
      const { user } = get();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      set({ isLoading: true, error: null });
      
      try {
        const response = await apiService.updateProfile(data);
        
        if (response.success && response.data) {
          const updatedUser = response.data;
          
          // Update stored user data
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          
          set({ 
            user: updatedUser, 
            isLoading: false 
          });
        } else {
          throw new Error(response.message ?? 'Profile update failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
        set({ 
          error: errorMessage, 
          isLoading: false 
        });
        throw error;
      }
    },

    // Change password
    changePassword: async (_currentPassword: string, _newPassword: string) => {
      set({ isLoading: true, error: null });
      
      try {
        // This would need to be implemented in the API service
        // For now, throw an error
        throw new Error('Password change not implemented');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password change failed';
        set({ 
          error: errorMessage, 
          isLoading: false 
        });
        throw error;
      }
    },

    // Register device
    registerDevice: async () => {
      try {
        const { user } = get();
        
        if (!user) {
          return;
        }

        // Check if device is already registered
        const isDeviceRegistered = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_REGISTERED);
        
        if (isDeviceRegistered === 'true') {
          return;
        }

        // Get device ID - using a simple approach since expo-device has issues
        const deviceId = 'mobile-device-' + Math.random().toString(36).substr(2, 9);
        
        // Get push token if notifications are enabled
        let pushToken: string | undefined;
        
        try {
          const permissions: PermissionResponse = await Notifications.getPermissionsAsync();
          const status = permissions.status;
          
          if (status === 'granted') {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            pushToken = tokenData.data;
          }
        } catch (error) {
          console.warn('Failed to get push token:', error);
        }

        // Register device with API
        await apiService.updateDevice(deviceId, pushToken);
        
        // Mark device as registered
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_REGISTERED, 'true');
      } catch (error) {
        console.warn('Failed to register device:', error);
        // Don't throw error, device registration is not critical
      }
    },

    // Update push token
    updatePushToken: async (token: string) => {
      try {
        const { user } = get();
        
        if (!user) {
          return;
        }

        const deviceId = 'mobile-device-' + Math.random().toString(36).substr(2, 9);
        
        await apiService.updateDevice(deviceId, token);
      } catch (error) {
        console.warn('Failed to update push token:', error);
        // Don't throw error, push token update is not critical
      }
    },
  }))
);

// Subscribe to authentication changes for side effects
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated, previousIsAuthenticated) => {
    // Log authentication state changes
    if (isAuthenticated && !previousIsAuthenticated) {
      // User authenticated
    } else if (!isAuthenticated && previousIsAuthenticated) {
      // User logged out
    }
  }
);

// Auto-refresh user data periodically when authenticated
// Note: Periodic refresh can be implemented later with proper timer handling

export default useAuthStore;

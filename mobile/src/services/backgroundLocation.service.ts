import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { LocationData, GeofenceData, LocationService } from './location.service';
import { apiService } from './api';
import { useAuthStore } from '../stores/authStore';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'background-geofence-task';

export interface BackgroundLocationConfig {
  accuracy: Location.LocationAccuracy;
  timeInterval: number; // milliseconds
  distanceInterval: number; // meters
  deferredUpdatesInterval?: number; // milliseconds
}

export interface GeofenceViolation {
  userId: string;
  location: LocationData;
  distance: number;
  timestamp: number;
  violationType: 'LEFT_GEOFENCE' | 'GPS_DISABLED';
}

// Background task for location tracking
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    BackgroundLocationService.handleLocationError(error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    locations.forEach(async (location) => {
      try {
        await BackgroundLocationService.processBackgroundLocation(location);
      } catch (error) {
        console.error('Error processing background location:', error);
      }
    });
  }
});

// Background task for geofencing
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background geofence task error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data as { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
    BackgroundLocationService.handleGeofenceEvent(eventType, region);
  }
});

export class BackgroundLocationService {
  private static isTracking = false;
  private static currentConfig: BackgroundLocationConfig | null = null;
  private static lastGeofenceAlert = 0;
  private static readonly GEOFENCE_ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  /**
   * Start background location tracking
   */
  static async startTracking(userStatus: 'CLOCKED_IN' | 'ON_BREAK' | 'BUSINESS_TRIP' = 'CLOCKED_IN'): Promise<boolean> {
    try {
      // Check permissions
      const permissions = await LocationService.getLocationPermissionStatus();
      
      if (permissions.foreground !== 'granted') {
        throw new Error('Foreground location permission required');
      }

      if (permissions.background !== 'granted') {
        console.warn('Background location permission not granted - limited functionality');
        // Continue with foreground-only tracking
      }

      // Check if location services are enabled
      const isEnabled = await LocationService.isLocationEnabled();
      if (!isEnabled) {
        await LocationService.promptLocationSettings();
        return false;
      }

      // Get optimal configuration for current status
      const config = this.getOptimalLocationConfig(userStatus);
      this.currentConfig = config;

      // Start location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: config.accuracy,
        timeInterval: config.timeInterval,
        distanceInterval: config.distanceInterval,
        deferredUpdatesInterval: config.deferredUpdatesInterval,
        foregroundService: {
          notificationTitle: 'Dochádzka Pro',
          notificationBody: 'Sleduje vašu polohu počas práce',
          notificationColor: '#3b82f6',
        },
      });

      this.isTracking = true;
      console.warn('Background location tracking started');
      
      return true;
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      Alert.alert(
        'Chyba GPS',
        'Nepodarilo sa spustiť sledovanie polohy. Skontrolujte nastavenia GPS.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  static async stopTracking(): Promise<void> {
    try {
      if (this.isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        this.isTracking = false;
        this.currentConfig = null;
        console.warn('Background location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  }

  /**
   * Start geofencing monitoring
   */
  static async startGeofencing(geofence: GeofenceData): Promise<boolean> {
    try {
      const permissions = await LocationService.getLocationPermissionStatus();
      
      if (permissions.background !== 'granted') {
        console.warn('Background permission required for geofencing');
        return false;
      }

      const region = {
        identifier: 'company-geofence',
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      };

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [region]);
      console.warn('Geofencing started for company location');
      
      return true;
    } catch (error) {
      console.error('Error starting geofencing:', error);
      return false;
    }
  }

  /**
   * Stop geofencing monitoring
   */
  static async stopGeofencing(): Promise<void> {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.warn('Geofencing stopped');
    } catch (error) {
      console.error('Error stopping geofencing:', error);
    }
  }

  /**
   * Process background location update
   */
  static async processBackgroundLocation(location: Location.LocationObject): Promise<void> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.isAuthenticated || !authStore.user) {
        console.warn('User not authenticated, skipping location processing');
        return;
      }

      // Validate location accuracy
      if (!LocationService.validateLocationAccuracy(location)) {
        console.warn('Location accuracy too low, skipping update');
        return;
      }

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      // Send location to server
      await this.sendLocationToServer(locationData);

      // Check geofence violation locally for immediate feedback
      if (authStore.user.company?.geofence) {
        await this.checkGeofenceViolation(locationData, authStore.user.company.geofence);
      }

      console.warn('Background location processed successfully');
    } catch (error) {
      console.error('Error processing background location:', error);
    }
  }

  /**
   * Send location data to server
   */
  private static async sendLocationToServer(location: LocationData): Promise<void> {
    try {
      await apiService.client.post('/attendance/location', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send location to server:', error);
      // Store locally for retry later if needed
      // TODO: Implement offline location storage
    }
  }

  /**
   * Check for geofence violations
   */
  private static async checkGeofenceViolation(
    location: LocationData, 
    geofence: GeofenceData
  ): Promise<void> {
    const isWithinGeofence = await LocationService.isWithinGeofence(location, geofence);
    
    if (!isWithinGeofence) {
      const distance = LocationService.getDistanceFromCompany(location, geofence);
      
      // Prevent spam alerts
      const now = Date.now();
      if (now - this.lastGeofenceAlert < this.GEOFENCE_ALERT_COOLDOWN) {
        return;
      }
      
      this.lastGeofenceAlert = now;
      
      // Create geofence violation
      const violation: GeofenceViolation = {
        userId: useAuthStore.getState().user?.id ?? '',
        location,
        distance,
        timestamp: now,
        violationType: 'LEFT_GEOFENCE',
      };

      await this.handleGeofenceViolation(violation);
    }
  }

  /**
   * Handle geofence violations
   */
  private static async handleGeofenceViolation(violation: GeofenceViolation): Promise<void> {
    try {
      // Send violation to server
      await apiService.client.post('/alerts/geofence-violation', violation);

      // Show local notification to user
      await this.showGeofenceAlert(violation);

      console.warn('Geofence violation handled:', violation);
    } catch (error) {
      console.error('Error handling geofence violation:', error);
    }
  }

  /**
   * Show geofence alert notification
   */
  private static async showGeofenceAlert(violation: GeofenceViolation): Promise<void> {
    const distanceText = LocationService.formatDistance(violation.distance);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upozornenie - Mimo pracoviska',
        body: `Si ${distanceText} od práce už viac ako 5 minút. Nezabudni sa odpipnúť!`,
        data: { 
          type: 'geofence_violation',
          distance: violation.distance 
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Handle geofence events from background task
   */
  static async handleGeofenceEvent(eventType: Location.GeofencingEventType, region: Location.LocationRegion): Promise<void> {
    console.warn(`Geofence event: ${eventType} for region: ${region.identifier}`);
    
    if (eventType === Location.GeofencingEventType.Exit) {
      // User left the geofence - start monitoring more closely
      await this.startTracking('CLOCKED_IN'); // Switch to more frequent updates
      
      // Schedule delayed notification if user doesn't return
      setTimeout(async () => {
        const currentLocation = await LocationService.getCurrentLocation();
        const authStore = useAuthStore.getState();
        
        if (authStore.user?.company?.geofence) {
          const isBack = await LocationService.isWithinGeofence(
            currentLocation, 
            authStore.user.company.geofence
          );
          
          if (!isBack) {
            await this.showGeofenceAlert({
              userId: authStore.user.id,
              location: currentLocation,
              distance: LocationService.getDistanceFromCompany(
                currentLocation, 
                authStore.user.company.geofence
              ),
              timestamp: Date.now(),
              violationType: 'LEFT_GEOFENCE',
            });
          }
        }
      }, 5 * 60 * 1000); // 5 minutes delay
    }
  }

  /**
   * Handle location errors
   */
  static handleLocationError(error: Error | TaskManager.TaskManagerError): void {
    console.error('Location tracking error:', error);
    
    // Notify user about GPS issues
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Problém s GPS',
        body: 'Sledovanie polohy bolo prerušené. Skontrolujte nastavenia GPS.',
        data: { type: 'gps_error' },
      },
      trigger: null,
    });
  }

  /**
   * Get optimal location configuration based on user status
   */
  private static getOptimalLocationConfig(userStatus: string): BackgroundLocationConfig {
    const baseConfig: BackgroundLocationConfig = {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 1 minute
      distanceInterval: 100, // 100 meters
      deferredUpdatesInterval: 60000, // 1 minute
    };

    switch (userStatus) {
      case 'CLOCKED_IN':
        // More frequent updates during work
        return {
          ...baseConfig,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50, // 50 meters
        };

      case 'ON_BREAK':
        // Less frequent during breaks
        return {
          ...baseConfig,
          timeInterval: 120000, // 2 minutes
          distanceInterval: 200, // 200 meters
        };

      case 'BUSINESS_TRIP':
        // High accuracy for business trips
        return {
          ...baseConfig,
          accuracy: Location.Accuracy.High,
          timeInterval: 60000, // 1 minute
          distanceInterval: 100, // 100 meters
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Optimize tracking based on battery level
   */
  static async optimizeForBattery(): Promise<BackgroundLocationConfig | null> {
    // Note: Battery API requires additional setup in newer Expo versions
    // For now, we'll use a simplified approach
    
    // Battery optimization would be implemented here
    return null;
  }

  /**
   * Update tracking configuration
   */
  static async updateTrackingConfig(newConfig: BackgroundLocationConfig): Promise<void> {
    if (this.isTracking) {
      await this.stopTracking();
      this.currentConfig = newConfig;
      await this.startTracking();
    } else {
      this.currentConfig = newConfig;
    }
  }

  /**
   * Get current tracking status
   */
  static getTrackingStatus(): {
    isTracking: boolean;
    config: BackgroundLocationConfig | null;
  } {
    return {
      isTracking: this.isTracking,
      config: this.currentConfig,
    };
  }

  /**
   * Check if background location is supported
   */
  static async isBackgroundLocationSupported(): Promise<boolean> {
    try {
      return await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    } catch (error) {
      console.error('Error checking background location support:', error);
      return false;
    }
  }
}

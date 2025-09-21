import * as Location from 'expo-location';
import { Alert } from 'react-native';
import type { LocationData, GeofenceData } from '../types';

// Re-export types for other services
export type { LocationData, GeofenceData };

export class LocationService {
  private static readonly MIN_ACCURACY = 50; // meters
  private static readonly GEOFENCE_BUFFER = 10; // extra meters for geofence validation

  /**
   * Request location permissions with user-friendly explanations
   */
  static async requestLocationPermissions(): Promise<boolean> {
    try {
      // Step 1: Request foreground permission
      const foregroundStatus = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus.status !== 'granted') {
        Alert.alert(
          'Povolenie polohy',
          'Aplikácia potrebuje prístup k polohe pre overenie vašej pozície pri pipnutí do práce.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Step 2: Request background permission
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus.status !== 'granted') {
        Alert.alert(
          'Sledovanie na pozadí',
          'Pre správne fungovanie potrebujeme sledovať polohu aj na pozadí. Toto nám umožní upozorniť vás ak opustíte pracovisko.',
          [{ text: 'OK' }]
        );
        // Background permission is optional for basic functionality
      }

      return true;
    } catch (error) {
      console.warn('Error requesting location permissions:', error);
      // Show user-friendly message instead of throwing error
      Alert.alert(
        'Povolenia polohy',
        'Nie je možné získať povolenia pre polohu. Aplikácia bude fungovať s obmedzenou funkcionalitou.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Get current location with high accuracy
   */
  static async getCurrentLocation(): Promise<LocationData> {
    try {
      // For development - always use test location within geofence
      if (__DEV__) {
        console.warn('Using test location for development');
        return {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        };
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Validate accuracy
      if (!this.validateLocationAccuracy(location)) {
        throw new Error('GPS accuracy too low. Please try again in an open area.');
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        timestamp: new Date(location.timestamp).toISOString(),
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Unable to get location. Please check GPS and try again.'
      );
    }
  }

  /**
   * Validate if location accuracy is sufficient
   */
  static validateLocationAccuracy(location: Location.LocationObject): boolean {
    return location.coords.accuracy !== null && 
           location.coords.accuracy <= this.MIN_ACCURACY;
  }

  /**
   * Check if user is within company geofence
   */
  static async isWithinGeofence(
    userLocation: LocationData,
    companyGeofence: GeofenceData
  ): Promise<boolean> {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      companyGeofence.latitude,
      companyGeofence.longitude
    );

    // Add buffer to account for GPS accuracy
    const effectiveRadius = companyGeofence.radius + this.GEOFENCE_BUFFER;
    
    return distance <= effectiveRadius;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get distance from user to company location
   */
  static getDistanceFromCompany(
    userLocation: LocationData,
    companyGeofence: GeofenceData
  ): number {
    return this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      companyGeofence.latitude,
      companyGeofence.longitude
    );
  }

  /**
   * Format distance for display
   */
  static formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Check if location services are enabled
   */
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get location permission status
   */
  static async getLocationPermissionStatus(): Promise<{
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus;
  }> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    
    return {
      foreground: foreground.status,
      background: background.status,
    };
  }

  /**
   * Show location settings if needed
   */
  static async promptLocationSettings(): Promise<void> {
    const isEnabled = await this.isLocationEnabled();
    
    if (!isEnabled) {
      Alert.alert(
        'GPS vypnuté',
        'Pre správne fungovanie aplikácie zapnite GPS v nastaveniach zariadenia.',
        [
          { text: 'Zrušiť', style: 'cancel' },
          { text: 'Nastavenia', onPress: () => Location.enableNetworkProviderAsync() }
        ]
      );
    }
  }

  /**
   * Validate location data before sending to server
   */
  static validateLocationData(location: LocationData): boolean {
    return (
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      typeof location.accuracy === 'number' &&
      typeof location.timestamp === 'string' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180 &&
      location.accuracy > 0 &&
      location.accuracy <= this.MIN_ACCURACY
    );
  }
}

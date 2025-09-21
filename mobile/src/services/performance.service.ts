import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { BackgroundLocationConfig } from './backgroundLocation.service';

export type AttendanceStatus = 'CLOCKED_OUT' | 'CLOCKED_IN' | 'ON_BREAK' | 'BUSINESS_TRIP';

export interface BatteryInfo {
  level: number; // 0-1
  state: 'unknown' | 'unplugged' | 'charging' | 'full';
}

export interface DevicePerformanceInfo {
  isLowEndDevice: boolean;
  totalMemory: number; // in MB
  availableMemory: number; // in MB
  batteryLevel: number; // 0-1
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';
}

export interface LocationTrackingConfig {
  accuracy: Location.LocationAccuracy;
  timeInterval: number; // milliseconds
  distanceInterval: number; // meters
  deferredUpdatesInterval?: number; // milliseconds
  enableBackgroundUpdates: boolean;
}

export class PerformanceService {
  private static readonly LOW_BATTERY_THRESHOLD = 0.20; // 20%
  private static readonly CRITICAL_BATTERY_THRESHOLD = 0.10; // 10%
  private static readonly LOW_MEMORY_THRESHOLD = 512; // 512MB
  private static readonly HIGH_ACCURACY_DISTANCE_THRESHOLD = 50; // 50 meters from geofence

  /**
   * Get optimal location tracking configuration based on device state and user status
   */
  static async getOptimalLocationConfig(
    userStatus: AttendanceStatus,
    companyGeofence?: { latitude: number; longitude: number; radius: number },
    userLocation?: { latitude: number; longitude: number }
  ): Promise<LocationTrackingConfig> {
    try {
      const deviceInfo = await this.getDevicePerformanceInfo();
      const baseConfig = this.getBaseConfigForStatus(userStatus);
      
      // Apply battery optimization
      if (deviceInfo.batteryLevel < this.CRITICAL_BATTERY_THRESHOLD) {
        return this.getCriticalBatteryConfig();
      } else if (deviceInfo.batteryLevel < this.LOW_BATTERY_THRESHOLD) {
        return this.getLowBatteryConfig(baseConfig);
      }

      // Apply memory optimization for low-end devices
      if (deviceInfo.isLowEndDevice || deviceInfo.availableMemory < this.LOW_MEMORY_THRESHOLD) {
        return this.getLowEndDeviceConfig(baseConfig);
      }

      // Apply proximity-based optimization
      if (companyGeofence && userLocation) {
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          companyGeofence.latitude,
          companyGeofence.longitude
        );

        if (distance <= this.HIGH_ACCURACY_DISTANCE_THRESHOLD) {
          return this.getHighAccuracyConfig(baseConfig);
        }
      }

      return baseConfig;
    } catch (error) {
      console.error('Error getting optimal location config:', error);
      return this.getBaseConfigForStatus(userStatus);
    }
  }

  /**
   * Get base configuration for user status
   */
  private static getBaseConfigForStatus(status: AttendanceStatus): LocationTrackingConfig {
    switch (status) {
      case 'CLOCKED_IN':
        return {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50, // 50 meters
          deferredUpdatesInterval: 60000, // 1 minute
          enableBackgroundUpdates: true,
        };

      case 'ON_BREAK':
        return {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 120000, // 2 minutes
          distanceInterval: 100, // 100 meters
          deferredUpdatesInterval: 180000, // 3 minutes
          enableBackgroundUpdates: true,
        };

      case 'BUSINESS_TRIP':
        return {
          accuracy: Location.Accuracy.High,
          timeInterval: 60000, // 1 minute
          distanceInterval: 100, // 100 meters
          deferredUpdatesInterval: 120000, // 2 minutes
          enableBackgroundUpdates: true,
        };

      case 'CLOCKED_OUT':
      default:
        return {
          accuracy: Location.Accuracy.Low,
          timeInterval: 300000, // 5 minutes
          distanceInterval: 500, // 500 meters
          enableBackgroundUpdates: false,
        };
    }
  }

  /**
   * Get critical battery configuration (minimal tracking)
   */
  private static getCriticalBatteryConfig(): LocationTrackingConfig {
    return {
      accuracy: Location.Accuracy.Low,
      timeInterval: 600000, // 10 minutes
      distanceInterval: 1000, // 1km
      enableBackgroundUpdates: false, // Disable background updates
    };
  }

  /**
   * Get low battery configuration
   */
  private static getLowBatteryConfig(baseConfig: LocationTrackingConfig): LocationTrackingConfig {
    return {
      ...baseConfig,
      accuracy: Location.Accuracy.Low,
      timeInterval: Math.max(baseConfig.timeInterval * 2, 120000), // Double interval, min 2 minutes
      distanceInterval: Math.max(baseConfig.distanceInterval * 2, 200), // Double distance, min 200m
      deferredUpdatesInterval: baseConfig.deferredUpdatesInterval ? 
        Math.max(baseConfig.deferredUpdatesInterval * 2, 300000) : 300000, // 5 minutes
    };
  }

  /**
   * Get low-end device configuration
   */
  private static getLowEndDeviceConfig(baseConfig: LocationTrackingConfig): LocationTrackingConfig {
    return {
      ...baseConfig,
      accuracy: Location.Accuracy.Balanced, // Avoid high accuracy
      timeInterval: Math.max(baseConfig.timeInterval * 1.5, 60000), // 1.5x interval
      distanceInterval: Math.max(baseConfig.distanceInterval * 1.5, 75), // 1.5x distance
    };
  }

  /**
   * Get high accuracy configuration for users near geofence boundary
   */
  private static getHighAccuracyConfig(baseConfig: LocationTrackingConfig): LocationTrackingConfig {
    return {
      ...baseConfig,
      accuracy: Location.Accuracy.High,
      timeInterval: Math.min(baseConfig.timeInterval * 0.5, 15000), // Half interval, min 15 seconds
      distanceInterval: Math.min(baseConfig.distanceInterval * 0.5, 25), // Half distance, min 25m
    };
  }

  /**
   * Get device performance information
   */
  private static async getDevicePerformanceInfo(): Promise<DevicePerformanceInfo> {
    try {
      // Get basic device info
      const isLowEndDevice = this.isLowEndDevice();
      
      // Estimate memory (simplified approach)
      const totalMemory = this.estimateDeviceMemory();
      const availableMemory = totalMemory * 0.6; // Rough estimate

      // Get battery level (simplified - would need expo-battery for full implementation)
      const batteryLevel = await this.getBatteryLevel();

      return {
        isLowEndDevice,
        totalMemory,
        availableMemory,
        batteryLevel,
        thermalState: 'nominal', // Would need native modules for real thermal state
      };
    } catch (error) {
      console.error('Error getting device performance info:', error);
      return {
        isLowEndDevice: false,
        totalMemory: 4096, // Default 4GB
        availableMemory: 2048, // Default 2GB available
        batteryLevel: 1.0, // Assume full battery if unknown
        thermalState: 'nominal',
      };
    }
  }

  /**
   * Determine if device is low-end
   */
  private static isLowEndDevice(): boolean {
    if (Platform.OS === 'android') {
      // On Android, we can use various heuristics
      const deviceYear = Device.deviceYearClass;
      if (deviceYear && deviceYear < 2018) {
        return true;
      }
      
      // Check if it's a known low-end device
      const lowEndDevices = ['SM-J', 'SM-A0', 'SM-A1', 'Redmi', 'POCOPHONE'];
      const modelName = Device.modelName ?? '';
      
      return lowEndDevices.some(pattern => modelName.includes(pattern));
    }
    
    if (Platform.OS === 'ios') {
      // On iOS, check device model
      const modelName = Device.modelName ?? '';
      const lowEndModels = ['iPhone SE', 'iPhone 6', 'iPhone 7', 'iPad mini'];
      
      return lowEndModels.some(model => modelName.includes(model));
    }
    
    return false;
  }

  /**
   * Estimate device memory
   */
  private static estimateDeviceMemory(): number {
    if (Platform.OS === 'ios') {
      const modelName = Device.modelName ?? '';
      
      // iOS device memory estimates
      if (modelName.includes('iPhone 14') || modelName.includes('iPhone 15')) return 6144; // 6GB
      if (modelName.includes('iPhone 13') || modelName.includes('iPhone 12')) return 4096; // 4GB
      if (modelName.includes('iPhone 11') || modelName.includes('iPhone X')) return 3072; // 3GB
      if (modelName.includes('iPhone 8') || modelName.includes('iPhone SE')) return 2048; // 2GB
      if (modelName.includes('iPad Pro')) return 8192; // 8GB
      if (modelName.includes('iPad')) return 3072; // 3GB
      
      return 4096; // Default 4GB
    }
    
    if (Platform.OS === 'android') {
      const deviceYear = Device.deviceYearClass;
      
      // Android device memory estimates based on year
      if (deviceYear && deviceYear >= 2022) return 8192; // 8GB
      if (deviceYear && deviceYear >= 2020) return 6144; // 6GB
      if (deviceYear && deviceYear >= 2018) return 4096; // 4GB
      if (deviceYear && deviceYear >= 2016) return 3072; // 3GB
      
      return 2048; // Default 2GB for older devices
    }
    
    return 4096; // Default 4GB
  }

  /**
   * Get battery level (simplified implementation)
   */
  private static async getBatteryLevel(): Promise<number> {
    // In a real implementation, you would use expo-battery
    // For now, return a default value
    return 1.0; // Assume full battery
  }

  /**
   * Calculate distance between two coordinates
   */
  private static calculateDistance(
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
   * Monitor performance and suggest optimizations
   */
  static async monitorPerformance(): Promise<{
    recommendations: string[];
    shouldOptimize: boolean;
  }> {
    try {
      const deviceInfo = await this.getDevicePerformanceInfo();
      const recommendations: string[] = [];
      let shouldOptimize = false;

      // Battery recommendations
      if (deviceInfo.batteryLevel < this.CRITICAL_BATTERY_THRESHOLD) {
        recommendations.push('Kriticky nízka batéria - GPS tracking bude minimalizovaný');
        shouldOptimize = true;
      } else if (deviceInfo.batteryLevel < this.LOW_BATTERY_THRESHOLD) {
        recommendations.push('Nízka batéria - GPS tracking bude optimalizovaný');
        shouldOptimize = true;
      }

      // Memory recommendations
      if (deviceInfo.availableMemory < this.LOW_MEMORY_THRESHOLD) {
        recommendations.push('Nízka dostupná pamäť - aplikácia bude optimalizovaná');
        shouldOptimize = true;
      }

      // Device recommendations
      if (deviceInfo.isLowEndDevice) {
        recommendations.push('Staršie zariadenie - používa sa optimalizovaný režim');
        shouldOptimize = true;
      }

      // Thermal recommendations
      if (deviceInfo.thermalState === 'serious' || deviceInfo.thermalState === 'critical') {
        recommendations.push('Zariadenie sa prehrieva - GPS tracking bude znížený');
        shouldOptimize = true;
      }

      if (recommendations.length === 0) {
        recommendations.push('Zariadenie funguje optimálne');
      }

      return { recommendations, shouldOptimize };
    } catch (error) {
      console.error('Error monitoring performance:', error);
      return {
        recommendations: ['Nepodarilo sa vyhodnotiť výkon zariadenia'],
        shouldOptimize: false,
      };
    }
  }

  /**
   * Get smart tracking recommendations
   */
  static async getSmartTrackingRecommendations(
    currentStatus: AttendanceStatus,
    lastKnownLocation?: { latitude: number; longitude: number },
    companyGeofence?: { latitude: number; longitude: number; radius: number }
  ): Promise<{
    recommendedConfig: LocationTrackingConfig;
    reasoning: string[];
  }> {
    try {
      const deviceInfo = await this.getDevicePerformanceInfo();
      const reasoning: string[] = [];

      // Get optimal configuration
      const recommendedConfig = await this.getOptimalLocationConfig(
        currentStatus,
        companyGeofence,
        lastKnownLocation
      );

      // Add reasoning
      if (deviceInfo.batteryLevel < this.LOW_BATTERY_THRESHOLD) {
        reasoning.push(`Batéria ${Math.round(deviceInfo.batteryLevel * 100)}% - znížená frekvencia GPS`);
      }

      if (deviceInfo.isLowEndDevice) {
        reasoning.push('Staršie zariadenie - optimalizované nastavenia');
      }

      if (companyGeofence && lastKnownLocation) {
        const distance = this.calculateDistance(
          lastKnownLocation.latitude,
          lastKnownLocation.longitude,
          companyGeofence.latitude,
          companyGeofence.longitude
        );

        if (distance <= this.HIGH_ACCURACY_DISTANCE_THRESHOLD) {
          reasoning.push('Blízko hranice pracoviska - vysoká presnosť GPS');
        } else if (distance > companyGeofence.radius * 2) {
          reasoning.push('Ďaleko od pracoviska - znížená frekvencia GPS');
        }
      }

      if (currentStatus === 'ON_BREAK') {
        reasoning.push('Prestávka - znížená frekvencia sledovania');
      } else if (currentStatus === 'BUSINESS_TRIP') {
        reasoning.push('Služobná cesta - zvýšená presnosť GPS');
      }

      if (reasoning.length === 0) {
        reasoning.push('Štandardné nastavenia GPS');
      }

      return { recommendedConfig, reasoning };
    } catch (error) {
      console.error('Error getting smart tracking recommendations:', error);
      return {
        recommendedConfig: this.getBaseConfigForStatus(currentStatus),
        reasoning: ['Používajú sa štandardné nastavenia GPS'],
      };
    }
  }

  /**
   * Convert LocationTrackingConfig to BackgroundLocationConfig
   */
  static toBackgroundLocationConfig(config: LocationTrackingConfig): BackgroundLocationConfig {
    return {
      accuracy: config.accuracy,
      timeInterval: config.timeInterval,
      distanceInterval: config.distanceInterval,
      deferredUpdatesInterval: config.deferredUpdatesInterval,
    };
  }

  /**
   * Check if background location tracking should be enabled
   */
  static async shouldEnableBackgroundTracking(
    userStatus: AttendanceStatus,
    deviceInfo?: DevicePerformanceInfo
  ): Promise<{ shouldEnable: boolean; reason: string }> {
    try {
      const info = deviceInfo ?? await this.getDevicePerformanceInfo();

      // Don't enable background tracking if battery is critical
      if (info.batteryLevel < this.CRITICAL_BATTERY_THRESHOLD) {
        return {
          shouldEnable: false,
          reason: 'Kriticky nízka batéria - background tracking vypnutý',
        };
      }

      // Don't enable if user is clocked out
      if (userStatus === 'CLOCKED_OUT') {
        return {
          shouldEnable: false,
          reason: 'Odpipnutý z práce - background tracking nie je potrebný',
        };
      }

      // Enable for work-related statuses
      if (['CLOCKED_IN', 'ON_BREAK', 'BUSINESS_TRIP'].includes(userStatus)) {
        return {
          shouldEnable: true,
          reason: 'Pracovný čas - background tracking aktívny',
        };
      }

      return {
        shouldEnable: false,
        reason: 'Background tracking nie je potrebný',
      };
    } catch (error) {
      console.error('Error checking background tracking status:', error);
      return {
        shouldEnable: false,
        reason: 'Chyba pri vyhodnocovaní background tracking',
      };
    }
  }
}

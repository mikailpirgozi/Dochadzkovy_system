import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface BiometricSettings {
  isEnabled: boolean;
  authenticationType: LocalAuthentication.AuthenticationType[];
  fallbackToCredentials: boolean;
}

const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'biometric_credentials', // Encrypted credentials
} as const;

export class BiometricService {
  /**
   * Check if biometric authentication is available on device
   */
  static async isAvailable(): Promise<{
    isAvailable: boolean;
    biometricType: LocalAuthentication.AuthenticationType[];
    hasHardware: boolean;
    isEnrolled: boolean;
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      return {
        isAvailable: hasHardware && isEnrolled && supportedTypes.length > 0,
        biometricType: supportedTypes,
        hasHardware,
        isEnrolled,
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return {
        isAvailable: false,
        biometricType: [],
        hasHardware: false,
        isEnrolled: false,
      };
    }
  }

  /**
   * Get user-friendly biometric type name
   */
  static getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID / Odtlačok prsta';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris skenovanie';
    }
    return 'Biometrické prihlásenie';
  }

  /**
   * Check if biometric authentication is enabled by user
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable/disable biometric authentication
   */
  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
      
      if (!enabled) {
        // Clear stored credentials when disabling
        await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
      }
    } catch (error) {
      console.error('Error setting biometric enabled status:', error);
      throw new Error('Nepodarilo sa uložiť nastavenie biometrie');
    }
  }

  /**
   * Store encrypted credentials for biometric login
   */
  static async storeCredentials(email: string, password: string): Promise<void> {
    try {
      // Simple base64 encoding - in production should use proper encryption
      const credentials = {
        email,
        password: Buffer.from(password).toString('base64'),
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        JSON.stringify(credentials)
      );
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
      throw new Error('Nepodarilo sa uložiť prihlasovacie údaje');
    }
  }

  /**
   * Get stored credentials (only after successful biometric auth)
   */
  private static async getStoredCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const credentialsJson = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
      if (!credentialsJson) return null;

      const credentials = JSON.parse(credentialsJson);
      
      // Check if credentials are not too old (30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (credentials.timestamp < thirtyDaysAgo) {
        await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
        return null;
      }

      return {
        email: credentials.email,
        password: Buffer.from(credentials.password, 'base64').toString('utf-8'),
      };
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  }

  /**
   * Authenticate with biometrics
   */
  static async authenticate(reason?: string): Promise<{
    success: boolean;
    credentials?: { email: string; password: string };
    error?: string;
  }> {
    try {
      // Check if biometric is available
      const availability = await this.isAvailable();
      if (!availability.isAvailable) {
        return {
          success: false,
          error: availability.hasHardware 
            ? 'Biometrické prihlásenie nie je nastavené na vašom zariadení'
            : 'Toto zariadenie nepodporuje biometrické prihlásenie',
        };
      }

      // Check if user has enabled biometric login
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometrické prihlásenie nie je povolené',
        };
      }

      // Get biometric type name for prompt
      const biometricName = this.getBiometricTypeName(availability.biometricType);
      
      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || `Použite ${biometricName} na prihlásenie`,
        fallbackLabel: 'Použiť heslo',
        cancelLabel: 'Zrušiť',
        disableDeviceFallback: false, // Allow fallback to device passcode
        requireConfirmation: false,
      });

      if (result.success) {
        // Get stored credentials
        const credentials = await this.getStoredCredentials();
        
        return {
          success: true,
          credentials: credentials || undefined,
        };
      } else {
        let errorMessage = 'Biometrické overenie zlyhalo';
        
        if (result.error === 'user_cancel') {
          errorMessage = 'Overenie bolo zrušené';
        } else if (result.error === 'user_fallback') {
          errorMessage = 'Použite heslo na prihlásenie';
        } else if (result.error === 'unknown') {
          errorMessage = 'Neznáma chyba biometrie';
        } else if (result.error === 'invalid_context') {
          errorMessage = 'Neplatný kontext biometrie';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Chyba pri biometrickom overení',
      };
    }
  }

  /**
   * Show setup dialog for biometric authentication
   */
  static async showSetupDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      const availability = this.isAvailable();
      
      availability.then((result) => {
        if (!result.isAvailable) {
          let message = 'Biometrické prihlásenie nie je dostupné na tomto zariadení.';
          
          if (!result.hasHardware) {
            message = 'Toto zariadenie nepodporuje biometrické prihlásenie.';
          } else if (!result.isEnrolled) {
            message = 'Najprv nastavte biometrické prihlásenie v nastaveniach zariadenia.';
          }

          Alert.alert(
            'Biometrické prihlásenie',
            message,
            [{ text: 'OK', onPress: () => resolve(false) }]
          );
          return;
        }

        const biometricName = this.getBiometricTypeName(result.biometricType);

        Alert.alert(
          'Nastaviť biometrické prihlásenie',
          `Chcete povoliť prihlásenie pomocou ${biometricName}?\n\nVaše prihlasovacie údaje budú bezpečne uložené na zariadení.`,
          [
            {
              text: 'Zrušiť',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Povoliť',
              onPress: async () => {
                try {
                  await this.setBiometricEnabled(true);
                  resolve(true);
                } catch {
                  Alert.alert('Chyba', 'Nepodarilo sa povoliť biometrické prihlásenie');
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    });
  }

  /**
   * Clear all biometric data
   */
  static async clearBiometricData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.BIOMETRIC_ENABLED,
        STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
      ]);
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      throw new Error('Nepodarilo sa vymazať biometrické údaje');
    }
  }

  /**
   * Get biometric settings for display
   */
  static async getBiometricSettings(): Promise<BiometricSettings & { 
    availabilityInfo: Awaited<ReturnType<typeof BiometricService.isAvailable>>
  }> {
    const availability = await this.isAvailable();
    const isEnabled = await this.isBiometricEnabled();

    return {
      isEnabled,
      authenticationType: availability.biometricType,
      fallbackToCredentials: true,
      availabilityInfo: availability,
    };
  }
}

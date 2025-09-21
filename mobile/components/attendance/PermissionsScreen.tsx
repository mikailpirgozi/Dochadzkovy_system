import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { LocationService } from '../../src/services/location.service';
import type { PermissionResponse } from 'expo-notifications';
import { BackgroundLocationService } from '../../src/services/backgroundLocation.service';

interface PermissionStatus {
  location: {
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus;
  };
  notifications: Notifications.PermissionStatus;
  camera: 'granted' | 'denied' | 'undetermined';
}

interface PermissionStepProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  status: 'pending' | 'granted' | 'denied';
  onPress: () => void;
  isRequired?: boolean;
}

const PermissionStep: React.FC<PermissionStepProps> = ({
  icon,
  title,
  description,
  status,
  onPress,
  isRequired = true,
}) => {

  const getStatusIcon = () => {
    switch (status) {
      case 'granted':
        return 'checkmark-circle';
      case 'denied':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: status === 'denied' ? '#fecaca' : '#e5e7eb'
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ marginRight: 16 }}>
          <Ionicons name={icon} size={32} color="#3b82f6" />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              {title}
              {isRequired && <Text style={{ color: '#ef4444' }}> *</Text>}
            </Text>
            <Ionicons 
              name={getStatusIcon()} 
              size={24} 
              color={status === 'granted' ? '#10b981' : status === 'denied' ? '#ef4444' : '#6b7280'} 
            />
          </View>
          
          <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
            {description}
          </Text>
          
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 20,
            alignSelf: 'flex-start',
            backgroundColor: status === 'granted' 
              ? '#dcfce7' 
              : status === 'denied' 
                ? '#fef2f2' 
                : '#f3f4f6'
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: '500',
              color: status === 'granted' 
                ? '#166534' 
                : status === 'denied' 
                  ? '#dc2626' 
                  : '#6b7280'
            }}>
              {status === 'granted' 
                ? 'Povolené' 
                : status === 'denied' 
                  ? 'Zamietnuté' 
                  : 'Čakajúce'
              }
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const PermissionsScreen: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: {
      foreground: Location.PermissionStatus.UNDETERMINED,
      background: Location.PermissionStatus.UNDETERMINED,
    },
    notifications: Notifications.PermissionStatus.UNDETERMINED,
    camera: 'undetermined',
  });
  
  // const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    try {
      // Check location permissions
      const locationStatus = await LocationService.getLocationPermissionStatus();
      
      // Check notification permissions
      const notificationStatus: PermissionResponse = await Notifications.getPermissionsAsync();
      
      // Check camera permissions (simplified - would need expo-camera for full implementation)
      // For now, we'll assume it's undetermined
      
      setPermissions({
        location: locationStatus,
        notifications: notificationStatus.status,
        camera: 'undetermined',
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestLocationPermission = async () => {
    setIsLoading(true);
    
    try {
      // Step 1: Explain why we need location permission
      Alert.alert(
        'Povolenie polohy',
        'Táto aplikácia potrebuje prístup k vašej polohe pre:\n\n• Overenie že ste na pracovisku pri pipnutí\n• Upozornenie ak opustíte prácu bez odpipnutia\n• Presné sledovanie pracovného času\n\nVaša poloha sa sleduje LEN počas pracovných hodín.',
        [
          { text: 'Zrušiť', style: 'cancel', onPress: () => setIsLoading(false) },
          { text: 'Pokračovať', onPress: requestForegroundLocation }
        ]
      );
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setIsLoading(false);
    }
  };

  const requestForegroundLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      setPermissions(prev => ({
        ...prev,
        location: { ...prev.location, foreground: status }
      }));
      
      if (status === Location.PermissionStatus.GRANTED) {
        // Step 2: Request background permission
        setTimeout(() => {
          Alert.alert(
            'Sledovanie na pozadí',
            'Pre správne fungovanie potrebujeme sledovať polohu aj keď je aplikácia na pozadí. Toto nám umožní:\n\n• Upozorniť vás ak opustíte pracovisko\n• Automaticky ukončiť smenu pri odchode\n• Zabezpečiť presné záznamy\n\nSledovanie sa AUTOMATICKY vypne po odpipnutí z práce.',
            [
              { text: 'Preskočiť', style: 'cancel', onPress: () => setIsLoading(false) },
              { text: 'Povoliť', onPress: requestBackgroundLocation }
            ]
          );
        }, 1000);
      } else {
        handlePermissionDenied('location');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error requesting foreground location:', error);
      setIsLoading(false);
    }
  };

  const requestBackgroundLocation = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      setPermissions(prev => ({
        ...prev,
        location: { ...prev.location, background: status }
      }));
      
      if (status === Location.PermissionStatus.DENIED) {
        // Show instructions for manual setup
        showBackgroundLocationInstructions();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error requesting background location:', error);
      setIsLoading(false);
    }
  };

  const showBackgroundLocationInstructions = () => {
    const instructions = Platform.select({
      ios: 'Pre správne fungovanie:\n\n1. Otvorte Nastavenia\n2. Nájdite "Dochádzka Pro"\n3. Vyberte "Poloha"\n4. Zvoľte "Vždy" alebo "Pri používaní aplikácie a widgetov"',
      android: 'Pre správne fungovanie:\n\n1. Otvorte Nastavenia aplikácie\n2. Vyberte "Povolenia"\n3. Vyberte "Poloha"\n4. Zvoľte "Povoliť po celý čas"',
      default: 'Povoľte sledovanie polohy na pozadí v nastaveniach zariadenia.'
    });

    Alert.alert(
      'Nastavenie polohy na pozadí',
      instructions,
      [
        { text: 'Neskôr', style: 'cancel' },
        { text: 'Otvoriť nastavenia', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    
    try {
      Alert.alert(
        'Push notifikácie',
        'Aplikácia posiela dôležité upozornenia:\n\n• Pripomienky na pipnutie\n• Upozornenia pri opustení pracoviska\n• Oznámenia o schválených žiadostiach\n\nMôžete ich kedykoľvek vypnúť v nastaveniach.',
        [
          { text: 'Neskôr', style: 'cancel', onPress: () => setIsLoading(false) },
          { text: 'Povoliť', onPress: requestNotifications }
        ]
      );
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setIsLoading(false);
    }
  };

  const requestNotifications = async () => {
    try {
      const permissions: PermissionResponse = await Notifications.requestPermissionsAsync();
      
      setPermissions(prev => ({
        ...prev,
        notifications: permissions.status
      }));
      
      if (permissions.status === Notifications.PermissionStatus.DENIED) {
        handlePermissionDenied('notifications');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error requesting notifications:', error);
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    setIsLoading(true);
    
    try {
      Alert.alert(
        'Prístup ku kamere',
        'Kamera je potrebná pre:\n\n• Skenovanie QR kódov pri pipnutí\n• Overenie identity pri špeciálnych udalostiach\n\nKamera sa používa len na skenovanie, žiadne fotografie sa neukladajú.',
        [
          { text: 'Zrušiť', style: 'cancel', onPress: () => setIsLoading(false) },
          { text: 'Povoliť', onPress: () => {
            // For now, simulate camera permission granted
            // In real implementation, you would use expo-camera
            setPermissions(prev => ({ ...prev, camera: 'granted' }));
            setIsLoading(false);
          }}
        ]
      );
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setIsLoading(false);
    }
  };

  const handlePermissionDenied = (type: string) => {
    Alert.alert(
      'Povolenie zamietnuté',
      `Bez prístupu k ${type === 'location' ? 'polohe' : type === 'notifications' ? 'notifikáciám' : 'kamere'} nebude aplikácia správne fungovať. Môžete povolenia zmeniť v nastaveniach zariadenia.`,
      [
        { text: 'OK' },
        { text: 'Nastavenia', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const canProceed = () => {
    return (
      permissions.location.foreground === Location.PermissionStatus.GRANTED &&
      permissions.camera === 'granted'
    );
  };

  const proceedToApp = async () => {
    if (!canProceed()) {
      Alert.alert(
        'Chýbajúce povolenia',
        'Pre pokračovanie sú potrebné minimálne povolenia pre polohu a kameru.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Initialize background location service if background permission is granted
      if (permissions.location.background === Location.PermissionStatus.GRANTED) {
        const isSupported = await BackgroundLocationService.isBackgroundLocationSupported();
        if (isSupported) {
          console.warn('Background location service initialized');
        }
      }

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error initializing services:', error);
      Alert.alert(
        'Chyba inicializácie',
        'Vyskytla sa chyba pri spúšťaní aplikácie. Skúste to znova.',
        [{ text: 'OK' }]
      );
    }
  };

  const getPermissionSteps = () => [
    {
      icon: 'location' as keyof typeof Ionicons.glyphMap,
      title: 'Poloha (Základná)',
      description: 'Potrebná pre overenie pozície pri pipnutí do práce',
      status: permissions.location.foreground === Location.PermissionStatus.GRANTED ? 'granted' as const : 
              permissions.location.foreground === Location.PermissionStatus.DENIED ? 'denied' as const : 'pending' as const,
      onPress: requestLocationPermission,
      isRequired: true,
    },
    {
      icon: 'location-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Poloha (Na pozadí)',
      description: 'Umožňuje upozornenia pri opustení pracoviska',
      status: permissions.location.background === Location.PermissionStatus.GRANTED ? 'granted' as const : 
              permissions.location.background === Location.PermissionStatus.DENIED ? 'denied' as const : 'pending' as const,
      onPress: requestLocationPermission,
      isRequired: false,
    },
    {
      icon: 'camera' as keyof typeof Ionicons.glyphMap,
      title: 'Kamera',
      description: 'Potrebná pre skenovanie QR kódov pri pipnutí',
      status: permissions.camera as 'granted' | 'denied' | 'pending',
      onPress: requestCameraPermission,
      isRequired: true,
    },
    {
      icon: 'notifications' as keyof typeof Ionicons.glyphMap,
      title: 'Notifikácie',
      description: 'Dôležité upozornenia a pripomienky',
      status: permissions.notifications === Notifications.PermissionStatus.GRANTED ? 'granted' as const : 
              permissions.notifications === Notifications.PermissionStatus.DENIED ? 'denied' as const : 'pending' as const,
      onPress: requestNotificationPermission,
      isRequired: false,
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 24 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Ionicons name="shield-checkmark" size={64} color="#3b82f6" />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16, textAlign: 'center' }}>
            Nastavenie povolení
          </Text>
          <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
            Pre správne fungovanie aplikácie potrebujeme nasledovné povolenia
          </Text>
        </View>

        {/* Permission Steps */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
            Požadované povolenia
          </Text>
          
          {getPermissionSteps().map((step, index) => (
            <PermissionStep
              key={index}
              {...step}
            />
          ))}
        </View>

        {/* Privacy Note */}
        <View style={{ backgroundColor: '#dbeafe', borderRadius: 8, padding: 16, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" style={{ marginRight: 12, marginTop: 4 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: '#1e3a8a', marginBottom: 8 }}>
                Ochrana súkromia
              </Text>
              <Text style={{ color: '#1e40af', fontSize: 14 }}>
                • Poloha sa sleduje LEN počas pracovných hodín{'\n'}
                • Žiadne dáta sa nezdieľajú s tretími stranami{'\n'}
                • Môžete povolenia kedykoľvek odvolať{'\n'}
                • Všetky dáta sú šifrované a bezpečne uložené
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={proceedToApp}
            disabled={!canProceed() || isLoading}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 8,
              backgroundColor: canProceed() && !isLoading ? '#3b82f6' : '#d1d5db'
            }}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '600',
              fontSize: 18,
              color: canProceed() && !isLoading ? 'white' : '#9ca3af'
            }}>
              {isLoading ? 'Načítava...' : 'Pokračovať do aplikácie'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingVertical: 12, paddingHorizontal: 24 }}
          >
            <Text style={{ textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>
              Neskôr
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={{ 
          marginTop: 32, 
          paddingTop: 24, 
          borderTopWidth: 1, 
          borderTopColor: '#e5e7eb' 
        }}>
          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
            Potrebujete pomoc s nastavením?{'\n'}
            Kontaktujte svojho administrátora alebo IT podporu.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PermissionsScreen;
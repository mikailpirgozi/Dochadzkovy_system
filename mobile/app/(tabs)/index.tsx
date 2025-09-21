import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { QRScanner } from '../../components/attendance/QRScanner';
import { AttendanceService, AttendanceStatus } from '../../src/services/attendance.service';
import { LocationService } from '../../src/services/location.service';
import { useAuthStore } from '../../src/stores/authStore';

export default function AttendanceScreen() {
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CLOCKED_OUT');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentShift, setCurrentShift] = useState<{
    clockInTime: string;
    workingTime: number;
    totalBreakTime: number;
  } | null>(null);
  const [lastEvent, setLastEvent] = useState<{
    timestamp: string;
    type: string;
  } | null>(null);
  
  const { user, company } = useAuthStore();

  // Test function for clock-in without QR scanner
  const handleTestClockIn = async () => {
    if (!company?.qrCode) {
      Alert.alert('Chyba', 'Nie je dostupný QR kód firmy');
      return;
    }

    setLoading(true);
    try {
      await AttendanceService.clockIn(company.qrCode, 'Test clock-in bez QR skenera');
      await loadAttendanceStatus();
      Alert.alert('Úspech', 'Úspešne ste sa prihlásili do práce');
    } catch (error) {
      console.error('Test clock-in error:', error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Nepodarilo sa prihlásiť do práce');
    } finally {
      setLoading(false);
    }
  };

  // Test function for clock-out without QR scanner
  const handleTestClockOut = async () => {
    setLoading(true);
    try {
      await AttendanceService.clockOut(company?.qrCode || '', 'Test clock-out bez QR skenera');
      await loadAttendanceStatus();
      Alert.alert('Úspech', 'Úspešne ste sa odhlásili z práce');
    } catch (error) {
      console.error('Test clock-out error:', error);
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Nepodarilo sa odhlásiť z práce');
    } finally {
      setLoading(false);
    }
  };

  // Load status when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadAttendanceStatus();
    }, [])
  );

  const loadAttendanceStatus = async () => {
    // Don't load status if user is not authenticated
    if (!user) {
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      const statusData = await AttendanceService.getCurrentStatus();
      setCurrentStatus(statusData.status as AttendanceStatus);
      setCurrentShift(statusData.currentShift || null);
      setLastEvent(statusData.lastEvent || null);
    } catch (error) {
      console.error('Error loading status:', error);
      // Don't show alert for authentication errors
      if (error instanceof Error && !error.message.includes('token')) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať stav dochádzky');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      setLoading(true);
      setShowQRScanner(false);

      // Validate QR code first
      const validation = await AttendanceService.validateQRCode(qrData);
      if (!validation.valid) {
        Alert.alert('Neplatný QR kód', validation.message || 'QR kód nepatrí vašej firme');
        return;
      }

      // Perform attendance action based on current status
      if (currentStatus === 'CLOCKED_OUT') {
        await AttendanceService.clockIn(qrData);
        Alert.alert('Úspech', 'Úspešne ste sa prihlásili do práce');
      } else if (currentStatus === 'CLOCKED_IN') {
        await AttendanceService.clockOut(qrData);
        Alert.alert('Úspech', 'Úspešne ste sa odhlásili z práce');
      }

      // Reload status
      await loadAttendanceStatus();
    } catch (error: unknown) {
      console.error('QR scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepodarilo sa vykonať akciu';
      Alert.alert('Chyba', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakAction = async (type: 'start' | 'end', breakType?: 'BREAK' | 'PERSONAL') => {
    try {
      setLoading(true);

      if (type === 'start' && breakType) {
        await AttendanceService.startBreak(breakType);
        const actionText = breakType === 'BREAK' ? 'obed' : 'súkromné veci';
        Alert.alert('Úspech', `Začali ste ${actionText}`);
      } else if (type === 'end') {
        await AttendanceService.endBreak();
        Alert.alert('Úspech', 'Vrátili ste sa z prestávky');
      }

      await loadAttendanceStatus();
    } catch (error: unknown) {
      console.error('Break action error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepodarilo sa vykonať akciu';
      Alert.alert('Chyba', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showBreakOptions = () => {
    Alert.alert(
      'Vyberte typ prestávky',
      'Aký typ prestávky chcete začať?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Obed', onPress: () => handleBreakAction('start', 'BREAK') },
        { text: 'Súkromné veci', onPress: () => handleBreakAction('start', 'PERSONAL') },
      ]
    );
  };

  const requestLocationPermissions = async () => {
    try {
      const hasPermissions = await LocationService.requestLocationPermissions();
      if (!hasPermissions) {
        console.warn('Location permissions not granted, app will work with limited functionality');
      }
    } catch (error) {
      console.warn('Error requesting location permissions:', error);
      setHasError(false); // Don't block the app for location errors
    }
  };

  // Request permissions on mount
  useEffect(() => {
    requestLocationPermissions();
  }, []);


  const getStatusIcon = (status: AttendanceStatus): string => {
    switch (status) {
      case 'CLOCKED_IN':
        return 'checkmark-circle';
      case 'ON_BREAK':
        return 'restaurant';
      case 'ON_PERSONAL':
        return 'person';
      case 'ON_BUSINESS_TRIP':
        return 'car';
      default:
        return 'time';
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getMainAction = () => {
    switch (currentStatus) {
      case 'CLOCKED_OUT':
        return {
          text: 'Prihlásiť sa do práce (TEST)',
          icon: 'log-in',
          color: 'bg-green-500',
          action: handleTestClockIn,
        };
      case 'CLOCKED_IN':
        return {
          text: 'Odhlásiť sa z práce (TEST)',
          icon: 'log-out',
          color: 'bg-red-500',
          action: handleTestClockOut,
        };
      case 'ON_BREAK':
        return {
          text: 'Vrátiť sa z obeda',
          icon: 'arrow-back',
          color: 'bg-blue-500',
          action: () => handleBreakAction('end'),
        };
      case 'ON_PERSONAL':
        return {
          text: 'Vrátiť sa zo súkromných vecí',
          icon: 'arrow-back',
          color: 'bg-blue-500',
          action: () => handleBreakAction('end'),
        };
      default:
        return {
          text: 'Neznáma akcia',
          icon: 'help',
          color: 'bg-gray-500',
          action: () => {},
        };
    }
  };

  const mainAction = getMainAction();

  // Simple error fallback
  if (hasError) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center p-6">
        <Text className="text-xl font-bold text-gray-800 mb-4">
          Dochádzka Pro
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Aplikácia sa načítava... Ak sa problém opakuje, reštartujte aplikáciu.
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-lg"
          onPress={() => {
            setHasError(false);
            loadAttendanceStatus();
          }}
        >
          <Text className="text-white font-semibold">Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadAttendanceStatus} />
      }
    >
      <View style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 8, 
          padding: 24, 
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: 8 
          }}>
            Dochádzka
          </Text>
          <Text style={{ color: '#6b7280' }}>
            {company?.name || 'Načítavam...'}
          </Text>
        </View>

        {/* Current Status */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 8, 
          padding: 24, 
          marginBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 16 
          }}>
            <View style={{ 
              backgroundColor: currentStatus === 'CLOCKED_IN' ? '#10b981' : '#6b7280',
              padding: 16, 
              borderRadius: 50, 
              marginRight: 16 
            }}>
              <Ionicons 
                name={getStatusIcon(currentStatus) as keyof typeof Ionicons.glyphMap} 
                size={32} 
                color="white" 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 20, 
                fontWeight: '600', 
                color: '#1f2937' 
              }}>
                {AttendanceService.getStatusText(currentStatus)}
              </Text>
              {lastEvent && (
                <Text style={{ 
                  color: '#6b7280', 
                  fontSize: 14 
                }}>
                  Posledná aktivita: {new Date(lastEvent.timestamp).toLocaleTimeString('sk-SK')}
                </Text>
              )}
            </View>
          </View>

          {/* Current Shift Info */}
          {currentShift && (
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                Dnešná zmena
              </Text>
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Začiatok</Text>
                  <Text className="font-semibold">
                    {new Date(currentShift.clockInTime).toLocaleTimeString('sk-SK')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Pracovný čas</Text>
                  <Text className="font-semibold text-green-600">
                    {formatTime(currentShift.workingTime)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Prestávky</Text>
                  <Text className="font-semibold text-orange-600">
                    {formatTime(currentShift.totalBreakTime)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Main Action Button */}
        <TouchableOpacity
          style={{
            backgroundColor: currentStatus === 'CLOCKED_OUT' ? '#10b981' : '#ef4444',
            padding: 24,
            borderRadius: 8,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
          onPress={mainAction.action}
          disabled={loading}
        >
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name={mainAction.icon as keyof typeof Ionicons.glyphMap} size={24} color="white" />
            )}
            <Text style={{ 
              color: 'white', 
              fontSize: 18, 
              fontWeight: '600', 
              marginLeft: 12 
            }}>
              {mainAction.text}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Secondary Actions */}
        {currentStatus === 'CLOCKED_IN' && (
          <View className="flex-row space-x-4">
            <TouchableOpacity
              className="flex-1 bg-yellow-500 p-4 rounded-lg shadow-sm"
              onPress={showBreakOptions}
              disabled={loading}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="restaurant" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  Prestávka
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* User Info */}
        <View className="bg-white rounded-lg p-4 mt-6 shadow-sm">
          <Text className="text-gray-600 text-sm">Prihlásený ako</Text>
          <Text className="font-semibold text-gray-800">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-gray-600 text-sm">
            {user?.email}
          </Text>
          
          {/* Debug: Clear Session Button */}
          <TouchableOpacity
            className="bg-red-500 p-2 rounded mt-3"
            onPress={async () => {
              Alert.alert(
                'Vyčistiť session',
                'Toto vymaže všetky uložené dáta a odhlási vás. Pokračovať?',
                [
                  { text: 'Zrušiť', style: 'cancel' },
                  { 
                    text: 'Vyčistiť', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await useAuthStore.getState().clearSession();
                        Alert.alert('Úspech', 'Session bola vyčistená. Aplikácia sa reštartuje.');
                        // Force app to restart by clearing everything
                        setTimeout(() => {
                          throw new Error('Restarting app after session clear');
                        }, 1000);
                      } catch {
                        Alert.alert('Chyba', 'Nepodarilo sa vyčistiť session');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text className="text-white text-center text-xs">
              🔧 Debug: Vyčistiť Session
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          isVisible={showQRScanner}
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      </Modal>
    </ScrollView>
  );

  // Return original functionality
  // return <TestNativeWind />;
}

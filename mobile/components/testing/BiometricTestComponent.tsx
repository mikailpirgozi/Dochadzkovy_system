import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { BarCodeScanner } from 'expo-barcode-scanner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

/**
 * 🧪 Biometric & Native Features Test Component
 * Testuje všetky native funkcie na reálnom zariadení
 */
export const BiometricTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      const newResult = { name, status, message, details };
      
      if (existing) {
        return prev.map(r => r.name === name ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  /**
   * Test biometric authentication
   */
  const testBiometrics = async () => {
    updateTestResult('Biometrics', 'pending', 'Testing biometric authentication...');
    
    try {
      // Check hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        updateTestResult('Biometrics', 'error', 'No biometric hardware available');
        return;
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        updateTestResult('Biometrics', 'error', 'No biometrics enrolled on device');
        return;
      }

      // Get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      // Attempt authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Test biometric authentication',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        updateTestResult('Biometrics', 'success', 'Biometric authentication successful!', {
          supportedTypes: supportedTypes.map(type => 
            type === LocalAuthentication.AuthenticationType.FINGERPRINT ? 'Fingerprint' :
            type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ? 'Face Recognition' :
            type === LocalAuthentication.AuthenticationType.IRIS ? 'Iris' : 'Unknown'
          )
        });
      } else {
        updateTestResult('Biometrics', 'error', `Authentication failed: ${result.error}`, result);
      }
    } catch (error) {
      updateTestResult('Biometrics', 'error', `Biometric test failed: ${error}`, error);
    }
  };

  /**
   * Test GPS location
   */
  const testGPS = async () => {
    updateTestResult('GPS', 'pending', 'Testing GPS location...');
    
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        updateTestResult('GPS', 'error', 'Location permission denied');
        return;
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 1
      });

      const accuracy = location.coords.accuracy || 0;
      const message = `GPS location acquired! Accuracy: ${accuracy.toFixed(1)}m`;
      
      updateTestResult('GPS', 'success', message, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: accuracy,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp).toLocaleString()
      });
    } catch (error) {
      updateTestResult('GPS', 'error', `GPS test failed: ${error}`, error);
    }
  };

  /**
   * Test push notifications
   */
  const testPushNotifications = async () => {
    updateTestResult('Push Notifications', 'pending', 'Testing push notifications...');
    
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        updateTestResult('Push Notifications', 'error', 'Notification permission denied');
        return;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      // Schedule a local notification for testing
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dochádzka Pro Test 🧪",
          body: "Push notifikácie fungujú správne!",
          data: { test: true, timestamp: Date.now() },
        },
        trigger: { seconds: 2 },
      });

      updateTestResult('Push Notifications', 'success', 'Push notification test scheduled!', {
        token: token,
        tokenPreview: `${token.substring(0, 30)}...`,
        message: 'Local notification scheduled for 2 seconds'
      });
    } catch (error) {
      updateTestResult('Push Notifications', 'error', `Push notification test failed: ${error}`, error);
    }
  };

  /**
   * Test camera permissions for QR scanning
   */
  const testCamera = async () => {
    updateTestResult('Camera/QR', 'pending', 'Testing camera permissions...');
    
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      if (status !== 'granted') {
        updateTestResult('Camera/QR', 'error', 'Camera permission denied');
        return;
      }

      updateTestResult('Camera/QR', 'success', 'Camera permission granted! QR scanner ready.', {
        permission: status,
        message: 'Camera is ready for QR code scanning'
      });
    } catch (error) {
      updateTestResult('Camera/QR', 'error', `Camera test failed: ${error}`, error);
    }
  };

  /**
   * Test background location permissions
   */
  const testBackgroundLocation = async () => {
    updateTestResult('Background Location', 'pending', 'Testing background location...');
    
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      if (status === 'granted') {
        updateTestResult('Background Location', 'success', 'Background location permission granted!', {
          status: status,
          message: 'App can track location in background'
        });
      } else {
        updateTestResult('Background Location', 'error', `Background location permission: ${status}`, {
          status: status,
          message: 'Background tracking may not work properly'
        });
      }
    } catch (error) {
      updateTestResult('Background Location', 'error', `Background location test failed: ${error}`, error);
    }
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      await testCamera();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testGPS();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testPushNotifications();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testBackgroundLocation();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testBiometrics();
    } catch (error) {
      Alert.alert('Test Error', `Failed to run tests: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="bg-white rounded-lg p-6 mb-4">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          🧪 Native Features Test
        </Text>
        <Text className="text-gray-600 mb-4">
          Test všetkých native funkcií na reálnom zariadení
        </Text>
        
        <TouchableOpacity
          className={`py-3 px-6 rounded-lg ${isRunning ? 'bg-gray-400' : 'bg-blue-500'}`}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text className="text-white text-center font-semibold">
            {isRunning ? '⏳ Testing...' : '🚀 Run All Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      {testResults.map((result, index) => (
        <View key={index} className="bg-white rounded-lg p-4 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-gray-800">
              {getStatusIcon(result.status)} {result.name}
            </Text>
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getStatusColor(result.status) + '20' }}
            >
              <Text 
                className="text-sm font-medium"
                style={{ color: getStatusColor(result.status) }}
              >
                {result.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <Text className="text-gray-600 mb-2">{result.message}</Text>
          
          {result.details && (
            <View className="bg-gray-50 rounded p-3">
              <Text className="text-xs text-gray-500 font-mono">
                {JSON.stringify(result.details, null, 2)}
              </Text>
            </View>
          )}
        </View>
      ))}

      {testResults.length === 0 && !isRunning && (
        <View className="bg-white rounded-lg p-6 items-center">
          <Text className="text-gray-500 text-center">
            Stlač "Run All Tests" pre spustenie testov
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

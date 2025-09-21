import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

export function QRScanner({ onScan, onClose, isVisible }: QRScannerProps) {
  const [qrCode, setQrCode] = useState('');

  if (!isVisible) return null;

  const handleManualInput = () => {
    if (qrCode.trim()) {
      onScan(qrCode.trim());
      setQrCode('');
    } else {
      Alert.alert('Chyba', 'Zadajte QR kód');
    }
  };

  const handleTestQR = () => {
    // Test QR kód pre development - musí sa zhodovať s test company QR kódom
    onScan('test-qr-code-123');
  };

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row justify-between items-center p-6 pt-12">
        <TouchableOpacity
          onPress={onClose}
          className="bg-gray-800 p-3 rounded-full"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">
          QR Kód
        </Text>
        <View className="w-12" />
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center px-6">
        {/* Camera Icon Placeholder */}
        <View className="w-64 h-64 bg-gray-800 rounded-lg justify-center items-center mb-8">
          <Ionicons name="camera-outline" size={80} color="gray" />
          <Text className="text-gray-400 text-center mt-4">
            QR Scanner nie je dostupný v Expo Go
          </Text>
        </View>

        {/* Manual Input */}
        <View className="w-full mb-6">
          <Text className="text-white text-lg font-semibold mb-4 text-center">
            Zadajte QR kód manuálne
          </Text>
          <TextInput
            className="bg-gray-800 text-white p-4 rounded-lg text-center text-lg"
            placeholder="Zadajte QR kód..."
            placeholderTextColor="gray"
            value={qrCode}
            onChangeText={setQrCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Buttons */}
        <View style={{ width: '100%', gap: 16 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#3b82f6', padding: 16, borderRadius: 8 }}
            onPress={handleManualInput}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
              Potvrdiť QR kód
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 8 }}
            onPress={handleTestQR}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
              Použiť test QR kód
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 32, paddingHorizontal: 16 }}>
          Pre plnú funkcionalitu QR skenera použite development build namiesto Expo Go
        </Text>
      </View>
    </View>
  );
}

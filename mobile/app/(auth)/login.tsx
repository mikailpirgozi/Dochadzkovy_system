import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { apiService } from '../../src/services/api';
import { BiometricService } from '../../src/services/biometric.service';
import axios from 'axios';

export default function LoginScreen() {
  const [companySlug, setCompanySlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidatingCompany, setIsValidatingCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; slug: string } | null>(null);
  const [step, setStep] = useState<'company' | 'credentials'>('company');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [showBiometricOption, setShowBiometricOption] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  // Clear error when component mounts or inputs change
  useEffect(() => {
    clearError();
  }, [companySlug, email, password]);

  // Check biometric availability when step changes to credentials
  useEffect(() => {
    if (step === 'credentials') {
      checkBiometricAvailability();
    }
  }, [step]);

  const checkBiometricAvailability = async () => {
    try {
      const settings = await BiometricService.getBiometricSettings();
      const availability = settings.availabilityInfo;
      
      setBiometricAvailable(availability.isAvailable);
      setBiometricType(BiometricService.getBiometricTypeName(availability.biometricType));
      setShowBiometricOption(availability.isAvailable && settings.isEnabled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
      setShowBiometricOption(false);
    }
  };

  const validateCompany = async () => {
    if (!companySlug.trim()) {
      Alert.alert('Chyba', 'Zadajte názov firmy');
      return;
    }

    setIsValidatingCompany(true);
    
    try {
      console.log('🔍 Validating company with URL:', apiService.client.defaults.baseURL);
      console.log('🏢 Company slug:', companySlug.trim());
      
      // Create a new axios instance without interceptors for validation
      const validationClient = axios.create({
        baseURL: apiService.client.defaults.baseURL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const response = await validationClient.get(`/companies/validate/${companySlug.trim()}`);
      const data = response.data;
      
      console.log('✅ Company validation response:', data);
      
      if (data.success && data.data) {
        setCompanyInfo(data.data);
        setStep('credentials');
        apiService.setCompanySlug(companySlug.trim());
      } else {
        Alert.alert(
          'Firma nenájdená',
          'Firma s týmto názvom neexistuje. Skontrolujte správnosť názvu alebo kontaktujte svojho administrátora.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: unknown) {
      console.error('Company validation error:', error);
      Alert.alert(
        'Chyba pripojenia',
        'Nepodarilo sa overiť firmu. Skontrolujte internetové pripojenie a skúste znova.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsValidatingCompany(false);
    }
  };

  const handleLogin = async (skipBiometricSetup = false) => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Chyba', 'Vyplňte všetky povinné polia');
      return;
    }

    if (!companySlug.trim()) {
      Alert.alert('Chyba', 'Vyberte firmu');
      return;
    }

    try {
      await login({
        email: email.trim(),
        password: password.trim(),
        companySlug: companySlug.trim(),
      });

      // After successful login, offer to set up biometric auth
      if (!skipBiometricSetup && biometricAvailable && !showBiometricOption) {
        const shouldSetup = await BiometricService.showSetupDialog();
        if (shouldSetup) {
          await BiometricService.storeCredentials(email.trim(), password.trim());
          setShowBiometricOption(true);
        }
      }

      // Navigation will be handled by the root layout based on auth state
      router.replace('/(tabs)');
    } catch (error) {
      // Error is already set in the store
      const errorMessage = error instanceof Error ? error.message : 'Prihlásenie zlyhalo';
      Alert.alert('Chyba prihlásenia', errorMessage);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await BiometricService.authenticate(
        `Prihláste sa do ${companyInfo?.name || 'aplikácie'}`
      );

      if (result.success && result.credentials) {
        // Use stored credentials to login
        await login({
          email: result.credentials.email,
          password: result.credentials.password,
          companySlug: companySlug.trim(),
        });

        router.replace('/(tabs)');
      } else if (result.error) {
        if (result.error.includes('heslo')) {
          // User chose fallback, show regular login
          return;
        }
        Alert.alert('Biometrické prihlásenie', result.error);
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa prihlásiť pomocou biometrie');
    }
  };

  const goBackToCompanySelection = () => {
    setStep('company');
    setCompanyInfo(null);
    setEmail('');
    setPassword('');
    clearError();
  };

  const renderCompanyStep = () => (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <View style={{ 
          width: 80, 
          height: 80, 
          backgroundColor: '#3b82f6', 
          borderRadius: 40, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: 24 
        }}>
          <Ionicons name="business" size={40} color="white" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
          Dochádzka Pro
        </Text>
        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
          Zadajte názov svojej firmy pre pokračovanie
        </Text>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
          Názov firmy
        </Text>
        <TextInput
          style={{
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            padding: 16,
            fontSize: 16,
            color: '#1f2937'
          }}
          placeholder="napr. test-firma"
          placeholderTextColor="#9ca3af"
          value={companySlug}
          onChangeText={setCompanySlug}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={validateCompany}
        />
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
          Použite názov firmy ktorý vám poskytol váš administrátor
        </Text>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isValidatingCompany ? '#9ca3af' : '#3b82f6',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16
        }}
        onPress={validateCompany}
        disabled={isValidatingCompany}
      >
        {isValidatingCompany ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Pokračovať</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={{ alignItems: 'center', marginTop: 16 }}
        onPress={() => router.push('/(auth)/company-setup')}
      >
        <Text style={{ color: '#3b82f6', fontSize: 16 }}>
          Nemáte prístup? Kontaktujte administrátora
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' }}>
      {/* Company Info Header */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
          onPress={goBackToCompanySelection}
        >
          <Ionicons name="chevron-back" size={24} color="#6b7280" />
          <Text style={{ color: '#6b7280', marginLeft: 4 }}>Zmeniť firmu</Text>
        </TouchableOpacity>
        
        <View style={{ 
          width: 64, 
          height: 64, 
          backgroundColor: '#dbeafe', 
          borderRadius: 32, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: 12 
        }}>
          <Ionicons name="business" size={28} color="#3b82f6" />
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
          {companyInfo?.name}
        </Text>
        <Text style={{ color: '#6b7280' }}>Prihláste sa do svojho účtu</Text>
      </View>

      {/* Error Message */}
      {error && (
        <View style={{ 
          backgroundColor: '#fef2f2', 
          borderWidth: 1, 
          borderColor: '#fecaca', 
          borderRadius: 8, 
          padding: 12, 
          marginBottom: 16 
        }}>
          <Text style={{ color: '#b91c1c', textAlign: 'center' }}>{error}</Text>
        </View>
      )}

      {/* Email Input */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Email
        </Text>
        <TextInput
          style={{
            width: '100%',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            fontSize: 16,
            backgroundColor: 'white',
            color: '#1f2937'
          }}
          placeholder="vas.email@firma.sk"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>

      {/* Password Input */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Heslo
        </Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={{
              width: '100%',
              paddingHorizontal: 16,
              paddingVertical: 12,
              paddingRight: 48,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: 'white',
              color: '#1f2937'
            }}
            placeholder="Vaše heslo"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={() => handleLogin()}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 12, top: 12 }}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Biometric Login Button */}
      {showBiometricOption && (
        <TouchableOpacity
          style={{
            width: '100%',
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: '#10b981',
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center'
          }}
          onPress={handleBiometricLogin}
          disabled={isLoading}
        >
          <Ionicons name="finger-print" size={24} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
            Prihlásiť sa cez {biometricType}
          </Text>
        </TouchableOpacity>
      )}

      {/* Regular Login Button */}
      <TouchableOpacity
        style={{
          width: '100%',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: isLoading ? '#9ca3af' : (showBiometricOption ? '#6b7280' : '#3b82f6'),
          marginBottom: 16
        }}
        onPress={() => handleLogin()}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
            {showBiometricOption ? 'Prihlásiť sa pomocou hesla' : 'Prihlásiť sa'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Biometric Setup Link */}
      {biometricAvailable && !showBiometricOption && !isLoading && (
        <TouchableOpacity
          style={{ alignItems: 'center', marginBottom: 16 }}
          onPress={async () => {
            const shouldSetup = await BiometricService.showSetupDialog();
            if (shouldSetup) {
              setShowBiometricOption(true);
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="finger-print" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
            <Text style={{ color: '#3b82f6', fontSize: 16 }}>
              Nastaviť {biometricType}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Forgot Password Link */}
      <TouchableOpacity
        style={{ alignItems: 'center' }}
        onPress={() => router.push('/(auth)/forgot-password')}
      >
        <Text style={{ color: '#3b82f6', fontSize: 16 }}>Zabudli ste heslo?</Text>
      </TouchableOpacity>

      {/* Help Text */}
      <View style={{ 
        marginTop: 32, 
        padding: 16, 
        backgroundColor: '#f9fafb', 
        borderRadius: 8 
      }}>
        <Text style={{ 
          color: '#6b7280', 
          fontSize: 14, 
          textAlign: 'center' 
        }}>
          Problémy s prihlásením? Kontaktujte svojho administrátora alebo IT podporu.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'company' ? renderCompanyStep() : renderCredentialsStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


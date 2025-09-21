import React, { useState } from 'react';
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Chyba', 'Zadajte váš email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Chyba', 'Zadajte platný email');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call - in real implementation, call forgot password endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      Alert.alert(
        'Chyba',
        'Nepodarilo sa odoslať email. Skúste znova alebo kontaktujte podporu.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <TouchableOpacity
          style={{ alignSelf: 'flex-start', marginBottom: 16 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <View style={{ 
          width: 80, 
          height: 80, 
          backgroundColor: '#fed7aa', 
          borderRadius: 40, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: 16 
        }}>
          <Ionicons name="lock-closed" size={40} color="#f97316" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          Zabudli ste heslo?
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>
          Zadajte váš email a pošleme vám odkaz na obnovenie hesla
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
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
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
        />
      </View>

      <TouchableOpacity
        style={{
          width: '100%',
          paddingVertical: 16,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: isLoading ? '#9ca3af' : '#f97316',
          marginBottom: 16
        }}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
            Odoslať odkaz
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ 
        marginTop: 32, 
        padding: 16, 
        backgroundColor: '#dbeafe', 
        borderRadius: 8 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={{ color: '#1e3a8a', fontWeight: '500', marginBottom: 4 }}>
              Poznámka
            </Text>
            <Text style={{ color: '#1e40af', fontSize: 14 }}>
              Ak sa email nenachádza v našom systéme, neobdržíte žiadnu správu. 
              V prípade problémov kontaktujte svojho administrátora.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={{ marginTop: 24, alignItems: 'center' }}
        onPress={() => router.back()}
      >
        <Text style={{ color: '#3b82f6', fontSize: 16 }}>Späť na prihlásenie</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ 
          width: 80, 
          height: 80, 
          backgroundColor: '#dcfce7', 
          borderRadius: 40, 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: 16 
        }}>
          <Ionicons name="checkmark-circle" size={40} color="#10b981" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          Email odoslaný!
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center' }}>
          Ak sa váš email nachádza v našom systéme, obdržíte odkaz na obnovenie hesla.
        </Text>
      </View>

      <View style={{ 
        backgroundColor: '#f0fdf4', 
        borderWidth: 1, 
        borderColor: '#bbf7d0', 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 24 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="mail" size={20} color="#10b981" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={{ color: '#14532d', fontWeight: '500', marginBottom: 4 }}>
              Skontrolujte email
            </Text>
            <Text style={{ color: '#166534', fontSize: 14 }}>
              Odkaz na obnovenie hesla bol odoslaný na adresu:{'\n'}
              <Text style={{ fontWeight: '500' }}>{email}</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <TouchableOpacity
          style={{
            width: '100%',
            paddingVertical: 16,
            backgroundColor: '#3b82f6',
            borderRadius: 8,
            alignItems: 'center'
          }}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
            Späť na prihlásenie
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: '100%',
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: 'white'
          }}
          onPress={() => {
            setEmailSent(false);
            setEmail('');
          }}
        >
          <Text style={{ color: '#374151', fontSize: 18, fontWeight: '600' }}>
            Odoslať znova
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ 
        marginTop: 32, 
        padding: 16, 
        backgroundColor: '#f9fafb', 
        borderRadius: 8 
      }}>
        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          Neprišiel vám email? Skontrolujte spam priečinok alebo kontaktujte podporu.
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {emailSent ? renderSuccess() : renderForm()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

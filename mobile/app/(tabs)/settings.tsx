import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { BiometricService } from '../../src/services/biometric.service';
import { router } from 'expo-router';

interface BiometricSettings {
  isEnabled: boolean;
  authenticationType: any[];
  fallbackToCredentials: boolean;
  availabilityInfo: {
    isAvailable: boolean;
    biometricType: any[];
    hasHardware: boolean;
    isEnrolled: boolean;
  };
}

export default function SettingsScreen() {
  const [biometricSettings, setBiometricSettings] = useState<BiometricSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, company, clearSession } = useAuthStore();

  useEffect(() => {
    loadBiometricSettings();
  }, []);

  const loadBiometricSettings = async () => {
    try {
      setLoading(true);
      const settings = await BiometricService.getBiometricSettings();
      setBiometricSettings(settings);
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometricAuth = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Show setup dialog
        const shouldSetup = await BiometricService.showSetupDialog();
        if (shouldSetup) {
          await BiometricService.setBiometricEnabled(true);
          await loadBiometricSettings();
          
          Alert.alert(
            'Úspech',
            'Biometrické prihlásenie bolo povolené. Pri ďalšom prihlásení budete môcť použiť biometrické overenie.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Disable biometric auth
        Alert.alert(
          'Zakázať biometrické prihlásenie',
          'Naozaj chcete zakázať biometrické prihlásenie? Vaše uložené prihlasovacie údaje budú vymazané.',
          [
            { text: 'Zrušiť', style: 'cancel' },
            {
              text: 'Zakázať',
              style: 'destructive',
              onPress: async () => {
                await BiometricService.setBiometricEnabled(false);
                await loadBiometricSettings();
                
                Alert.alert('Úspech', 'Biometrické prihlásenie bolo zakázané.');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
      Alert.alert('Chyba', 'Nepodarilo sa zmeniť nastavenie biometrie');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Odhlásiť sa',
      'Naozaj sa chcete odhlásiť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odhlásiť sa',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const clearBiometricData = async () => {
    Alert.alert(
      'Vymazať biometrické údaje',
      'Táto akcia vymaže všetky uložené biometrické údaje. Budete sa musieť znovu prihlásiť pomocou hesla.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await BiometricService.clearBiometricData();
              await loadBiometricSettings();
              Alert.alert('Úspech', 'Biometrické údaje boli vymazané');
            } catch {
              Alert.alert('Chyba', 'Nepodarilo sa vymazať biometrické údaje');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    rightComponent?: React.ReactNode,
    onPress?: () => void,
    disabled = false
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={24} color={disabled ? '#9ca3af' : '#3b82f6'} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Načítavam nastavenia...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nastavenia</Text>
        <Text style={styles.headerSubtitle}>
          {user?.firstName} {user?.lastName} • {company?.name}
        </Text>
      </View>

      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Používateľský účet</Text>
        
        {renderSettingItem(
          'person-circle',
          'Profil',
          `${user?.email}`,
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
        
        {renderSettingItem(
          'business',
          'Firma',
          company?.name,
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zabezpečenie</Text>
        
        {biometricSettings?.availabilityInfo.isAvailable ? (
          renderSettingItem(
            'finger-print',
            'Biometrické prihlásenie',
            `${BiometricService.getBiometricTypeName(biometricSettings.availabilityInfo.biometricType)} ${
              biometricSettings.isEnabled ? 'povolené' : 'zakázané'
            }`,
            <Switch
              value={biometricSettings.isEnabled}
              onValueChange={toggleBiometricAuth}
              trackColor={{ false: '#f3f4f6', true: '#10b981' }}
              thumbColor={biometricSettings.isEnabled ? '#ffffff' : '#ffffff'}
            />
          )
        ) : (
          renderSettingItem(
            'finger-print',
            'Biometrické prihlásenie',
            biometricSettings?.availabilityInfo.hasHardware
              ? 'Nastavte biometrické overenie v nastaveniach zariadenia'
              : 'Nie je podporované na tomto zariadení',
            null,
            undefined,
            true
          )
        )}

        {biometricSettings?.isEnabled && (
          renderSettingItem(
            'trash',
            'Vymazať biometrické údaje',
            'Vymaže uložené prihlasovacie údaje',
            <Ionicons name="chevron-forward" size={20} color="#ef4444" />,
            clearBiometricData
          )
        )}

        {renderSettingItem(
          'key',
          'Zmeniť heslo',
          'Aktualizovať vaše heslo',
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplikácia</Text>
        
        {renderSettingItem(
          'notifications',
          'Notifikácie',
          'Spravovať push notifikácie',
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
        
        {renderSettingItem(
          'location',
          'Poloha',
          'Nastavenia GPS a geofencing',
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
        
        {renderSettingItem(
          'help-circle',
          'Pomoc a podpora',
          'FAQ a kontakt na podporu',
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        {renderSettingItem(
          'log-out',
          'Odhlásiť sa',
          'Ukončiť reláciu',
          null,
          handleLogout
        )}
      </View>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Dochádzka Pro v1.0.0</Text>
        <Text style={styles.footerText}>© 2024 Všetky práva vyhradené</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#3b82f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#dbeafe',
  },
  section: {
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  disabledText: {
    color: '#9ca3af',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

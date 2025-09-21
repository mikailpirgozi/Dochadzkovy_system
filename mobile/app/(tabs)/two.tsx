import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';

export default function ProfileScreen() {
  const { user, company, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Odhlásiť sa',
      'Naozaj sa chcete odhlásiť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { 
          text: 'Odhlásiť', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 24 }}>
        {/* User Info Card */}
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
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ 
              width: 80, 
              height: 80, 
              backgroundColor: '#3b82f6', 
              borderRadius: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: 12 
            }}>
              <Ionicons name="person" size={40} color="white" />
            </View>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: '#1f2937' 
            }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={{ color: '#6b7280' }}>{user?.email}</Text>
          </View>
        </View>

        {/* Company Info */}
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
            fontSize: 18, 
            fontWeight: '600', 
            color: '#1f2937', 
            marginBottom: 12 
          }}>
            Firma
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="business" size={20} color="#6b7280" />
            <Text style={{ color: '#374151', marginLeft: 12 }}>{company?.name}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ 
          backgroundColor: 'white', 
          borderRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}>
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#f3f4f6' 
            }}
            onPress={() => Alert.alert('Info', 'Nastavenia budú dostupné v budúcej verzii')}
          >
            <Ionicons name="settings" size={20} color="#6b7280" />
            <Text style={{ color: '#374151', marginLeft: 12, flex: 1 }}>Nastavenia</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: '#f3f4f6' 
            }}
            onPress={() => Alert.alert('Info', 'Pomoc bude dostupná v budúcej verzii')}
          >
            <Ionicons name="help-circle" size={20} color="#6b7280" />
            <Text style={{ color: '#374151', marginLeft: 12, flex: 1 }}>Pomoc</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16 
            }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={{ color: '#ef4444', marginLeft: 12, flex: 1 }}>Odhlásiť sa</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Dochádzka Pro v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

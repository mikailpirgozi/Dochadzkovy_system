import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CompanySetupScreen() {
  const handleContactSupport = () => {
    const email = 'support@attendance-pro.com';
    const subject = 'Žiadosť o prístup do aplikácie Dochádzka Pro';
    const body = `Dobrý deň,

chcel by som požiadať o prístup do aplikácie Dochádzka Pro pre našu firmu.

Informácie o firme:
- Názov firmy: 
- IČO: 
- Kontaktná osoba: 
- Email: 
- Telefón: 
- Počet zamestnancov: 

Ďakujem za spracovanie žiadosti.

S pozdravom,
`;

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl);
  };

  const handleCallSupport = () => {
    const phoneNumber = '+421900123456'; // Replace with actual support number
    Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flex: 1, padding: 24, paddingTop: 32 }}>
        {/* Header */}
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
            <Ionicons name="help-circle" size={40} color="#f97316" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
            Potrebujete prístup?
          </Text>
          <Text style={{ color: '#6b7280', textAlign: 'center' }}>
            Kontaktujte nás pre nastavenie Dochádzka Pro vo vašej firme
          </Text>
        </View>

        {/* Info Cards */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          <View style={{ 
            backgroundColor: '#dbeafe', 
            borderWidth: 1, 
            borderColor: '#bfdbfe', 
            borderRadius: 8, 
            padding: 16 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#1e3a8a', marginBottom: 4 }}>
                  Pre zamestnancov
                </Text>
                <Text style={{ color: '#1e40af', fontSize: 14 }}>
                  Ak ste zamestnanec, kontaktujte svojho administrátora alebo HR oddelenie 
                  pre získanie prístupových údajov.
                </Text>
              </View>
            </View>
          </View>

          <View style={{ 
            backgroundColor: '#f0fdf4', 
            borderWidth: 1, 
            borderColor: '#bbf7d0', 
            borderRadius: 8, 
            padding: 16 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="business" size={24} color="#10b981" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#14532d', marginBottom: 4 }}>
                  Pre firmy
                </Text>
                <Text style={{ color: '#166534', fontSize: 14 }}>
                  Chcete implementovať Dochádzka Pro vo vašej firme? 
                  Kontaktujte nás pre demo a cenové podmienky.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features List */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
            Čo ponúka Dochádzka Pro?
          </Text>
          
          <View style={{ gap: 12 }}>
            {[
              { icon: 'qr-code', text: 'QR kód pipnutie s GPS validáciou' },
              { icon: 'location', text: 'Sledovanie polohy počas pracovných hodín' },
              { icon: 'notifications', text: 'Inteligentné upozornenia a alerty' },
              { icon: 'analytics', text: 'Pokročilé reporty a štatistiky' },
              { icon: 'shield-checkmark', text: 'Bezpečnosť a GDPR compliance' },
              { icon: 'people', text: 'Multi-tenant podpora pre viacero firiem' },
            ].map((feature, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: 16, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginRight: 12 
                }}>
                  <Ionicons name={feature.icon as keyof typeof Ionicons.glyphMap} size={16} color="#6b7280" />
                </View>
                <Text style={{ color: '#374151', flex: 1 }}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Options */}
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
            Kontaktujte nás
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#3b82f6',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
              Poslať email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={handleCallSupport}
          >
            <Ionicons name="call" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
              Zavolať podporu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white'
            }}
            onPress={() => Linking.openURL('https://attendance-pro.com')}
          >
            <Ionicons name="globe" size={20} color="#6b7280" />
            <Text style={{ color: '#374151', fontWeight: '600', marginLeft: 8 }}>
              Navštíviť web
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ 
          marginTop: 32, 
          paddingTop: 24, 
          borderTopWidth: 1, 
          borderTopColor: '#e5e7eb' 
        }}>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
            Dochádzka Pro v1.0.0{'\n'}
            Moderný systém pre sledovanie pracovného času
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

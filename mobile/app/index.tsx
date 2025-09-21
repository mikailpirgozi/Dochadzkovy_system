import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading]);

  // Show loading while determining route
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#3b82f6' }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Dochádzka Pro
      </Text>
      <Text style={{ color: 'white', opacity: 0.8 }}>
        Načítavam...
      </Text>
    </View>
  );
}

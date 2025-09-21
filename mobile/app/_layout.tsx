import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Text } from 'react-native';
// import 'react-native-reanimated'; // Temporarily disabled for Expo Go compatibility

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '../src/stores/authStore';
import { NotificationService } from '../src/services/notification.service';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading, restoreSession } = useAuthStore();

  // Initialize services on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize notification service (non-blocking)
        NotificationService.initialize().catch((error) => {
          console.warn('NotificationService initialization failed:', error);
          // Continue without notifications - app should still work
        });
        
        // Restore session (always execute)
        restoreSession();
        
        // Skip automatic login - let user login manually
      } catch (error) {
        console.error('Failed to initialize app services:', error);
        // Always restore session even if other services fail
        restoreSession();
      }
    };

    initializeApp();
  }, []);

  // Navigation is now handled by index.tsx
  // This layout just provides the structure

  // Show loading screen while initializing
  if (isLoading) {
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

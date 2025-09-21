import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="company-setup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="permissions" />
      </Stack>
    </>
  );
}

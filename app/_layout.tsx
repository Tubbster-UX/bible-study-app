import Auth from '@/components/Auth';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import '../global.css';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
  );
}

function InnerLayout() {
  const { user, loading } = useAuth()

  if (loading) return null

  // If there's no authenticated user, show the Auth UI instead of app tabs.
  if (!user) return <Auth />

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}

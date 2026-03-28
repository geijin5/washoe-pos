import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform } from "react-native";
import { AuthProvider } from "@/hooks/auth-store";
import { POSProvider } from "@/hooks/pos-store";
import LoadingScreen from "@/components/LoadingScreen";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Keep the splash screen visible while we prepare the app
        await SplashScreen.preventAutoHideAsync();
        
        // Lock orientation to landscape (only on native platforms)
        if (Platform.OS !== 'web') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
        
        // Simulate app initialization time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Hide splash screen
        await SplashScreen.hideAsync();
        
        setIsAppReady(true);
      } catch (error) {
        console.error('Error preparing app:', error);
        setIsAppReady(true);
      }
    };

    prepareApp();
  }, []);

  if (!isAppReady) {
    return <LoadingScreen message="Starting Washoe POS..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <POSProvider>
          <GestureHandlerRootView style={styles.container}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </POSProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
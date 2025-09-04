import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/auth-store';
import LoadingScreen from '@/components/LoadingScreen';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, isDeviceSetup, isCheckingSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isCheckingSetup) {
      if (!isDeviceSetup) {
        // Device needs setup
        router.replace('/setup');
      } else if (isAuthenticated) {
        // Device is set up and user is authenticated
        router.replace('/(tabs)/pos');
      } else {
        // Device is set up but user needs to login
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, isDeviceSetup, isCheckingSetup, router]);

  if (isLoading || isCheckingSetup) {
    let message = 'Loading...';
    if (isCheckingSetup) {
      message = 'Checking device setup...';
    } else if (isLoading) {
      message = 'Initializing application...';
    }
    
    return <LoadingScreen message={message} />;
  }

  // This should not be reached as useEffect will handle navigation
  return null;
}
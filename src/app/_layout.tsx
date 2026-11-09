import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { useLanguage } from '@/hooks/use-language';
import { initI18n } from '@/i18n';

SplashScreen.preventAutoHideAsync();

function RootNavigator({ i18nReady }: { i18nReady: boolean }) {
  const colorScheme = useColorScheme();
  const { status } = useAuth();
  const { isRTL } = useLanguage();

  const ready = i18nReady && status !== 'loading';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // عند الانتقال من "مسجّل" إلى "غير مسجّل" (خروج أو انتهاء جلسة) نذهب لصفحة تسجيل الدخول
  const previousStatus = useRef(status);
  useEffect(() => {
    const wasAuthenticated = previousStatus.current === 'authenticated';
    previousStatus.current = status;
    if (wasAuthenticated && status === 'unauthenticated') {
      const id = setTimeout(() => router.replace('/login'), 0);
      return () => clearTimeout(id);
    }
  }, [status]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      {/* اتجاه الواجهة كلها يتبع لغة التطبيق مباشرة */}
      <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
          </Stack.Protected>

          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>

          <Stack.Screen name="about" />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  return (
    <AuthProvider>
      <RootNavigator i18nReady={i18nReady} />
    </AuthProvider>
  );
}
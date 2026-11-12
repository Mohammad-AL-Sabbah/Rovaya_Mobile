import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, useColorScheme } from 'react-native';

// ==========================================
// CHECK 1: Module Loading
// ==========================================
console.warn('CHECK 1: layout module loaded');

let AuthProvider: any, useAuth: any, useLanguage: any, initI18n: any;

try {
  ({ AuthProvider, useAuth } = require('@/auth/auth-context'));
  console.warn('STEP 2: auth-context ok');
} catch (e: any) {
  console.warn('FAIL auth-context:', e?.message, e?.stack);
}

try {
  ({ useLanguage } = require('@/hooks/use-language'));
  console.warn('STEP 3: use-language ok');
} catch (e: any) {
  console.warn('FAIL use-language:', e?.message, e?.stack);
}

try {
  ({ initI18n } = require('@/i18n'));
  console.warn('STEP 4: i18n ok');
} catch (e: any) {
  console.warn('FAIL i18n:', e?.message, e?.stack);
}

// ==========================================
// Splash Screen
// ==========================================
SplashScreen.preventAutoHideAsync().catch(() => {});

// ==========================================
// Root Navigator
// ==========================================
function RootNavigator({ i18nReady }: { i18nReady: boolean }) {

  // CHECK 7
  console.warn('CHECK 7: RootNavigator started');

  const colorScheme = useColorScheme();

  const { status } = useAuth();
  const { isRTL } = useLanguage();

  // CHECK 8
  console.warn('CHECK 8: hooks completed', {
    status,
    isRTL,
    i18nReady,
  });

  // حماية: بعد 5 ثوانٍ يفتح التطبيق مهما صار
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      console.warn('CHECK: forceReady timeout triggered');
      setForceReady(true);
    }, 5000);

    return () => clearTimeout(id);
  }, []);

  const ready = (i18nReady && status !== 'loading') || forceReady;
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    console.warn('CHECK: readiness effect', {
      ready,
      status,
      i18nReady,
    });

    if (ready) {
      SplashScreen.hideAsync().catch((e) =>
        console.warn('Splash hide error:', e)
      );
    }
  }, [ready]);

  // عند الانتقال من مسجل إلى غير مسجل
  const previousStatus = useRef(status);

  useEffect(() => {
    const wasAuthenticated =
      previousStatus.current === 'authenticated';

    previousStatus.current = status;

    if (wasAuthenticated && status === 'unauthenticated') {
      console.warn('CHECK: session expired, redirecting to login');

      const id = setTimeout(() => router.replace('/login'), 0);

      return () => clearTimeout(id);
    }
  }, [status]);

  if (!ready) {
    console.warn('CHECK: Navigator waiting for readiness');
    return null;
  }

  // CHECK 9
  console.warn('CHECK 9: Rendering Stack');

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <StatusBar style="auto" />

      <View
        style={{
          flex: 1,
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
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

// ==========================================
// Root Layout
// ==========================================
export default function RootLayout() {

  // CHECK 2
  console.warn('CHECK 2: RootLayout started');

  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {

    // CHECK 3
    console.warn('CHECK 3: RootLayout useEffect started');

    initI18n()
      .then(() => {
        console.warn('CHECK 4: i18n initialized');
      })
      .catch((e: any) => {
        console.warn('CHECK ERROR i18n:', e?.message, e?.stack);
      })
      .finally(() => {
        // CHECK 5
        console.warn('CHECK 5: setting i18nReady');
        setI18nReady(true);
      });

  }, []);

  // CHECK 6
  console.warn('CHECK 6: rendering AuthProvider');

  return (
    <AuthProvider>
      <RootNavigator i18nReady={i18nReady} />
    </AuthProvider>
  );
}
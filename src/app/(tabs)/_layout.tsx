import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-context';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { SURFACE } from '@/components/tab-screen';

export const unstable_settings = { initialRouteName: 'home' };

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // خط دفاع ثانٍ: الراوتر (Stack.Protected) يمنع الوصول أصلاً، وهنا لا نرسم أي شيء لغير المسجّل
  if (!isAuthenticated) return null;

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      tabBar={(props: BottomTabBarProps) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: SURFACE } }}
    >
      {/* الأزرار الظاهرة في الشريط (ترتيبها في floating-tab-bar.tsx) */}
      <Tabs.Screen name="home" options={{ title: t('tabs.home.title') }} />
      <Tabs.Screen name="recommendations" options={{ title: t('tabs.recommendations.title') }} />
      <Tabs.Screen name="planner" options={{ title: t('tabs.planner.title') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile.title') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings.title') }} />

      {/* صفحات تُفتح من داخل التطبيق ولا تظهر كأزرار */}
      <Tabs.Screen 
        name="guide" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' } // ✅ هذا السطر يخفي شريط التبويب عند الدخول لصفحة الدليل
        }} 
      />
      <Tabs.Screen name="news" options={{ href: null }} />
      <Tabs.Screen name="news-all" options={{ href: null }} />
    </Tabs>
  );
}
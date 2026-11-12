import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { SURFACE } from '@/components/tab-screen';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      tabBar={(props: BottomTabBarProps) => (
        <FloatingTabBar {...props} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: SURFACE },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home.title') }} />
      <Tabs.Screen name="recommendations" options={{ title: t('tabs.recommendations.title') }} />
      <Tabs.Screen name="planner" options={{ title: t('tabs.planner.title') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile.title') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings.title') }} />

      <Tabs.Screen name="guide" options={{ href: null }} />
      <Tabs.Screen name="news" options={{ href: null }} />
      <Tabs.Screen name="news-all" options={{ href: null }} />
      <Tabs.Screen name="trip/map" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
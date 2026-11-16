import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '@/api/config';
import { fetchProfile } from '@/api/profile';
import { useAuth } from '@/auth/auth-context';
import { useTabBarSpace } from '@/components/floating-tab-bar';
import { DiscoverMapCard } from '@/components/home/discovermap';
import { HERO_OVERLAP, HomeHero } from '@/components/home/home-hero';
import {
  GuideCta,
  HomeFooter,
  MedicalCard,
  NewsSection,
  QuickActions,
  RecommendationsSection,
  TripsFeature,
} from '@/components/home/sections';
import { SURFACE } from '@/components/tab-screen';
import { useAsync } from '@/hooks/use-async';
import { Brand } from '@/constants/brand';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();
  const isArabic = !!i18n.language?.startsWith('ar');
  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const { data: profile, reload } = useAsync(fetchProfile, 'profile');
  const [tripCounts, setTripCounts] = useState({ active: 0, archived: 0 });

  useFocusEffect(
    useCallback(() => {
      reload();
      fetchTripCounts();
    }, [reload])
  );

  const fetchTripCounts = useCallback(async () => {
    try {
      const candidateKeys = ['rovaya.accessToken', 'accessToken', 'token', 'userToken', 'rovaya.token'];
      let token: string | null = null;
      for (const key of candidateKeys) {
        const val = await SecureStore.getItemAsync(key);
        if (val && val.length > 10) { token = val; break; }
      }
      if (!token) return;

      const backendOrigin = API_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
      const response = await fetch(`${backendOrigin}/api/Customer/my-trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        const active = data.data.filter((trip: any) => trip.status === 1).length;
        const archived = data.data.filter((trip: any) => trip.status === 2).length;
        setTripCounts({ active, archived });
      }
    } catch (error) {
      console.error('❌ Failed to fetch trip counts:', error);
    }
  }, []);

  const avatarUrl = resolveImageUrl(profile?.profileImageUrl);
  const comingSoon = () => Alert.alert(t('common.comingSoon'), t('common.comingSoonText'));

  const toPlanner = () => router.navigate('/planner');
  const toRecommendations = () => router.navigate('/recommendations');
  const toProfile = () => router.navigate('/profile');
  const toGuide = () => router.navigate('/guide');
  const toMedical = () => router.navigate('/profile/medical');
  const toSupport = () => router.navigate('/support');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space }}>
        <HomeHero
          name={user?.firstName ?? profile?.firstName ?? ''}
          avatarUrl={avatarUrl}
          onProfile={toProfile}
        />

        <View style={styles.sheet}>
          <View style={styles.pad}>
            <GuideCta onPress={toGuide} />
          </View>

          <View style={styles.pad}>
            <QuickActions
              active={tripCounts.active}
              archived={tripCounts.archived}
              onActive={() => router.navigate('/my-trips')}
              onArchived={() => router.navigate('/my-trips-archived')}
              onRecommendations={toRecommendations}
            />
          </View>

          <View style={styles.pad}>
            <TripsFeature onCreate={toPlanner} />
          </View>

          <View style={styles.pad}>
            <DiscoverMapCard onOpen={toGuide} />
          </View>

          <RecommendationsSection
            onSeeAll={toRecommendations}
            onOpen={toRecommendations}
          />

          <NewsSection
            onOpen={(a) => router.push({ pathname: '/news', params: { id: String(a.id) } })}
            onSeeAll={() => router.navigate('/news-all')}
          />

          <View style={styles.pad}>
            <MedicalCard onPress={toMedical} />
          </View>

          {/* ✅ بطاقة الدعم الفني - الاتجاه الديناميكي يُطبَّق هنا في JSX وليس في StyleSheet */}
          <View style={styles.pad}>
            <Pressable
              onPress={toSupport}
              style={({ pressed }) => [
                styles.supportCard,
                isArabic && styles.supportCardRTL,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.supportIconBox}>
                <Ionicons name="help-circle" size={28} color={Brand.green} />
              </View>

              <View style={styles.supportTextContainer}>
                <Text style={styles.supportTitle}>
                  {tr('هل تواجه مشكلة؟', 'Facing an issue?')}
                </Text>
                <Text style={styles.supportSubtitle}>
                  {tr(
                    'تواصل مع فريق الدعم الفني لمساعدتك',
                    'Contact our support team for assistance'
                  )}
                </Text>
              </View>

              <Ionicons
                name={isArabic ? 'arrow-back' : 'arrow-forward'}
                size={20}
                color={Brand.muted}
              />
            </Pressable>
          </View>

          <HomeFooter />
        </View>
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,35,27,0.55)', 'rgba(5,35,27,0)']}
        style={[styles.statusScrim, { height: insets.top + 24 }]}
      />
    </View>
  );
}

// ✅ StyleSheet ثابت تماماً - لا يحتوي على أي متغيرات من المكوّن
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  sheet: {
    marginTop: -HERO_OVERLAP,
    paddingTop: 24,
    gap: 26,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: SURFACE,
  },
  pad: { paddingHorizontal: 20 },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0 },

  // بطاقة الدعم الفني
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5ECE7',
    gap: 16,
  },
  supportCardRTL: {
    flexDirection: 'row-reverse',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  supportIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTextContainer: { flex: 1 },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.greenText,
    marginBottom: 4,
  },
  supportSubtitle: {
    fontSize: 13,
    color: Brand.muted,
    lineHeight: 18,
  },
});
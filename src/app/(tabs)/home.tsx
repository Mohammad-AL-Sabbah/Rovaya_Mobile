import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** الباك إند يرجع مساراً نسبياً (/uploads/profiles/...) فنضيف له دومين السيرفر */
const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();

  // ✅ جلب بيانات البروفايل للحصول على الصورة الشخصية
  const { data: profile, reload } = useAsync(fetchProfile, 'profile');

  // ✅ تحديث الصورة تلقائياً عند العودة لهذه الصفحة (مثلاً بعد تغيير الصورة من البروفايل)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const avatarUrl = resolveImageUrl(profile?.profileImageUrl);

  // TODO: تُستبدل بأرقام حقيقية من الـ API عندما تتوفر نقاط الرحلات
  const trips = { active: 0, archived: 0 };

  // للأقسام التي لم تُبنَ شاشتها بعد
  const comingSoon = () => Alert.alert(t('common.comingSoon'), t('common.comingSoonText'));

  const toPlanner = () => router.navigate('/planner');
  const toRecommendations = () => router.navigate('/recommendations');
  const toProfile = () => router.navigate('/profile');
  const toGuide = () => router.navigate('/guide');

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
              active={trips.active}
              archived={trips.archived}
              onActive={comingSoon}
              onArchived={comingSoon}
              onRecommendations={toRecommendations}
            />
          </View>

          <View style={styles.pad}>
            <TripsFeature onCreate={toPlanner} />
          </View>

          <View style={styles.pad}>
            <DiscoverMapCard onOpen={toGuide} />
          </View>

          <RecommendationsSection onSeeAll={toRecommendations} onOpen={toRecommendations} />

          <NewsSection
            onOpen={(a) => router.push({ pathname: '/news', params: { id: String(a.id) } })}
            onSeeAll={() => router.navigate('/news-all')}
          />

          <View style={styles.pad}>
            <MedicalCard onPress={comingSoon} />
          </View>

          <HomeFooter />
        </View>
      </ScrollView>

      {/* تدرج ثابت أعلى الشاشة ليبقى شريط الحالة مقروءاً أثناء التمرير */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,35,27,0.55)', 'rgba(5,35,27,0)']}
        style={[styles.statusScrim, { height: insets.top + 24 }]}
      />
    </View>
  );
}

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
});
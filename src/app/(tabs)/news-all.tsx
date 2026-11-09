import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describeError, fetchNews, type NewsArticle } from '@/api';
import { useTabBarSpace } from '@/components/floating-tab-bar';
import { NewsFeaturedCard, NewsListCard } from '@/components/home/news-cards';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SURFACE } from '@/components/tab-screen';
import { Brand } from '@/constants/brand';
import { useAsync } from '@/hooks/use-async';
import { useLanguage } from '@/hooks/use-language';
import { parseIsoDate } from '@/utils/text';

const ALL_COUNT = 30;
const HEADER_H = 190;
const OVERLAP = 30;

export default function NewsListScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();
  const { data, loading, error, reload } = useAsync(() => fetchNews(ALL_COUNT), 'news-all');

  const [featured, ...rest] = data ?? [];

  // تجميع بقية الأخبار حسب الشهر والسنة (الأحدث أولاً)
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: NewsArticle[] }>();
    for (const a of rest) {
      const p = parseIsoDate(a.publishedDate);
      const key = p ? `${p.y}-${p.m}` : 'other';
      const label = p ? `${t(`date.months.${p.m - 1}`)} ${p.y}` : '';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(a);
    }
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, language]);

  const open = (a: NewsArticle) => router.push({ pathname: '/news', params: { id: String(a.id) } });
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/home'));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={Brand.green} />}
      >
        {/* رأس الصفحة */}
        <View style={{ height: HEADER_H + insets.top * 0.4, backgroundColor: Brand.deep }}>
          <LinearGradient colors={['#1A7155', '#05231B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.watermark}>
            <Ionicons name="newspaper" size={170} color="rgba(255,255,255,0.05)" />
          </View>

          <View style={[styles.header, { top: insets.top + 10 }]}>
            <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={Brand.white} />
            </Pressable>
            <LanguageSwitcher variant="glass" />
          </View>

          <View style={[styles.titleBlock, { bottom: OVERLAP + 14 }]}>
            <View style={styles.kickerRow}>
              <View style={styles.kickerLine} />
              <Text style={styles.kicker}>{t('home.news.source')}</Text>
            </View>
            <Text style={styles.title}>{t('home.news.title')}</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          {loading && !data && (
            <View style={{ gap: 14 }}>
              <View style={styles.skeletonBig} />
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
            </View>
          )}

          {!loading && !!error && (
            <View style={styles.stateBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={Brand.green} />
              <Text style={styles.stateText}>{describeError(error, t, language).text}</Text>
              <Pressable onPress={reload} accessibilityRole="button" style={styles.stateBtn}>
                <Text style={styles.stateBtnText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}

          {!loading && !error && !data?.length && (
            <View style={styles.stateBox}>
              <Ionicons name="newspaper-outline" size={28} color={Brand.green} />
              <Text style={styles.stateText}>{t('home.news.empty')}</Text>
            </View>
          )}

          {!!featured && <NewsFeaturedCard article={featured} onPress={() => open(featured)} />}

          {groups.map((g) => (
            <View key={g.label} style={{ gap: 14 }}>
              {!!g.label && (
                <View style={styles.groupRow}>
                  <View style={styles.groupLine} />
                  <Text style={styles.groupLabel}>{g.label}</Text>
                </View>
              )}
              {g.items.map((a) => (
                <NewsListCard key={a.id} article={a} onPress={() => open(a)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  watermark: { position: 'absolute', end: -30, top: 30 },
  header: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  titleBlock: { position: 'absolute', start: 22, end: 22, gap: 6, alignItems: 'flex-start' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerLine: { width: 24, height: 2, borderRadius: 1, backgroundColor: Brand.gold },
  kicker: { color: Brand.gold, fontSize: 12, fontWeight: '800' },
  title: { color: Brand.white, fontSize: 32, lineHeight: 42, fontWeight: '800' },

  sheet: { marginTop: -OVERLAP, gap: 18, padding: 20, paddingTop: 22, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: SURFACE, minHeight: 420 },

  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  groupLine: { width: 22, height: 3, borderRadius: 2, backgroundColor: Brand.gold },
  groupLabel: { color: Brand.greenText, fontSize: 17, fontWeight: '800' },

  skeletonBig: { height: 270, borderRadius: 30, backgroundColor: '#E3ECE7' },
  skeletonRow: { height: 150, borderRadius: 26, backgroundColor: '#E3ECE7' },

  stateBox: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 24, backgroundColor: Brand.white, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFE0D7' },
  stateText: { color: Brand.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  stateBtn: { paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: Brand.mint, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { color: Brand.green, fontSize: 14, fontWeight: '800' },
});
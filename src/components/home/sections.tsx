import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import {
  describeError,
  fallbackPhotoKey,
  fetchHomeRecommendations,
  fetchNews,
  localizedDescription,
  localizedTitle,
  USE_MOCKS,
  type NewsArticle,
  type Recommendation,
} from '@/api';
import { HCarousel } from '@/components/home/hcarousel';
import { NewsCarouselCard, NewsSeeAllCard } from '@/components/home/news-cards';
import { Brand } from '@/constants/brand';
import { PHOTOS } from '@/constants/photos';
import { useAsync } from '@/hooks/use-async';
import { useLanguage } from '@/hooks/use-language';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ───────────────────────── عناصر مشتركة ───────────────────────── */

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  sample,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: string;
  onAction?: () => void;
  sample?: boolean;
}) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.kickerRow}>
          <View style={styles.kickerLine} />
          <Text style={styles.sectionTitle}>{title}</Text>
          {sample && (
            <View style={styles.samplePill}>
              <Text style={styles.samplePillText}>{t('common.sampleData')}</Text>
            </View>
          )}
        </View>
        {subtitle}
      </View>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction} accessibilityRole="link">
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={Brand.green} />
        </Pressable>
      )}
    </View>
  );
}

function Skeleton({ style }: { style?: object }) {
  return <View style={[{ backgroundColor: '#E3ECE7', borderRadius: 20 }, style]} />;
}

function StateBox({ icon, text, actionLabel, onAction }: { icon: IconName; text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.stateBox}>
      <Ionicons name={icon} size={26} color={Brand.green} />
      <Text style={styles.stateText}>{text}</Text>
      {!!actionLabel && (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.stateBtn}>
          <Text style={styles.stateBtnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ───────────────────────── زر الدليل السياحي ───────────────────────── */

export function GuideCta({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.guide, pressed && { opacity: 0.92 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#1A7155', '#0B3A2B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.guideIcon}>
        <Ionicons name="compass" size={28} color={Brand.deep} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.guideTitle}>{t('home.guide.title')}</Text>
        <Text style={styles.guideText} numberOfLines={2}>
          {t('home.guide.text')}
        </Text>
      </View>
      <View style={styles.guideGo}>
        <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={Brand.white} />
      </View>
    </Pressable>
  );
}

/* ───────────────────────── أزرار سريعة (3) ───────────────────────── */

export function QuickActions({
  active,
  archived,
  onActive,
  onArchived,
  onRecommendations,
}: {
  active: number;
  archived: number;
  onActive: () => void;
  onArchived: () => void;
  onRecommendations: () => void;
}) {
  const { t } = useTranslation();

  const items: { key: string; icon: IconName; label: string; badge?: number; gold?: boolean; onPress: () => void }[] = [
    { key: 'active', icon: 'airplane', label: t('home.quick.active'), badge: active, onPress: onActive },
    { key: 'archived', icon: 'archive', label: t('home.quick.archived'), badge: archived, onPress: onArchived },
    { key: 'recommendations', icon: 'star', label: t('home.quick.recommendations'), gold: true, onPress: onRecommendations },
  ];

  return (
    <View style={styles.quick}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.75 }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: item.gold ? Brand.gold : Brand.mint }]}>
            <Ionicons name={item.icon} size={24} color={item.gold ? Brand.deep : Brand.green} />
            {!!item.badge && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.quickLabel} numberOfLines={2}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ───────────────────────── بطاقة إنشاء رحلة ───────────────────────── */

export function TripsFeature({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <Pressable onPress={onCreate} accessibilityRole="button" style={({ pressed }) => [styles.feature, pressed && { opacity: 0.95 }]}>
      <Image source={PHOTOS.jerusalem} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,35,27,0.25)', 'rgba(5,35,27,0.92)']}
        locations={[0, 0.9]}
        style={StyleSheet.absoluteFill}
      />

      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 210" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
        <Path
          d="M 28 96 C 90 20, 150 120, 214 58 S 306 28, 322 70"
          fill="none"
          stroke={Brand.gold}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray="1 7"
        />
      </Svg>

      <View style={styles.featureBody}>
        <Text style={styles.featureTitle}>{t('home.trips.emptyTitle')}</Text>
        <Text style={styles.featureText}>{t('home.trips.emptyText')}</Text>
        <View style={styles.featureCta}>
          <Text style={styles.featureCtaText}>{t('home.trips.cta')}</Text>
          <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={Brand.deep} />
        </View>
      </View>
    </Pressable>
  );
}

/* ───────────────────────── مقترحة لك (من الـ Backend) ───────────────────────── */

/** صورة التوصية؛ إن لم يوجد رابط أو فشل التحميل نعرض صورة محلية مناسبة */
function RecImage({ rec }: { rec: Recommendation }) {
  const [failed, setFailed] = useState(false);
  const source = rec.imageUrl && !failed ? { uri: rec.imageUrl } : PHOTOS[fallbackPhotoKey(rec)];
  return <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} />;
}

export function RecommendationsSection({ onSeeAll, onOpen }: { onSeeAll: () => void; onOpen: (r: Recommendation) => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, loading, error, reload } = useAsync(fetchHomeRecommendations, 'recommendations');
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.padH}>
        <SectionHeader
          title={t('home.recommendations.title')}
          action={t('home.recommendations.seeAll')}
          onAction={onSeeAll}
          sample={USE_MOCKS}
        />
      </View>

      {loading && (
        <View style={[styles.padH, { flexDirection: 'row', gap: 14 }]}>
          <Skeleton style={{ width: 220, height: 280, borderRadius: 28 }} />
          <Skeleton style={{ width: 220, height: 280, borderRadius: 28 }} />
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.padH}>
          <StateBox icon="cloud-offline-outline" text={describeError(error, t, language).text} actionLabel={t('common.retry')} onAction={reload} />
        </View>
      )}

      {!loading && !error && data?.length === 0 && (
        <View style={styles.padH}>
          <StateBox icon="sparkles-outline" text={t('home.recommendations.empty')} />
        </View>
      )}

      {!loading && !error && !!data?.length && (
        <HCarousel
          data={data}
          keyOf={(r) => String(r.id)}
          renderItem={(r) => {
            const title = r.sampleKey ? t(`home.recommendations.sample.${r.sampleKey}.title`) : localizedTitle(r, language);
            const description = r.sampleKey ? t(`home.recommendations.sample.${r.sampleKey}.description`) : localizedDescription(r, language);

            return (
              <Pressable onPress={() => onOpen(r)} accessibilityRole="button" style={({ pressed }) => [styles.rec, pressed && { opacity: 0.93 }]}>
                <RecImage rec={r} />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(5,35,27,0.4)', 'rgba(5,35,27,0)', 'rgba(5,35,27,0.55)']}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.recTop}>
                  <View style={styles.recChip}>
                    <Text style={styles.recChipText}>{t(`home.recommendations.seasons.${r.season}`)}</Text>
                  </View>
                  <Pressable
                    onPress={() => setLiked((l) => ({ ...l, [r.id]: !l[r.id] }))}
                    hitSlop={8}
                    style={styles.recHeart}
                    accessibilityRole="button"
                  >
                    <Ionicons name={liked[r.id] ? 'heart' : 'heart-outline'} size={19} color={liked[r.id] ? '#FF6B6B' : Brand.white} />
                  </Pressable>
                </View>

                <View style={styles.recPanel}>
                  <Text style={styles.recTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  {!!description && (
                    <Text style={styles.recPlace} numberOfLines={2}>
                      {description}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

/* ───────────────────────── الأخبار الرسمية (كيروسيل) ───────────────────────── */

const HOME_NEWS_LIMIT = 6;
type NewsItem = NewsArticle | { id: -1; seeAll: true };
const SEE_ALL_ITEM: NewsItem = { id: -1, seeAll: true };

export function NewsSection({ onOpen, onSeeAll }: { onOpen: (a: NewsArticle) => void; onSeeAll: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, loading, error, reload } = useAsync(() => fetchNews(), 'news');

  const items: NewsItem[] = [...(data ?? []).slice(0, HOME_NEWS_LIMIT), SEE_ALL_ITEM];

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.padH}>
        <SectionHeader
          title={t('home.news.title')}
          action={t('home.news.seeAll')}
          onAction={onSeeAll}
          sample={USE_MOCKS}
          subtitle={
            <View style={styles.sourceRow}>
              <Ionicons name="checkmark-circle" size={17} color={Brand.gold} />
              <Text style={styles.sourceText}>{t('home.news.source')}</Text>
            </View>
          }
        />
      </View>

      {loading && (
        <View style={[styles.padH, { flexDirection: 'row', gap: 14 }]}>
          <Skeleton style={{ width: 270, height: 220, borderRadius: 28 }} />
          <Skeleton style={{ width: 120, height: 220, borderRadius: 28 }} />
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.padH}>
          <StateBox icon="cloud-offline-outline" text={describeError(error, t, language).text} actionLabel={t('common.retry')} onAction={reload} />
        </View>
      )}

      {!loading && !error && !data?.length && (
        <View style={styles.padH}>
          <StateBox icon="newspaper-outline" text={t('home.news.empty')} />
        </View>
      )}

      {!loading && !error && !!data?.length && (
        <HCarousel
          data={items}
          keyOf={(item) => String(item.id)}
          renderItem={(item) =>
            'seeAll' in item ? <NewsSeeAllCard onPress={onSeeAll} /> : <NewsCarouselCard article={item} onPress={() => onOpen(item)} />
          }
        />
      )}
    </View>
  );
}

/* ───────────────────────── الملف الطبي ───────────────────────── */

function PulsingHeart() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View style={{ transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }}>
      <Ionicons name="heart" size={30} color={Brand.red} />
    </Animated.View>
  );
}

export function MedicalCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();

  return (
    <LinearGradient colors={['#FFF7F5', '#FCE6E2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medical}>
      <Svg style={styles.ecg} viewBox="0 0 340 60" preserveAspectRatio="none" pointerEvents="none">
        <Path
          d="M 0 34 L 90 34 L 106 34 L 118 10 L 132 54 L 144 24 L 154 34 L 250 34 L 266 34 L 278 14 L 290 50 L 300 34 L 340 34"
          fill="none"
          stroke="rgba(179,38,46,0.28)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.medicalHead}>
        <View style={styles.medicalIcon}>
          <PulsingHeart />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.medicalTitle}>{t('home.medical.title')}</Text>
          <Text style={styles.medicalText}>{t('home.medical.text')}</Text>
        </View>
      </View>

      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.medicalCta, pressed && { opacity: 0.85 }]}>
        <Ionicons name="add-circle" size={20} color={Brand.white} />
        <Text style={styles.medicalCtaText}>{t('home.medical.cta')}</Text>
      </Pressable>
    </LinearGradient>
  );
}

/* ───────────────────────── ذيل الصفحة ───────────────────────── */

export function HomeFooter() {
  const { t } = useTranslation();
  const colors = [Brand.gold, Brand.red, '#1F7A4D', Brand.red, Brand.gold];
  return (
    <View style={styles.footer}>
      <View style={styles.diamonds}>
        {colors.map((c, i) => (
          <View key={i} style={[styles.diamond, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={styles.footerBrand}>ROVAYA</Text>
      <Text style={styles.footerText}>{t('home.footer')}</Text>
    </View>
  );
}

/* ───────────────────────── الأنماط ───────────────────────── */

const styles = StyleSheet.create({
  padH: { paddingHorizontal: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  kickerLine: { width: 22, height: 3, borderRadius: 2, backgroundColor: Brand.gold },
  sectionTitle: { color: Brand.greenText, fontSize: 21, fontWeight: '800' },
  samplePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FFF4D9' },
  samplePillText: { color: '#8A5A14', fontSize: 10.5, fontWeight: '800' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: Brand.green, fontSize: 14, fontWeight: '800' },

  stateBox: {
    alignItems: 'center',
    gap: 10,
    padding: 22,
    borderRadius: 24,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CFE0D7',
  },
  stateText: { color: Brand.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  stateBtn: { paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: Brand.mint, alignItems: 'center', justifyContent: 'center' },
  stateBtnText: { color: Brand.green, fontSize: 14, fontWeight: '800' },

  /* guide cta */
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(232,176,75,0.65)',
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  guideIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: Brand.gold, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { color: Brand.white, fontSize: 19, fontWeight: '800' },
  guideText: { color: 'rgba(247,235,210,0.92)', fontSize: 13, lineHeight: 19 },
  guideGo: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },

  /* quick actions */
  quick: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 28,
    backgroundColor: Brand.white,
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  quickItem: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: Brand.greenText, fontSize: 12.5, fontWeight: '800', textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: Brand.red,
    borderWidth: 2,
    borderColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Brand.white, fontSize: 11, fontWeight: '800' },

  /* trips feature */
  feature: { height: 200, borderRadius: 30, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: Brand.deep },
  featureBody: { padding: 20, gap: 6, alignItems: 'flex-start' },
  featureTitle: { color: Brand.white, fontSize: 24, fontWeight: '800' },
  featureText: { color: 'rgba(247,235,210,0.95)', fontSize: 13.5, lineHeight: 20 },
  featureCta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 18, height: 44, borderRadius: 22, backgroundColor: Brand.gold },
  featureCtaText: { color: Brand.deep, fontSize: 15, fontWeight: '800' },

  /* recommendations */
  rec: { width: 220, height: 280, borderRadius: 28, overflow: 'hidden', backgroundColor: Brand.deep },
  recTop: { position: 'absolute', top: 12, start: 12, end: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  recChipText: { color: Brand.white, fontSize: 12, fontWeight: '800' },
  recHeart: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(5,35,27,0.45)', alignItems: 'center', justifyContent: 'center' },
  recPanel: {
    position: 'absolute',
    start: 10,
    end: 10,
    bottom: 10,
    gap: 3,
    padding: 13,
    borderRadius: 20,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(5,35,27,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  recTitle: { color: Brand.white, fontSize: 17, lineHeight: 24, fontWeight: '800' },
  recPlace: { color: 'rgba(247,235,210,0.95)', fontSize: 12.5, lineHeight: 18 },

  /* news */
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceText: { color: Brand.muted, fontSize: 13, fontWeight: '700' },
  newsHero: { height: 220, borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between', padding: 16, backgroundColor: Brand.deep },
  newsHeroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, backgroundColor: Brand.gold },
  newsHeroBadgeText: { color: Brand.deep, fontSize: 12, fontWeight: '800' },
  newsHeroBody: { gap: 6, alignItems: 'flex-start' },
  newsHeroTitle: { color: Brand.white, fontSize: 19, lineHeight: 28, fontWeight: '800' },
  newsHeroMeta: { color: Brand.gold, fontSize: 12.5, fontWeight: '800' },
  newsRow: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 24, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  newsThumb: { width: 92, height: 92, borderRadius: 18, backgroundColor: Brand.mint },
  newsThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  newsDate: { color: '#8A5A14', fontSize: 12, fontWeight: '800' },
  newsTitle: { color: Brand.greenText, fontSize: 14.5, lineHeight: 21, fontWeight: '700' },

  /* medical */
  medical: { overflow: 'hidden', gap: 16, padding: 18, borderRadius: 28, borderWidth: 1, borderColor: '#F5C9C3' },
  ecg: { position: 'absolute', start: 0, end: 0, bottom: 0, height: 60 },
  medicalHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  medicalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  medicalTitle: { color: Brand.greenText, fontSize: 19, fontWeight: '800' },
  medicalText: { color: '#6B5450', fontSize: 13.5, lineHeight: 21 },
  medicalCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 46, borderRadius: 23, backgroundColor: Brand.red },
  medicalCtaText: { color: Brand.white, fontSize: 14.5, fontWeight: '800' },

  /* footer */
  footer: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  diamonds: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diamond: { width: 9, height: 9, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  footerBrand: { color: Brand.green, fontSize: 14, fontWeight: '800', letterSpacing: 6 },
  footerText: { color: Brand.muted, fontSize: 13 },
});
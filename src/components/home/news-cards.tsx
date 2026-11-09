import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { NewsArticle } from '@/api';
import { Brand } from '@/constants/brand';
import { useLanguage } from '@/hooks/use-language';
import { formatArticleDate } from '@/utils/text';

function useDate() {
  const { t } = useTranslation();
  return (iso: string) => formatArticleDate(iso, (i) => t(`date.months.${i}`));
}

/** صورة الخبر مع بديل أخضر جميل إذا لم تتوفر أو فشل تحميلها */
export function NewsImage({ uri }: { uri: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.noImage]}>
        <LinearGradient colors={['#1A7155', '#0B3A2B']} style={StyleSheet.absoluteFill} />
        <Ionicons name="newspaper-outline" size={44} color="rgba(247,235,210,0.55)" />
      </View>
    );
  }
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} />;
}

/* ───────── بطاقة الكيروسيل في الرئيسية ───────── */
export function NewsCarouselCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const { t } = useTranslation();
  const date = useDate();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.carousel, pressed && { opacity: 0.93 }]}>
      <NewsImage uri={article.imageUrl} />
      <LinearGradient pointerEvents="none" colors={['rgba(5,35,27,0.25)', 'rgba(5,35,27,0)', 'rgba(5,35,27,0.92)']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.dateChip}>
        <Ionicons name="calendar-outline" size={12} color={Brand.deep} />
        <Text style={styles.dateChipText}>{date(article.publishedDate)}</Text>
      </View>

      <View style={styles.carouselBody}>
        <Text style={styles.carouselTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <View style={styles.sourceRow}>
          <Ionicons name="checkmark-circle" size={13} color={Brand.gold} />
          <Text style={styles.sourceText} numberOfLines={1}>
            {t('home.news.source')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ───────── آخر بطاقة في الكيروسيل: عرض كل الأخبار ───────── */
export function NewsSeeAllCard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.85 }]}>
      <View style={styles.seeAllIcon}>
        <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={24} color={Brand.deep} />
      </View>
      <Text style={styles.seeAllText}>{t('home.news.seeAll')}</Text>
    </Pressable>
  );
}

/* ───────── البطاقة الكبيرة (أعلى صفحة كل الأخبار) ───────── */
export function NewsFeaturedCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const { t } = useTranslation();
  const date = useDate();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.featured, pressed && { opacity: 0.93 }]}>
      <NewsImage uri={article.imageUrl} />
      <LinearGradient pointerEvents="none" colors={['rgba(5,35,27,0.05)', 'rgba(5,35,27,0.94)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />

      <View style={styles.latestBadge}>
        <Ionicons name="flash" size={13} color={Brand.deep} />
        <Text style={styles.latestText}>{t('home.news.latest')}</Text>
      </View>

      <View style={styles.featuredBody}>
        <Text style={styles.featuredTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <Text style={styles.featuredSummary} numberOfLines={2}>
          {article.summary}
        </Text>
        <Text style={styles.featuredDate}>{date(article.publishedDate)}</Text>
      </View>
    </Pressable>
  );
}

/* ───────── بطاقة القائمة (صفحة كل الأخبار) ───────── */
export function NewsListCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const date = useDate();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.listCard, pressed && { opacity: 0.92 }]}>
      <View style={styles.listImage}>
        <NewsImage uri={article.imageUrl} />
      </View>

      <View style={styles.listBody}>
        <View style={styles.listMeta}>
          <View style={styles.listDate}>
            <Ionicons name="calendar-outline" size={12} color="#8A5A14" />
            <Text style={styles.listDateText}>{date(article.publishedDate)}</Text>
          </View>
        </View>

        <Text style={styles.listTitle} numberOfLines={3}>
          {article.title}
        </Text>
        <Text style={styles.listSummary} numberOfLines={3}>
          {article.summary}
        </Text>

        <View style={styles.readMore}>
          <Text style={styles.readMoreText}>{t('news.readMore')}</Text>
          <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={Brand.green} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  noImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.deep },

  /* carousel */
  carousel: { width: 270, height: 220, borderRadius: 28, overflow: 'hidden', backgroundColor: Brand.deep, justifyContent: 'space-between', padding: 14 },
  dateChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 13, backgroundColor: Brand.gold },
  dateChipText: { color: Brand.deep, fontSize: 11.5, fontWeight: '800' },
  carouselBody: { gap: 8, alignItems: 'flex-start' },
  carouselTitle: { color: Brand.white, fontSize: 16.5, lineHeight: 24, fontWeight: '800' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceText: { color: 'rgba(247,235,210,0.9)', fontSize: 11.5, fontWeight: '700' },

  seeAll: { width: 150, height: 220, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: Brand.mint, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(15,77,58,0.35)' },
  seeAllIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Brand.gold, alignItems: 'center', justifyContent: 'center' },
  seeAllText: { color: Brand.greenText, fontSize: 14.5, fontWeight: '800', textAlign: 'center', paddingHorizontal: 12 },

  /* featured */
  featured: { height: 270, borderRadius: 30, overflow: 'hidden', backgroundColor: Brand.deep, justifyContent: 'space-between', padding: 16 },
  latestBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: Brand.gold },
  latestText: { color: Brand.deep, fontSize: 12, fontWeight: '800' },
  featuredBody: { gap: 6, alignItems: 'flex-start' },
  featuredTitle: { color: Brand.white, fontSize: 21, lineHeight: 30, fontWeight: '800' },
  featuredSummary: { color: 'rgba(247,235,210,0.92)', fontSize: 13.5, lineHeight: 20 },
  featuredDate: { color: Brand.gold, fontSize: 12.5, fontWeight: '800' },

  /* list */
  listCard: { borderRadius: 26, overflow: 'hidden', backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line },
  listImage: { height: 168, backgroundColor: Brand.deep, overflow: 'hidden' },
  listBody: { gap: 8, padding: 16 },
  listMeta: { flexDirection: 'row', alignItems: 'center' },
  listDate: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, backgroundColor: '#FFF4D9' },
  listDateText: { color: '#8A5A14', fontSize: 11.5, fontWeight: '800' },
  listTitle: { color: Brand.greenText, fontSize: 17, lineHeight: 25, fontWeight: '800' },
  listSummary: { color: Brand.muted, fontSize: 13.5, lineHeight: 21 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  readMoreText: { color: Brand.green, fontSize: 14, fontWeight: '800' },
});
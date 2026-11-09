import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/config';
import {
  fetchRecommendations,
  fetchRecommendationsBySeason,
  fetchRecommendationsByActivity,
  localizedTitle,
  localizedDescription,
  type Recommendation,
} from '@/api/recommendations';

const COLORS = {
  forest: '#123D30',
  forestDeep: '#092B22',
  forestSoft: '#EAF1EC',
  gold: '#C69A52',
  paper: '#F7F8F5',
  white: '#FFFFFF',
  ink: '#18372D',
  body: '#65756D',
  muted: '#8D9992',
  line: '#E7ECE8',
  chip: '#F1F4F1',
};

const SEASONS = [
  { key: 'all', ar: 'كل المواسم', en: 'All seasons', color: '#9AA69F' },
  { key: 'spring', ar: 'الربيع', en: 'Spring', color: '#8DBD9B' },
  { key: 'summer', ar: 'الصيف', en: 'Summer', color: '#E6B84E' },
  { key: 'autumn', ar: 'الخريف', en: 'Autumn', color: '#D99569' },
  { key: 'winter', ar: 'الشتاء', en: 'Winter', color: '#8DB9D8' },
] as const;

const ACTIVITIES = [
  { key: 'All', ar: 'الكل', en: 'All' },
  { key: 'Nature', ar: 'طبيعة', en: 'Nature' },
  { key: 'Cultural', ar: 'ثقافي', en: 'Cultural' },
  { key: 'Religious', ar: 'ديني', en: 'Religious' },
  { key: 'Adventure', ar: 'مغامرة', en: 'Adventure' },
  { key: 'Heritage', ar: 'تراث', en: 'Heritage' },
  { key: 'History', ar: 'تاريخ', en: 'History' },
  { key: 'Seaside', ar: 'بحري', en: 'Seaside' },
  { key: 'Food', ar: 'طعام', en: 'Food' },
] as const;

function getSeasonMeta(season: string | null | undefined) {
  const key = (season ?? 'all').toLowerCase();
  return SEASONS.find((item) => item.key === key) ?? SEASONS[0];
}

function getActivityMeta(activity: string | null | undefined) {
  const key = (activity ?? 'All').toLowerCase();
  return ACTIVITIES.find((item) => item.key.toLowerCase() === key) ?? ACTIVITIES[0];
}

export default function RecommendationsScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language?.startsWith('ar') ?? true;
  const lang: 'ar' | 'en' = isArabic ? 'ar' : 'en';

  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('All');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);

    try {
      let result: Recommendation[];

      if (selectedSeason !== 'all') {
        const backendSeason =
          selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1);
        result = await fetchRecommendationsBySeason(backendSeason);
      } else if (selectedActivity !== 'All') {
        result = await fetchRecommendationsByActivity(selectedActivity);
      } else {
        result = await fetchRecommendations();
      }

      if (currentRequest === requestId.current) {
        setRecommendations(result);
      }
    } catch {
      if (currentRequest === requestId.current) {
        setError(true);
        setRecommendations([]);
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [selectedSeason, selectedActivity]);

  useEffect(() => {
    fetchData();
    return () => {
      requestId.current += 1;
    };
  }, [fetchData]);

  const chooseSeason = (season: string) => {
    setSelectedSeason(season);
    setSelectedActivity('All');
  };

  const chooseActivity = (activity: string) => {
    setSelectedActivity(activity);
    setSelectedSeason('all');
  };

  const renderSeasonFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {SEASONS.map((season) => {
        const active = selectedSeason === season.key;
        return (
          <Pressable
            key={season.key}
            onPress={() => chooseSeason(season.key)}
            style={({ pressed }) => [
              styles.seasonChip,
              active && styles.seasonChipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <View style={[styles.seasonDot, { backgroundColor: season.color }]} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {isArabic ? season.ar : season.en}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderActivityFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {ACTIVITIES.map((activity) => {
        const active = selectedActivity === activity.key;
        return (
          <Pressable
            key={activity.key}
            onPress={() => chooseActivity(activity.key)}
            style={({ pressed }) => [
              styles.activityChip,
              active && styles.activityChipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.activityChipTextActive]}>
              {isArabic ? activity.ar : activity.en}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderRecommendation = ({
    item,
    index,
  }: {
    item: Recommendation;
    index: number;
  }) => {
    const title = localizedTitle(item, lang);
    const description = localizedDescription(item, lang);
    const season = getSeasonMeta(item.season);
    const activity = getActivityMeta(item.activityType);
    
    // ✅ تم التبسيط: نستخدم رابط الصورة من الـ API، وإذا كان فارغاً نستخدم صورة افتراضية واحدة وأنيقة
    const imageSource = resolveMediaUrl(item.imageUrl) || require('@/assets/images/welcome/jerusalem.jpg');

    return (
      <Pressable
        onPress={() => router.push(`/recommendations/${item.id}`)}
        style={({ pressed }) => [
          styles.recommendationCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.imageFrame}>
          <Image
            source={imageSource}
            style={styles.recommendationImage}
            contentFit="cover"
            transition={350}
          />
          <LinearGradient
            colors={[
              'rgba(5,25,19,0.02)',
              'rgba(5,25,19,0.08)',
              'rgba(5,25,19,0.78)',
            ]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.imageTopRow}>
            <View style={styles.seasonBadge}>
              <View style={[styles.badgeDot, { backgroundColor: season.color }]} />
              <Text style={styles.seasonBadgeText}>
                {isArabic ? season.ar : season.en}
              </Text>
            </View>
            <View style={styles.imageIndex}>
              <Text style={styles.imageIndexText}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>
          </View>

          <View style={[styles.imageBottom, isArabic && styles.imageBottomRtl]}>
            <Text style={[styles.imageTitle, isArabic && styles.textRtl]} numberOfLines={2}>
              {title}
            </Text>
            {!!item.placeName && (
              <View style={[styles.placeNameRow, isArabic && styles.rowRtl]}>
                <Ionicons name="location-outline" size={13} color="#F3D69F" />
                <Text style={styles.placeNameText} numberOfLines={1}>
                  {item.placeName}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardDetails}>
          {!!description && (
            <Text
              style={[styles.cardDescription, isArabic && styles.textRtl]}
              numberOfLines={3}
            >
              {description}
            </Text>
          )}
          <View style={[styles.cardBottom, isArabic && styles.cardBottomRtl]}>
            <View style={[styles.activityLabel, isArabic && styles.rowRtl]}>
              <Ionicons name="compass-outline" size={15} color={COLORS.forest} />
              <Text style={styles.activityLabelText}>
                {isArabic ? activity.ar : activity.en}
              </Text>
            </View>
            <View style={[styles.discoverLink, isArabic && styles.rowRtl]}>
              <Text style={styles.discoverText}>
                {isArabic ? 'اكتشف التوصية' : 'Discover'}
              </Text>
              <Ionicons
                name={isArabic ? 'arrow-back' : 'arrow-forward'}
                size={16}
                color={COLORS.gold}
              />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View>
      <LinearGradient
        colors={[COLORS.forestDeep, COLORS.forest]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 22 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerKicker, isArabic && styles.textRtl]}>
              {isArabic ? 'دليلك لاكتشاف فلسطين' : 'YOUR PALESTINE GUIDE'}
            </Text>
            <Text style={[styles.headerTitle, isArabic && styles.textRtl]}>
              {isArabic ? 'توصيات روفايا' : 'ROVAYA Picks'}
            </Text>
            <Text style={[styles.headerSubtitle, isArabic && styles.textRtl]}>
              {isArabic
                ? 'أماكن وتجارب مختارة لتعيش فلسطين بطريقة مختلفة.'
                : 'Curated places and experiences to discover Palestine differently.'}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={25} color={COLORS.gold} />
          </View>
        </View>
        <View style={styles.headerAccent}>
          <View style={styles.headerAccentLine} />
          <Text style={styles.headerAccentText}>ROVAYA</Text>
        </View>
      </LinearGradient>

      <View style={styles.filtersPanel}>
        <View style={styles.filterHeading}>
          <View style={styles.filterHeadingCopy}>
            <Text style={[styles.filterTitle, isArabic && styles.textRtl]}>
              {isArabic ? 'اختر ما يناسب رحلتك' : 'Find your kind of trip'}
            </Text>
            <Text style={[styles.filterSubtitle, isArabic && styles.textRtl]}>
              {isArabic
                ? 'صفِّ النتائج حسب الموسم أو النشاط'
                : 'Filter by season or activity'}
            </Text>
          </View>
          <Ionicons name="options-outline" size={20} color={COLORS.gold} />
        </View>

        <Text style={[styles.filterLabel, isArabic && styles.textRtl]}>
          {isArabic ? 'الموسم' : 'SEASON'}
        </Text>
        {renderSeasonFilters()}

        <View style={styles.filterDivider} />

        <Text style={[styles.filterLabel, isArabic && styles.textRtl]}>
          {isArabic ? 'نوع التجربة' : 'EXPERIENCE TYPE'}
        </Text>
        {renderActivityFilters()}
      </View>

      <View style={styles.resultsHeading}>
        <View style={styles.resultsCopy}>
          <Text style={[styles.resultsTitle, isArabic && styles.textRtl]}>
            {isArabic ? 'تجارب ننصحك بها' : 'Recommended experiences'}
          </Text>
          <Text style={[styles.resultsSubtitle, isArabic && styles.textRtl]}>
            {isArabic
              ? 'اختر تجربة وابدأ التخطيط'
              : 'Choose an experience and start exploring'}
          </Text>
        </View>
        {!loading && !error && (
          <View style={styles.resultsCount}>
            <Text style={styles.resultsCountText}>{recommendations.length}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const bottomPadding = Math.max(insets.bottom, 16) + 20;

  return (
    <View style={styles.container}>
      {loading ? (
        <FlatList
          data={[]}
          renderItem={renderRecommendation}
          ListHeaderComponent={
            <>
              {listHeader}
              <View style={styles.stateContainer}>
                <ActivityIndicator size="large" color={COLORS.forest} />
                <Text style={styles.stateText}>
                  {isArabic
                    ? 'نبحث لك عن تجارب مميزة...'
                    : 'Finding experiences for you...'}
                </Text>
              </View>
            </>
          }
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        />
      ) : error ? (
        <FlatList
          data={[]}
          renderItem={renderRecommendation}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={30}
                  color={COLORS.forest}
                />
              </View>
              <Text style={styles.stateTitle}>
                {isArabic
                  ? 'تعذر تحميل التوصيات'
                  : 'Could not load recommendations'}
              </Text>
              <Text style={styles.stateText}>
                {isArabic
                  ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى.'
                  : 'Check your connection and try again.'}
              </Text>
              <Pressable onPress={fetchData} style={styles.retryButton}>
                <Ionicons name="refresh" size={16} color={COLORS.white} />
                <Text style={styles.retryButtonText}>
                  {isArabic ? 'إعادة المحاولة' : 'Try again'}
                </Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="compass-outline"
                  size={32}
                  color={COLORS.forest}
                />
              </View>
              <Text style={styles.stateTitle}>
                {isArabic
                  ? 'لا توجد توصيات لهذا الاختيار'
                  : 'No recommendations found'}
              </Text>
              <Text style={styles.stateText}>
                {isArabic
                  ? 'جرّب اختيار موسم أو نوع تجربة آخر.'
                  : 'Try choosing another season or experience type.'}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedSeason('all');
                  setSelectedActivity('All');
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>
                  {isArabic ? 'عرض الكل' : 'Show all'}
                </Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  header: {
    paddingHorizontal: 23,
    paddingBottom: 23,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  headerCopy: {
    flex: 1,
  },
  headerKicker: {
    color: '#D7B879',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
    marginBottom: 7,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    lineHeight: 20,
    maxWidth: 290,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  headerAccentLine: {
    width: 27,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  headerAccentText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  filtersPanel: {
    marginTop: 15,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 17,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  filterHeadingCopy: {
    flex: 1,
  },
  filterTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  filterSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  filterLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 9,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 3,
  },
  seasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seasonChipActive: {
    backgroundColor: '#F5F7F4',
    borderColor: COLORS.forest,
  },
  seasonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activityChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityChipActive: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  chipText: {
    color: COLORS.body,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.forest,
    fontWeight: '900',
  },
  activityChipTextActive: {
    color: COLORS.white,
    fontWeight: '900',
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  filterDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 15,
  },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 21,
    marginTop: 25,
    marginBottom: 1,
  },
  resultsCopy: {
    flex: 1,
  },
  resultsTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  resultsSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  resultsCount: {
    minWidth: 31,
    height: 31,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: COLORS.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsCountText: {
    color: COLORS.forest,
    fontSize: 12,
    fontWeight: '900',
  },
  recommendationCard: {
    marginHorizontal: 17,
    marginTop: 15,
    backgroundColor: COLORS.white,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: '#18372D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  imageFrame: {
    height: 218,
    position: 'relative',
    backgroundColor: COLORS.forestSoft,
  },
  recommendationImage: {
    width: '100%',
    height: '100%',
  },
  imageTopRow: {
    position: 'absolute',
    top: 13,
    left: 13,
    right: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  seasonBadgeText: {
    color: COLORS.forest,
    fontSize: 10,
    fontWeight: '800',
  },
  imageIndex: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,38,29,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  imageIndexText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  imageBottom: {
    position: 'absolute',
    bottom: 17,
    left: 17,
    right: 17,
    alignItems: 'flex-start',
  },
  imageBottomRtl: {
    alignItems: 'flex-end',
  },
  imageTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 29,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  placeNameText: {
    color: '#F5E7C9',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetails: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 15,
  },
  cardDescription: {
    color: COLORS.body,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'left',
  },
  textRtl: {
    textAlign: 'right',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  cardBottomRtl: {
    flexDirection: 'row-reverse',
  },
  activityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.forestSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  activityLabelText: {
    color: COLORS.forest,
    fontSize: 10,
    fontWeight: '800',
  },
  discoverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discoverText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 42,
    gap: 12,
  },
  stateIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  stateTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 5,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  resetButton: {
    marginTop: 5,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/config';
import { fetchAllCities } from '@/api/guide';
import type { City } from '@/api/types';

const COLORS = {
  green: '#0B3A2B',
  greenDeep: '#082D22',
  greenLight: '#14523F',
  greenSoft: '#E8F1EC',
  gold: '#EFB443',
  background: '#F5F8F6',
  white: '#FFFFFF',
  text: '#153D30',
  muted: '#84968D',
  border: '#E5ECE8',
  danger: '#B84B4B',
};

export default function AllCitiesScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isArabic = i18n.language?.startsWith('ar') ?? false;
  const lang = isArabic ? 'ar' : 'en';
  const cardWidth = (screenWidth - 54) / 2;

  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadCities = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    try {
      const data = await fetchAllCities(lang);
      setCities(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang]);

  useEffect(() => {
    loadCities();
  }, [loadCities, reloadKey]);

  const cityCountLabel = useMemo(() => {
    if (isArabic) return `${cities.length} ${cities.length === 1 ? 'مدينة' : 'مدن'}`;
    return `${cities.length} ${cities.length === 1 ? 'city' : 'cities'}`;
  }, [cities.length, isArabic]);

  const renderCityCard = ({ item, index }: { item: City; index: number }) => {
    const name = isArabic ? item.name : item.nameEn || item.name;
    const description = isArabic ? item.description : item.descriptionEn || item.description;
    const imageUrl = resolveMediaUrl(item.imageUrl);

    return (
      <Pressable
        onPress={() => router.push(`/guide/city/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          { width: cardWidth },
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${isArabic ? 'استكشف المدينة' : 'Explore city'}`}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.imageUnavailable}>
              <Ionicons name="image-outline" size={30} color={COLORS.muted} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(4,24,17,0.02)', 'rgba(4,24,17,0.12)', 'rgba(4,24,17,0.82)']}
            locations={[0, 0.42, 1]}
            style={styles.imageGradient}
          />
          <View style={styles.imageTopRow}>
            <View style={styles.cityNumber}>
              <Text style={styles.cityNumberText}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
            <View style={styles.imageArrow}>
              <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={15} color={COLORS.white} />
            </View>
          </View>
          <Text style={styles.cityName} numberOfLines={2}>{name}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cityDesc} numberOfLines={2}>
            {description || (isArabic ? 'اكتشف تفاصيل هذه المدينة ومعالمها' : 'Discover this city and its remarkable places')}
          </Text>
          <View style={[styles.cardFooter, isArabic && styles.cardFooterRtl]}>
            <Text style={styles.exploreText}>{isArabic ? 'اكتشف المدينة' : 'Discover city'}</Text>
            <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={14} color={COLORS.gold} />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.greenLight, COLORS.greenDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
        <View style={[styles.navigationRow, isArabic && styles.navigationRowRtl]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isArabic ? 'رجوع' : 'Go back'}
          >
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={21} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerEyebrow}>
            <View style={styles.headerEyebrowDot} />
            <Text style={styles.headerEyebrowText}>{isArabic ? 'دليلك السياحي' : 'YOUR TRAVEL GUIDE'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.headingBlock, isArabic && styles.headingBlockRtl]}>
          <Text style={[styles.headerTitle, isArabic && styles.textRtl]}>
            {isArabic ? 'اكتشف مدن فلسطين' : 'Explore Palestinian Cities'}
          </Text>
          <Text style={[styles.headerSubtitle, isArabic && styles.textRtl]}>
            {isArabic ? 'وجهات تحكي حكاية المكان وتفاصيله' : 'Places filled with stories, culture and unforgettable details'}
          </Text>
        </View>

        <View style={[styles.headerBottomRow, isArabic && styles.headerBottomRowRtl]}>
          <View style={styles.headerAccentLine} />
          <Text style={styles.headerHint}>{isArabic ? 'من الشمال إلى الجنوب' : 'From north to south'}</Text>
          <Ionicons name="compass-outline" size={16} color={COLORS.gold} />
        </View>
      </View>
      <View style={styles.headerDecorCircle} />
      <View style={styles.headerDecorCircleSmall} />
    </LinearGradient>
  );

  const renderLoading = () => (
    <View style={styles.stateContainer}>
      <View style={styles.stateIconCircle}><ActivityIndicator size="large" color={COLORS.green} /></View>
      <Text style={styles.stateTitle}>{isArabic ? 'نجهّز لك المدن...' : 'Getting the cities ready...'}</Text>
      <Text style={styles.stateDescription}>{isArabic ? 'لحظات ونأخذك في جولة بين المدن' : 'Just a moment, your city guide is on its way'}</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.stateContainer}>
      <View style={styles.stateIconCircle}><Ionicons name="cloud-offline-outline" size={34} color={COLORS.danger} /></View>
      <Text style={styles.stateTitle}>{isArabic ? 'لم نتمكن من تحميل المدن' : 'Could not load the cities'}</Text>
      <Text style={styles.stateDescription}>
        {isArabic ? 'تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.' : 'Check your internet connection and try again.'}
      </Text>
      <Pressable
        onPress={() => setReloadKey((value) => value + 1)}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
      >
        <Ionicons name="refresh" size={16} color={COLORS.white} />
        <Text style={styles.retryText}>{isArabic ? 'إعادة المحاولة' : 'Try again'}</Text>
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.stateContainer}>
      <View style={styles.stateIconCircle}><Ionicons name="map-outline" size={36} color={COLORS.greenLight} /></View>
      <Text style={styles.stateTitle}>{isArabic ? 'لا توجد مدن مضافة حالياً' : 'No cities available yet'}</Text>
      <Text style={styles.stateDescription}>
        {isArabic ? 'ستظهر المدن هنا عند إضافتها إلى الدليل السياحي.' : 'Cities will appear here once they are added to the travel guide.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {loading ? renderLoading() : error ? renderError() : cities.length === 0 ? renderEmpty() : (
        <FlatList
          data={cities}
          renderItem={renderCityCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadCities(true)} tintColor={COLORS.green} colors={[COLORS.green]} />
          }
          ListHeaderComponent={
            <View style={[styles.listIntro, isArabic && styles.listIntroRtl]}>
              <View>
                <Text style={[styles.sectionTitle, isArabic && styles.textRtl]}>{isArabic ? 'مدن تستحق الزيارة' : 'Cities worth discovering'}</Text>
                <Text style={[styles.sectionSubtitle, isArabic && styles.textRtl]}>{isArabic ? 'اختر مدينة وابدأ رحلتك' : 'Choose a city and start exploring'}</Text>
              </View>
              <View style={styles.countPill}>
                <Ionicons name="location-outline" size={14} color={COLORS.green} />
                <Text style={styles.countText}>{cityCountLabel}</Text>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingBottom: 25,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: { paddingHorizontal: 20, zIndex: 2 },
  navigationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  navigationRowRtl: { flexDirection: 'row-reverse' },
  backButton: {
    width: 42, height: 42, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  backButtonPressed: { backgroundColor: 'rgba(255,255,255,0.23)', transform: [{ scale: 0.96 }] },
  headerEyebrow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  headerEyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  headerEyebrowText: { color: 'rgba(255,255,255,0.78)', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  headerSpacer: { width: 42 },
  headingBlock: { marginTop: 26, alignItems: 'flex-start' },
  headingBlockRtl: { alignItems: 'flex-end' },
  headerTitle: { color: COLORS.white, fontSize: 29, lineHeight: 38, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 21, marginTop: 7, maxWidth: 290 },
  textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  headerBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 21 },
  headerBottomRowRtl: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  headerAccentLine: { width: 24, height: 2, borderRadius: 2, backgroundColor: COLORS.gold },
  headerHint: { color: 'rgba(255,255,255,0.76)', fontSize: 11, fontWeight: '700' },
  headerDecorCircle: {
    position: 'absolute', width: 190, height: 190, borderRadius: 95,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', right: -75, top: 25,
  },
  headerDecorCircleSmall: {
    position: 'absolute', width: 115, height: 115, borderRadius: 58,
    borderWidth: 1, borderColor: 'rgba(239,180,67,0.13)', right: -38, top: 62,
  },
  listContent: { paddingTop: 3 },
  listIntro: {
    paddingHorizontal: 20, paddingTop: 23, paddingBottom: 5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  listIntroRtl: { flexDirection: 'row-reverse' },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  sectionSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.greenSoft,
  },
  countText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 19, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.greenDeep, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, marginBottom: 2,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.975 }] },
  imageContainer: { height: 158, position: 'relative', backgroundColor: '#E8EEEA' },
  image: { width: '100%', height: '100%' },
  imageUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EFEB' },
  imageGradient: { ...StyleSheet.absoluteFillObject },
  imageTopRow: {
    position: 'absolute', top: 10, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cityNumber: {
    minWidth: 27, height: 25, paddingHorizontal: 7, borderRadius: 9,
    backgroundColor: 'rgba(7,37,27,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  cityNumberText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  imageArrow: {
    width: 29, height: 29, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center',
  },
  cityName: {
    position: 'absolute', bottom: 13, left: 12, right: 12, color: COLORS.white,
    fontSize: 17, lineHeight: 23, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  cardBody: { minHeight: 99, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 12, justifyContent: 'space-between' },
  cityDesc: { color: COLORS.muted, fontSize: 11, lineHeight: 17, minHeight: 34 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F3F1' },
  cardFooterRtl: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  exploreText: { color: COLORS.green, fontSize: 11, fontWeight: '900' },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 38, paddingBottom: 35 },
  stateIconCircle: {
    width: 76, height: 76, borderRadius: 25, backgroundColor: COLORS.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  stateTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  stateDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 270 },
  retryButton: {
    marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.green, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 13,
  },
  retryButtonPressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
  retryText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
});

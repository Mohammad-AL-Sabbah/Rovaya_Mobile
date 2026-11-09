import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { resolveMediaUrl } from '@/api/config';
import { fetchCities } from '@/api/guide';
import { useAsync } from '@/hooks/use-async';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 20;
const CARD_GAP = 14;
const CARD_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const HERO_HEIGHT = 205;
const CAROUSEL_INTERVAL = 5000;

const HERO_IMAGES = [
  require('@/assets/images/welcome/jerusalem.jpg'),
  require('@/assets/images/welcome/jaffa.jpg'),
  require('@/assets/images/welcome/acre.jpg'),
  require('@/assets/images/welcome/bethlehem.jpg'),
];

const COLORS = {
  green: '#0B3A2B',
  greenLight: '#14523F',
  greenSoft: '#E5F1EB',
  gold: '#EFB443',
  background: '#F6F9F7',
  white: '#FFFFFF',
  text: '#153D30',
  muted: '#84968D',
  border: '#E7EEEA',
};

export default function CategoryCitiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language === 'ar' ? 'ar' : 'en';
  const isArabic = currentLang === 'ar';

  const { data: cities, loading, error, reload } = useAsync(
    () => fetchCities(Number(id), currentLang),
    `category-cities-${id}`,
    [id, currentLang],
  );

  // Functional hero carousel: auto-advances and also supports manual swiping.
  const carouselRef = useRef<FlatList<number>>(null);
  const carouselIndexRef = useRef(0);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (carouselIndexRef.current + 1) % HERO_IMAGES.length;
      carouselIndexRef.current = nextIndex;
      setActiveSlide(nextIndex);
      carouselRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  const handleCarouselScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    const safeIndex = Math.max(0, Math.min(nextIndex, HERO_IMAGES.length - 1));

    carouselIndexRef.current = safeIndex;
    setActiveSlide(safeIndex);
  };

  const cityCount = cities?.length ?? 0;

  return (
    <View style={styles.container}>
      {/* HERO / AUTO CAROUSEL */}
      <View style={styles.hero}>
        <FlatList
          ref={carouselRef}
          data={HERO_IMAGES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          keyExtractor={(_, index) => `hero-image-${index}`}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={handleCarouselScrollEnd}
          renderItem={({ item }) => (
            <View style={styles.heroSlide}>
              <Image
                source={item}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={450}
              />
            </View>
          )}
        />

        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(5,35,28,0.18)',
            'rgba(5,35,28,0.48)',
            'rgba(5,35,28,0.94)',
          ]}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.heroContent} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isArabic ? 'رجوع' : 'Go back'}
            >
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={21}
                color={COLORS.white}
              />
            </Pressable>

            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>ROVAYA</Text>
              <View style={styles.brandDot} />
            </View>
          </View>

          <View style={styles.heroTextContainer} pointerEvents="none">
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrowText}>
                {isArabic ? 'اكتشف فلسطين' : 'DISCOVER PALESTINE'}
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              {t('home.guide.categoryCitiesTitle')}
            </Text>

            <Text style={styles.heroSubtitle}>
              {isArabic
                ? 'اكتشف المدن الفلسطينية، واحصل على تجربة لا تُنسى.'
                : 'Explore Palestinian cities and discover unforgettable experiences.'}
            </Text>

            <View style={styles.pagination}>
              {HERO_IMAGES.map((_, index) => (
                <View
                  key={`hero-dot-${index}`}
                  style={[
                    styles.paginationDot,
                    activeSlide === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>
              {isArabic ? 'مدن تستحق الزيارة' : 'Cities to explore'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isArabic
                ? 'كل مدينة تحكي حكاية مختلفة'
                : 'Every city has a story to tell'}
            </Text>
          </View>

          {!loading && !error && (
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{cityCount}</Text>
              <Text style={styles.countLabel}>
                {isArabic ? 'مدينة' : 'Cities'}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonContent}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonDescription} />
                  <View style={styles.skeletonDescriptionShort} />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={34}
                color={COLORS.green}
              />
            </View>
            <Text style={styles.stateTitle}>
              {isArabic ? 'تعذر تحميل المدن' : 'Unable to load cities'}
            </Text>
            <Text style={styles.stateDescription}>
              {t('home.guide.loadError')}
            </Text>
            <Pressable onPress={reload} style={styles.retryButton}>
              <Ionicons name="refresh" size={17} color={COLORS.white} />
              <Text style={styles.retryText}>{t('home.guide.retry')}</Text>
            </Pressable>
          </View>
        ) : !cities || cities.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="map-outline"
                size={36}
                color={COLORS.green}
              />
            </View>
            <Text style={styles.stateTitle}>
              {isArabic ? 'لا توجد مدن حالياً' : 'No cities available'}
            </Text>
            <Text style={styles.stateDescription}>
              {t('home.guide.noCitiesFound')}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {cities.map((city, index) => (
              <Pressable
                key={city.id}
                onPress={() => router.push(`/guide/city/${city.id}`)}
                style={({ pressed }) => [
                  styles.cityCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cityImageContainer}>
                  <Image
                    source={
                      resolveMediaUrl(city.imageUrl) ||
                      require('@/assets/images/welcome/jerusalem.jpg')
                    }
                    style={styles.cityImage}
                    contentFit="cover"
                    transition={350}
                  />

                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(4,29,22,0.12)',
                      'rgba(4,29,22,0.88)',
                    ]}
                    locations={[0, 0.45, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />

                  <View style={styles.cityNumber}>
                    <Text style={styles.cityNumberText}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>

                  {city.categoryNames?.length > 0 && (
                    <View style={styles.categoryBadge}>
                      <View style={styles.categoryDot} />
                      <Text
                        style={styles.categoryBadgeText}
                        numberOfLines={1}
                      >
                        {city.categoryNames[0]}
                      </Text>
                    </View>
                  )}

                  <View style={styles.imageTitleContainer}>
                    <Text style={styles.imageCityName} numberOfLines={1}>
                      {city.name}
                    </Text>
                    <View style={styles.imageTitleLine} />
                  </View>
                </View>

                <View style={styles.cityInfo}>
                  <Text style={styles.cityDesc} numberOfLines={2}>
                    {city.description || t('home.guide.exploreCities')}
                  </Text>

                  <View style={styles.cardDivider} />

                  <View style={styles.exploreRow}>
                    <Text style={styles.exploreText}>
                      {t('home.guide.exploreDetails')}
                    </Text>
                    <View style={styles.exploreIcon}>
                      <Ionicons
                        name={isArabic ? 'arrow-back' : 'arrow-forward'}
                        size={15}
                        color={COLORS.green}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loading && !error && cityCount > 0 && (
          <View style={styles.bottomMessage}>
            <View style={styles.bottomIcon}>
              <Ionicons
                name="compass-outline"
                size={22}
                color={COLORS.gold}
              />
            </View>
            <Text style={styles.bottomMessageText}>
              {isArabic
                ? 'رحلتك القادمة تبدأ من هنا'
                : 'Your next journey starts here'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.green,
  },
  heroSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 48,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  brandText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
  heroTextContainer: {
    paddingBottom: 13,
    alignItems: 'flex-start',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },
  eyebrowLine: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  eyebrowText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'left',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 11,
    lineHeight: 18,
    maxWidth: '94%',
    textAlign: 'left',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: COLORS.gold,
  },

  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 27,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 21,
  },
  sectionTitleGroup: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'left',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'left',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 30,
    marginLeft: 10,
  },
  countNumber: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
  },
  countLabel: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 17,
  },
  cityCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#143F30',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  cityImageContainer: {
    height: 155,
    position: 'relative',
    backgroundColor: COLORS.greenSoft,
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityNumber: {
    position: 'absolute',
    top: 11,
    left: 11,
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,45,33,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cityNumberText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  categoryBadge: {
    position: 'absolute',
    top: 11,
    right: 10,
    maxWidth: '75%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  categoryBadgeText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
  },
  imageTitleContainer: {
    position: 'absolute',
    bottom: 13,
    left: 13,
    right: 13,
    alignItems: 'flex-start',
  },
  imageCityName: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'left',
  },
  imageTitleLine: {
    width: 27,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 7,
  },
  cityInfo: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 11,
  },
  cityDesc: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'left',
    minHeight: 36,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 10,
    marginBottom: 9,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exploreText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  exploreIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeletonCard: {
    width: CARD_WIDTH,
    height: 245,
    backgroundColor: COLORS.white,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonImage: {
    height: 155,
    backgroundColor: '#E5ECE8',
  },
  skeletonContent: {
    padding: 13,
    gap: 9,
  },
  skeletonTitle: {
    height: 13,
    width: '65%',
    borderRadius: 5,
    backgroundColor: '#E5ECE8',
  },
  skeletonDescription: {
    height: 8,
    width: '95%',
    borderRadius: 5,
    backgroundColor: '#EEF2EF',
  },
  skeletonDescriptionShort: {
    height: 8,
    width: '65%',
    borderRadius: 5,
    backgroundColor: '#EEF2EF',
  },

  stateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateIcon: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  stateTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateDescription: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  bottomMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: COLORS.green,
  },
  bottomIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomMessageText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});

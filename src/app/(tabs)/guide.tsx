
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAsync } from '@/hooks/use-async';
import { fetchCategories } from '@/api/guide';
import { resolveMediaUrl } from '@/api/config';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

const HERO_IMAGES = [
  require('@/assets/images/welcome/jerusalem.jpg'),
  require('@/assets/images/welcome/jaffa.jpg'),
  require('@/assets/images/welcome/acre.jpg'),
  require('@/assets/images/welcome/bethlehem.jpg'),
];

export default function GuideScreen() {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language === 'ar' ? 'ar' : 'en';
  const isArabic = currentLang === 'ar';

  // ================= CAROUSEL =================

  const carouselRef = useRef<ScrollView>(null);
  const currentSlideRef = useRef(0);

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide =
        (currentSlideRef.current + 1) % HERO_IMAGES.length;

      currentSlideRef.current = nextSlide;
      setActiveSlide(nextSlide);

      carouselRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        y: 0,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ================= FETCH CATEGORIES =================

  const {
    data: categories,
    loading,
    error,
    reload,
  } = useAsync(
    () => fetchCategories(currentLang),
    'guide-categories',
    [currentLang]
  );

  const categoryCount = categories?.length ?? 0;

  // ================= RENDER =================

  return (
    <View style={styles.container}>

      {/* ================= HERO CAROUSEL ================= */}

      <View style={styles.hero}>

        {/* Background Images */}

        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={StyleSheet.absoluteFillObject}
        >
          {HERO_IMAGES.map((image, index) => (
            <Image
              key={index}
              source={image}
              style={styles.heroImage}
              contentFit="cover"
              transition={500}
            />
          ))}
        </ScrollView>

        {/* Dark Overlay */}

        <LinearGradient
          colors={[
            'rgba(4,29,23,0.25)',
            'rgba(4,29,23,0.48)',
            'rgba(4,29,23,0.94)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header Content */}

        <View style={styles.heroContent}>

          {/* Top Bar */}

          <View style={styles.topBar}>

            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>ROVAYA</Text>
              <View style={styles.brandDot} />
            </View>

            <View style={styles.guideBadge}>
              <Ionicons
                name="compass-outline"
                size={15}
                color={COLORS.white}
              />

              <Text style={styles.guideBadgeText}>
                {isArabic ? 'دليلك السياحي' : 'TRAVEL GUIDE'}
              </Text>
            </View>

          </View>

          {/* Hero Text */}

          <View
            style={[
              styles.heroTextContainer,
              {
                alignItems: isArabic ? 'flex-end' : 'flex-start',
              },
            ]}
          >

            <View
              style={[
                styles.eyebrow,
                {
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={styles.eyebrowLine} />

              <Text style={styles.eyebrowText}>
                {isArabic ? 'اكتشف فلسطين' : 'DISCOVER PALESTINE'}
              </Text>
            </View>

            <Text
              style={[
                styles.heroTitle,
                {
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {t('home.guide.title')}
            </Text>

            <Text
              style={[
                styles.heroSubtitle,
                {
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {t('home.guide.text')}
            </Text>

            {/* Carousel Indicators */}

            <View
              style={[
                styles.heroDots,
                {
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                },
              ]}
            >
              {HERO_IMAGES.map((_, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    currentSlideRef.current = index;
                    setActiveSlide(index);

                    carouselRef.current?.scrollTo({
                      x: index * SCREEN_WIDTH,
                      y: 0,
                      animated: true,
                    });
                  }}
                  hitSlop={8}
                  style={[
                    styles.carouselDot,
                    activeSlide === index &&
                      styles.carouselDotActive,
                  ]}
                />
              ))}
            </View>

          </View>

        </View>
      </View>

      {/* ================= MAIN CONTENT ================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ================= ALL CITIES CARD ================= */}

        <Pressable
          onPress={() => router.push('/guide/all-cities')}
          style={({ pressed }) => [
            styles.allCitiesCard,
            pressed && styles.cardPressed,
          ]}
        >

          <LinearGradient
            colors={[COLORS.greenLight, COLORS.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.allCitiesGradient,
              {
                flexDirection: isArabic ? 'row-reverse' : 'row',
              },
            ]}
          >

            {/* Decorative Elements */}

            <View style={styles.decorativeCircle} />
            <View style={styles.decorativeCircleSmall} />

            {/* Icon */}

            <View style={styles.allCitiesIcon}>
              <Ionicons
                name="map-outline"
                size={26}
                color={COLORS.green}
              />
            </View>

            {/* Text */}

            <View style={styles.allCitiesInfo}>

              <Text
                style={[
                  styles.allCitiesTitle,
                  {
                    textAlign: isArabic ? 'right' : 'left',
                  },
                ]}
              >
                {t('home.guide.showAllCities')}
              </Text>

              <Text
                style={[
                  styles.allCitiesSubtitle,
                  {
                    textAlign: isArabic ? 'right' : 'left',
                  },
                ]}
              >
                {t('home.guide.showAllCitiesSubtitle')}
              </Text>

            </View>

            {/* Arrow */}

            <View style={styles.allCitiesArrow}>
              <Ionicons
                name={isArabic ? 'arrow-back' : 'arrow-forward'}
                size={20}
                color={COLORS.white}
              />
            </View>

          </LinearGradient>
        </Pressable>

        {/* ================= SECTION HEADER ================= */}

        <View
          style={[
            styles.sectionHeader,
            {
              flexDirection: isArabic ? 'row-reverse' : 'row',
            },
          ]}
        >

          <View
            style={[
              styles.sectionTitleGroup,
              {
                alignItems: isArabic ? 'flex-end' : 'flex-start',
              },
            ]}
          >

            <Text
              style={[
                styles.sectionTitle,
                {
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {t('home.guide.browseByCategory')}
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {isArabic
                ? 'اختر اهتمامك وانطلق في رحلة الاكتشاف'
                : 'Choose your interest and start exploring'}
            </Text>

          </View>

          {!loading && !error && (
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>
                {categoryCount}
              </Text>

              <Text style={styles.countLabel}>
                {isArabic ? 'تصنيف' : 'Categories'}
              </Text>
            </View>
          )}

        </View>

        {/* ================= LOADING ================= */}

        {loading ? (

          <View style={styles.categoriesList}>

            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />

                <View style={styles.skeletonContent}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonDescription} />
                </View>
              </View>
            ))}

          </View>

        ) : error ? (

          /* ================= ERROR ================= */

          <View style={styles.stateCard}>

            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={34}
                color={COLORS.green}
              />
            </View>

            <Text style={styles.stateTitle}>
              {isArabic
                ? 'تعذر تحميل التصنيفات'
                : 'Unable to load categories'}
            </Text>

            <Text style={styles.stateDescription}>
              {t('home.guide.loadError')}
            </Text>

            <Pressable
              onPress={reload}
              style={styles.retryButton}
            >
              <Ionicons
                name="refresh"
                size={17}
                color={COLORS.white}
              />

              <Text style={styles.retryText}>
                {t('home.guide.retry')}
              </Text>
            </Pressable>

          </View>

        ) : !categories || categories.length === 0 ? (

          /* ================= EMPTY STATE ================= */

          <View style={styles.stateCard}>

            <View style={styles.stateIcon}>
              <Ionicons
                name="grid-outline"
                size={35}
                color={COLORS.green}
              />
            </View>

            <Text style={styles.stateTitle}>
              {t('home.guide.noCategories')}
            </Text>

          </View>

        ) : (

          /* ================= CATEGORIES ================= */

          <View style={styles.categoriesList}>

            {categories.map((cat, index) => (

              <Pressable
                key={cat.id}
                onPress={() =>
                  router.push(`/guide/categories/${cat.id}`)
                }
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && styles.cardPressed,
                ]}
              >

                {/* Category Image */}

                <Image
                  source={
                    resolveMediaUrl(cat.imageUrl) ||
                    require('@/assets/images/welcome/jerusalem.jpg')
                  }
                  style={styles.categoryImage}
                  contentFit="cover"
                  transition={350}
                />

                {/* Image Overlay */}

                <LinearGradient
                  colors={[
                    'rgba(4,29,23,0.05)',
                    'rgba(4,29,23,0.25)',
                    'rgba(4,29,23,0.94)',
                  ]}
                  locations={[0, 0.4, 1]}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* Category Number */}

                <View
                  style={[
                    styles.categoryNumber,
                    isArabic
                      ? { right: 15, left: undefined }
                      : null,
                  ]}
                >
                  <Text style={styles.categoryNumberText}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>

                {/* Category Content */}

                <View
                  style={[
                    styles.categoryContent,
                    {
                      alignItems: isArabic
                        ? 'flex-end'
                        : 'flex-start',
                    },
                  ]}
                >

                  <View
                    style={[
                      styles.categoryTitleRow,
                      {
                        flexDirection: isArabic
                          ? 'row-reverse'
                          : 'row',
                      },
                    ]}
                  >

                    <View style={styles.categoryTitleAccent} />

                    <Text
                      style={styles.categoryName}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>

                  </View>

                  <Text
                    style={[
                      styles.categoryDesc,
                      {
                        textAlign: isArabic ? 'right' : 'left',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {cat.description ||
                      t('home.guide.exploreCities')}
                  </Text>

                  {/* Explore Action */}

                  <View
                    style={[
                      styles.exploreRow,
                      {
                        flexDirection: isArabic
                          ? 'row-reverse'
                          : 'row',
                      },
                    ]}
                  >

                    <Text style={styles.exploreText}>
                      {t('home.guide.exploreDetails')}
                    </Text>

                    <View style={styles.exploreIcon}>
                      <Ionicons
                        name={
                          isArabic
                            ? 'arrow-back'
                            : 'arrow-forward'
                        }
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



        

        

      </ScrollView>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ================= HERO CAROUSEL =================

  hero: {
    height: 205,
    position: 'relative',
    overflow: 'hidden',
  },

  heroImage: {
    width: SCREEN_WIDTH,
    height: 205,
  },

  heroContent: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 48,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  brandText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },

  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  guideBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  heroTextContainer: {
    paddingBottom: 15,
  },

  eyebrow: {
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },

  eyebrowLine: {
    width: 23,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },

  eyebrowText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 5,
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    lineHeight: 18,
    maxWidth: '95%',
  },

  heroDots: {
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
  },

  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  carouselDotActive: {
    width: 21,
    height: 5,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },

  // ================= CONTENT =================

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 25,
  },

  // ================= ALL CITIES =================

  allCitiesCard: {
    borderRadius: 23,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.17,
    shadowRadius: 12,
  },

  allCitiesGradient: {
    minHeight: 115,
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 19,
    gap: 13,
    overflow: 'hidden',
  },

  decorativeCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -30,
  },

  decorativeCircleSmall: {
    position: 'absolute',
    width: 95,
    height: 95,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    bottom: -60,
    left: 60,
  },

  allCitiesIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  allCitiesInfo: {
    flex: 1,
    gap: 6,
  },

  allCitiesTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },

  allCitiesSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    lineHeight: 18,
  },

  allCitiesArrow: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardPressed: {
    opacity: 0.91,
    transform: [{ scale: 0.98 }],
  },

  // ================= SECTION HEADER =================

  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitleGroup: {
    flex: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
  },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.greenSoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 25,
    marginLeft: 10,
  },

  countNumber: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
  },

  countLabel: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
  },

  // ================= CATEGORIES =================

  categoriesList: {
    gap: 16,
  },

  categoryCard: {
    height: 190,
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.green,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },

  categoryImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  categoryNumber: {
    position: 'absolute',
    top: 14,
    left: 15,
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: 'rgba(8,45,33,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  categoryContent: {
    position: 'absolute',
    bottom: 16,
    left: 17,
    right: 17,
  },

  categoryTitleRow: {
    alignItems: 'center',
    gap: 9,
    marginBottom: 6,
    maxWidth: '100%',
  },

  categoryTitleAccent: {
    width: 4,
    height: 22,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },

  categoryName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  categoryDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 19,
    maxWidth: '95%',
  },

  exploreRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },

  exploreText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
  },

  exploreIcon: {
    width: 26,
    height: 26,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ================= SKELETON =================

  skeletonCard: {
    width: '100%',
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  skeletonImage: {
    flex: 1,
    backgroundColor: '#E5ECE8',
  },

  skeletonContent: {
    position: 'absolute',
    bottom: 17,
    left: 17,
    right: 17,
    gap: 9,
  },

  skeletonTitle: {
    height: 16,
    width: '45%',
    borderRadius: 5,
    backgroundColor: '#D2DED7',
  },

  skeletonDescription: {
    height: 9,
    width: '75%',
    borderRadius: 5,
    backgroundColor: '#DCE7E0',
  },

  // ================= ERROR / EMPTY =================

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
    marginBottom: 16,
  },

  stateTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },

  stateDescription: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
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

  // ================= BOTTOM MESSAGE =================

  bottomMessage: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 19,
    backgroundColor: COLORS.green,
  },

  bottomIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomMessageInfo: {
    flex: 1,
    marginBottom: 8,
  },

  bottomMessageTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  bottomMessageSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 5,
  },

});

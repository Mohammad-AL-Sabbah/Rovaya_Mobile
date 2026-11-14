import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  fetchRecommendationById,
  localizedTitle,
  localizedDescription,
} from '@/api/recommendations';
import type { Recommendation } from '@/api/recommendations';

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
  occasion: '#FFF9EB',
  occasionBorder: '#F3E6C4',
};

const FALLBACK_IMAGE = require('@/assets/images/welcome/jerusalem.jpg');

// ✅ دالة موحدة لترجمة القيم الثابتة (المواسم والأنشطة)
const translateEnum = (value: string | undefined, isAr: boolean): string => {
  if (!value) return '';
  const lower = value.toLowerCase();

  const seasons: Record<string, { ar: string; en: string }> = {
    all: { ar: 'كل المواسم', en: 'All Seasons' },
    allyear: { ar: 'طوال العام', en: 'All Year' },
    spring: { ar: 'الربيع', en: 'Spring' },
    summer: { ar: 'الصيف', en: 'Summer' },
    autumn: { ar: 'الخريف', en: 'Autumn' },
    winter: { ar: 'الشتاء', en: 'Winter' },
  };

  const activities: Record<string, { ar: string; en: string }> = {
    all: { ar: 'الكل', en: 'All' },
    nature: { ar: 'طبيعة', en: 'Nature' },
    cultural: { ar: 'ثقافي', en: 'Cultural' },
    religious: { ar: 'ديني', en: 'Religious' },
    adventure: { ar: 'مغامرة', en: 'Adventure' },
    heritage: { ar: 'تراث', en: 'Heritage' },
    history: { ar: 'تاريخ', en: 'History' },
    seaside: { ar: 'بحري', en: 'Seaside' },
    food: { ar: 'طعام', en: 'Food' },
  };

  if (seasons[lower]) return isAr ? seasons[lower].ar : seasons[lower].en;
  if (activities[lower]) return isAr ? activities[lower].ar : activities[lower].en;

  return value; // Fallback للقيمة الأصلية إذا لم تكن في القاموس
};

// ✅ تنظيف النص (الباك إند يرسل أحيانًا مسافات أو Tab مثل "\tرحلة عائلية ")
const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// ✅ المناسبة حسب اللغة (عربي / إنجليزي) مع بدائل لأسماء الحقول المحتملة
const localizedOccasion = (rec: any, isAr: boolean): string => {
  const ar = clean(rec?.occasion ?? rec?.occasionAr);
  const en = clean(rec?.occasionEn ?? rec?.occasion_en ?? rec?.OccasionEn);
  return isAr ? ar || en : en || ar;
};

export default function RecommendationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const isArabic = i18n.language?.startsWith('ar') ?? true;
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      const numericId = Number(id);

      if (!id || !Number.isInteger(numericId) || numericId <= 0) {
        setError(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);
      setRecommendation(null);

      try {
        const data = await fetchRecommendationById(numericId);
        if (isMounted) {
          setRecommendation(data);
          setError(!data);
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // تشخيص (وضع التطوير فقط): هل وصل occasionEn من طبقة الـ API؟
  useEffect(() => {
    if (__DEV__ && recommendation) {
      console.log('[recommendation] occasion fields →', {
        occasion: (recommendation as any).occasion,
        occasionEn: (recommendation as any).occasionEn,
      });
    }
  }, [recommendation]);

  const title = recommendation
    ? localizedTitle(recommendation, isArabic ? 'ar' : 'en')
    : '';

  const description = recommendation
    ? localizedDescription(recommendation, isArabic ? 'ar' : 'en')
    : '';

  // ✅ ترجمة الموسم والنشاط ديناميكياً
  const seasonDisplay = translateEnum(recommendation?.season, isArabic);
  const activityDisplay = translateEnum(recommendation?.activityType, isArabic);

  // ✅ المناسبة باللغة الصحيحة
  const occasionDisplay = recommendation ? localizedOccasion(recommendation, isArabic) : '';

  const imageSource = recommendation?.imageUrl
    ? resolveMediaUrl(recommendation.imageUrl)
    : null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const renderState = () => (
    <View style={[styles.stateContainer, { paddingTop: insets.top }]}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color={COLORS.forest} />
          <Text style={styles.stateText}>
            {t('جاري تحميل التفاصيل...', 'Loading details...')}
          </Text>
        </>
      ) : (
        <>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={38} color={COLORS.muted} />
          </View>

          <Text style={styles.stateTitle}>
            {t('تعذر تحميل التوصية', 'Failed to load recommendation')}
          </Text>

          <Text style={styles.stateText}>
            {t(
              'حدث خطأ أثناء تحميل المعلومات، يرجى المحاولة مرة أخرى.',
              'Something went wrong while loading. Please try again.'
            )}
          </Text>

          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={isArabic ? 'arrow-forward' : 'arrow-back'}
              size={18}
              color={COLORS.white}
            />
            <Text style={styles.backButtonText}>
              {t('العودة', 'Go Back')}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  if (loading || error || !recommendation) {
    return <View style={styles.container}>{renderState()}</View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={imageSource || FALLBACK_IMAGE}
            style={styles.heroImage}
            contentFit="cover"
            transition={400}
          />

          <LinearGradient
            colors={['rgba(5,25,19,0.15)', 'rgba(5,25,19,0.25)', 'rgba(5,25,19,0.88)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Navigation */}
          <View
            style={[
              styles.heroHeader,
              {
                paddingTop: insets.top + 12,
                flexDirection: isArabic ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              accessibilityLabel={t('رجوع', 'Go back')}
            >
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={COLORS.white}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                // يمكن ربط المفضلة لاحقاً
              }}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              accessibilityLabel={t('إضافة للمفضلة', 'Add to favorites')}
            >
              <Ionicons name="heart-outline" size={22} color={COLORS.white} />
            </Pressable>
          </View>

          {/* Hero Content */}
          <View
            style={[
              styles.heroContent,
              { alignItems: isArabic ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Text
              style={[styles.heroTitle, { textAlign: isArabic ? 'right' : 'left' }]}
              numberOfLines={3}
            >
              {title}
            </Text>

            {/* ملاحظة: إذا كان الباك إند يرسل placeName بالعربية فقط، سيظهر بالعربية.
                يفضل تحديث الباك إند ليرسل placeNameAr و placeNameEn مستقبلاً */}
            {recommendation.placeName && (
              <View
                style={[
                  styles.heroLocation,
                  { flexDirection: isArabic ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="location" size={15} color={COLORS.gold} />
                <Text
                  style={[
                    styles.heroLocationText,
                    { textAlign: isArabic ? 'right' : 'left' },
                  ]}
                >
                  {recommendation.placeName}
                </Text>
              </View>
            )}
          </View>

          {/* Badges */}
          {(seasonDisplay || activityDisplay) && (
            <View
              style={[
                styles.heroBadges,
                { flexDirection: isArabic ? 'row-reverse' : 'row' },
              ]}
            >
              {seasonDisplay !== '' && (
                <View
                  style={[
                    styles.badge,
                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={14} color={COLORS.forest} />
                  <Text style={styles.badgeText}>{seasonDisplay}</Text>
                </View>
              )}

              {activityDisplay !== '' && (
                <View
                  style={[
                    styles.badge,
                    styles.badgeSecondary,
                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons name="compass-outline" size={14} color={COLORS.forest} />
                  <Text style={styles.badgeText}>{activityDisplay}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.contentBody}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, { textAlign: isArabic ? 'right' : 'left' }]}
            >
              {t('عن هذه التوصية', 'About this recommendation')}
            </Text>
            <View style={styles.titleAccent} />
          </View>

          {description ? (
            <Text
              style={[styles.descriptionText, { textAlign: isArabic ? 'right' : 'left' }]}
            >
              {description}
            </Text>
          ) : (
            <Text
              style={[styles.noDescription, { textAlign: isArabic ? 'right' : 'left' }]}
            >
              {t(
                'لا يوجد وصف متاح لهذه التوصية حالياً.',
                'No description available for this recommendation.'
              )}
            </Text>
          )}

          {/* Special Occasion */}
          {occasionDisplay ? (
            <View
              style={[
                styles.occasionBox,
                { flexDirection: isArabic ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={styles.occasionIcon}>
                <Ionicons name="star" size={19} color={COLORS.gold} />
              </View>

              <View style={styles.occasionTextContainer}>
                <Text
                  style={[
                    styles.occasionLabel,
                    { textAlign: isArabic ? 'right' : 'left' },
                  ]}
                >
                  {t('مناسبة خاصة', 'Special Occasion')}
                </Text>

                <Text
                  style={[
                    styles.occasionValue,
                    { textAlign: isArabic ? 'right' : 'left' },
                  ]}
                >
                  {occasionDisplay}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 10,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  heroContainer: {
    height: 390,
    position: 'relative',
    backgroundColor: COLORS.forestSoft,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 94,
    gap: 10,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 37,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  heroLocation: {
    alignItems: 'center',
    gap: 6,
  },
  heroLocationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroBadges: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    right: 20,
    gap: 9,
    flexWrap: 'wrap',
  },
  badge: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    elevation: 3,
  },
  badgeSecondary: {
    backgroundColor: COLORS.forestSoft,
  },
  badgeText: {
    color: COLORS.forest,
    fontSize: 12,
    fontWeight: '800',
  },
  contentBody: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 18,
  },
  sectionHeader: {
    gap: 9,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  titleAccent: {
    width: 42,
    height: 3,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  descriptionText: {
    color: COLORS.body,
    fontSize: 16,
    lineHeight: 30,
    fontWeight: '400',
  },
  noDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 25,
    fontStyle: 'italic',
  },
  occasionBox: {
    alignItems: 'center',
    gap: 13,
    backgroundColor: COLORS.occasion,
    padding: 17,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.occasionBorder,
    marginTop: 6,
  },
  occasionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occasionTextContainer: {
    flex: 1,
    gap: 5,
  },
  occasionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  occasionValue: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 23,
  },
  bottomSpacing: {
    height: 12,
  },
});
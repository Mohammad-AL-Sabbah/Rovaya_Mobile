import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/language-switcher';

/* ───────────── الألوان ───────────── */
const C = {
  green: '#0F4D3A',
  greenPressed: '#0A3A2B',
  greenText: '#0B3326',
  mint: '#E6F3EC',
  gold: '#E8B04B',
  white: '#FFFFFF',
  muted: '#5A6A63',
};

/* ───────────── الصور ─────────────
   استبدل الملفات داخل assets/images/welcome/ بصور حقيقية بنفس الأسماء. */
const SLIDES = [
  { id: 'jerusalem', image: require('../../assets/images/welcome/jerusalem.jpg') },
  { id: 'jaffa', image: require('../../assets/images/welcome/jaffa.jpg') },
  { id: 'acre', image: require('../../assets/images/welcome/acre.jpg') },
  { id: 'bethlehem', image: require('../../assets/images/welcome/bethlehem.jpg') },
];

const FEATURES = [
  { key: 'planner', icon: 'sparkles-outline' },
  { key: 'guides', icon: 'people-outline' },
  { key: 'stories', icon: 'book-outline' },
];

const SLIDE_INTERVAL = 5000;
const OVERLAP = 28;

/* يظهر المحتوى بنعومة كلما تغيّرت الصورة (يُستخدم مع key) */
function FadeIn({ children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const compact = height < 720;
  const heroH = Math.max(height * 0.42, 280);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_INTERVAL);
    return () => clearTimeout(timer);
  }, [index]);

  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* ── الصورة ── */}
      <View style={{ height: heroH }}>
        <Image
          source={slide.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={{ duration: 900, effect: 'cross-dissolve' }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
          style={[styles.scrim, { top: 0, height: 150 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
          style={[styles.scrim, { bottom: 0, height: '65%' }]}
        />

        {/* الهيدر */}
        <View style={[styles.header, { top: insets.top + 10 }]}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>R</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.brandText}>ROVAYA</Text>
          </View>

          <LanguageSwitcher />
        </View>

        {/* وصف المدينة */}
        <View style={[styles.caption, { bottom: OVERLAP + 22 }]}>
          <FadeIn key={slide.id} style={styles.captionInner}>
            <Text style={styles.city}>{t(`welcome.slides.${slide.id}.city`)}</Text>
            <Text style={styles.place}>{t(`welcome.slides.${slide.id}.place`)}</Text>
          </FadeIn>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </View>
      </View>

      {/* ── البطاقة البيضاء ── */}
      <View style={[styles.sheet, { marginTop: -OVERLAP, paddingBottom: insets.bottom + 16 }]}>
        <View>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('welcome.destinations')}</Text>
          <View style={styles.thumbs}>
            {SLIDES.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => setIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={t(`welcome.slides.${s.id}.city`)}
                style={styles.thumbItem}
              >
                <View style={[styles.thumbRing, i === index && styles.thumbRingActive]}>
                  <Image source={s.image} style={styles.thumbImg} contentFit="cover" />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.thumbLabel, i === index && styles.thumbLabelActive]}
                >
                  {t(`welcome.slides.${s.id}.city`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!compact && (
          <View style={styles.featureCard}>
            {FEATURES.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && <View style={styles.featureDivider} />}
                <View style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon} size={19} color={C.green} />
                  </View>
                  <Text style={styles.featureText}>{t(`welcome.features.${f.key}`)}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        <View>
          <Pressable
            onPress={() => router.push('/auth')}
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          >
            <Text style={styles.primaryText}>{t('common.getStarted')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/about')}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.secondaryText}>{t('welcome.learnMore')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },

  scrim: { position: 'absolute', left: 0, right: 0 },

  /* الهيدر */
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.green,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { color: C.white, fontSize: 22, fontWeight: '800', includeFontPadding: false },
  logoDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },
  brandText: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 4 },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  langText: { color: C.white, fontSize: 13, fontWeight: '700' },

  /* وصف المدينة */
  caption: { position: 'absolute', left: 24, right: 24 },
  captionInner: { alignItems: 'flex-start' },
  city: {
    color: C.white,
    fontSize: 34,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  place: { color: 'rgba(255,255,255,0.88)', fontSize: 15, marginTop: 2 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 14 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 22, backgroundColor: C.white },

  /* البطاقة */
  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 14,
    justifyContent: 'space-between',
  },
  title: { color: C.greenText, fontSize: 28, lineHeight: 38, fontWeight: '800' },
  subtitle: { color: C.muted, fontSize: 15.5, lineHeight: 24, marginTop: 8 },

  sectionTitle: { color: C.greenText, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  thumbs: { flexDirection: 'row', justifyContent: 'space-between' },
  thumbItem: { width: 76, alignItems: 'center', gap: 6 },
  thumbRing: {
    width: 70,
    height: 70,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  thumbRingActive: { borderColor: C.green },
  thumbImg: { flex: 1, borderRadius: 19, backgroundColor: C.mint },
  thumbLabel: { color: C.muted, fontSize: 12.5, fontWeight: '600' },
  thumbLabelActive: { color: C.greenText, fontWeight: '800' },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.mint,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  feature: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: C.greenText,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  featureDivider: { width: 1, height: 44, backgroundColor: 'rgba(15,77,58,0.14)' },

  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: C.greenPressed, transform: [{ scale: 0.985 }] },
  primaryText: { color: C.white, fontSize: 17, fontWeight: '800' },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: C.green, fontSize: 15.5, fontWeight: '700' },
});

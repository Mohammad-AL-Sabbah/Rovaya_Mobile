import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { PHOTOS } from '@/constants/photos';

export const HERO_OVERLAP = 34;

const SLIDES = ['jerusalem', 'jaffa', 'acre', 'bethlehem'] as const;
const POSITION = { jerusalem: 'top', jaffa: 'center', acre: 'center', bethlehem: 'center' } as const;

function FadeIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function HomeHero({ name, onProfile }: { name: string; onProfile: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const heroH = Math.min(Math.max(height * 0.37, 290), 340);
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearTimeout(id);
  }, [index]);
  const slide = SLIDES[index];

  // تقريب بطيء للصورة
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [zoom]);

  return (
    <View style={{ height: heroH, backgroundColor: Brand.deep }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
        ]}
      >
        <Image
          source={PHOTOS[slide]}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={POSITION[slide]}
          transition={{ duration: 900, effect: 'cross-dissolve' }}
        />
      </Animated.View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,35,27,0.7)', 'rgba(5,35,27,0)']}
        style={[styles.scrim, { top: 0, height: 190 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,35,27,0)', 'rgba(5,35,27,0.92)']}
        style={[styles.scrim, { bottom: 0, height: '68%' }]}
      />

      {/* الهيدر */}
      <View style={[styles.header, { top: insets.top + 12 }]}>
        <Pressable onPress={onProfile} accessibilityRole="button" style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <View style={styles.onlineDot} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{t(`home.greeting.${period}`)}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name || t('home.guest')}
          </Text>
        </View>

      </View>

      {/* اسم المدينة + شريط المخطط */}
      <View style={[styles.bottom, { paddingBottom: HERO_OVERLAP + 16 }]}>
        <FadeIn key={slide} style={{ alignItems: 'flex-start', gap: 4 }}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerLine} />
            <Text style={styles.kicker}>{t('home.hero.kicker')}</Text>
          </View>
          <Text style={styles.city}>{t(`home.places.${slide}.city`)}</Text>
          <Text style={styles.place}>{t(`home.places.${slide}.place`)}</Text>
        </FadeIn>

        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0 },

  header: {
    position: 'absolute',
    start: 20,
    end: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: Brand.gold,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: Brand.white, fontSize: 22, fontWeight: '800', includeFontPadding: false },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#2ECC71',
    borderWidth: 2.5,
    borderColor: Brand.deep,
  },
  greeting: { color: 'rgba(247,235,210,0.9)', fontSize: 13.5 },
  name: { color: Brand.white, fontSize: 21, fontWeight: '800' },
  bottom: { position: 'absolute', start: 20, end: 20, bottom: 0, gap: 14 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerLine: { width: 24, height: 2, borderRadius: 1, backgroundColor: Brand.gold },
  kicker: { color: Brand.gold, fontSize: 11.5, fontWeight: '800', letterSpacing: 4 },
  city: {
    color: Brand.white,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  place: { color: 'rgba(247,235,210,0.95)', fontSize: 14.5 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: Brand.gold },

});
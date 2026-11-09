import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/hooks/use-language';
import { Brand } from '@/constants/brand';

const PHOTOS = {
  jerusalem: require('../../assets/images/welcome/jerusalem.jpg'),
  jaffa: require('../../assets/images/welcome/jaffa.jpg'),
  acre: require('../../assets/images/welcome/acre.jpg'),
  bethlehem: require('../../assets/images/welcome/bethlehem.jpg'),
};

/** حركة طفو بطيئة لأعلى وأسفل */
function Floating({
  children,
  style,
  delay = 0,
  duration = 3200,
  distance = 8,
}: {
  children: React.ReactNode;
  style?: object;
  delay?: number;
  duration?: number;
  distance?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
  }, [anim, delay, duration]);

  return (
    <Animated.View
      style={[
        { position: 'absolute' },
        style,
        {
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** صورة بإطار أبيض وظل، بأشكال مختلفة (مربع/دائرة/قوس) */
function PhotoFrame({
  source,
  width,
  height,
  radiusTop,
  radiusBottom,
  rotate = '0deg',
}: {
  source: number;
  width: number;
  height: number;
  radiusTop: number;
  radiusBottom: number;
  rotate?: string;
}) {
  const inner = 4;
  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          borderTopLeftRadius: radiusTop,
          borderTopRightRadius: radiusTop,
          borderBottomLeftRadius: radiusBottom,
          borderBottomRightRadius: radiusBottom,
          transform: [{ rotate }],
        },
      ]}
    >
      <Image
        source={source}
        contentFit="cover"
        style={{
          flex: 1,
          margin: inner,
          borderTopLeftRadius: Math.max(radiusTop - inner, 0),
          borderTopRightRadius: Math.max(radiusTop - inner, 0),
          borderBottomLeftRadius: Math.max(radiusBottom - inner, 0),
          borderBottomRightRadius: Math.max(radiusBottom - inner, 0),
        }}
      />
    </View>
  );
}

export default function AuthChoiceScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const k = Math.min(1, Math.max(0.78, height / 820));
  const u = (n: number) => n * k;

  const top0 = insets.top + u(58);
  const cx = width / 2;
  const cy = top0 + u(116);
  const collageH = top0 + u(300);

  const disc = width * 0.95;
  const ring = width * 0.72;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={{ height: collageH }}>
        {/* دوائر زخرفية خلف الصور */}
        <View
          pointerEvents="none"
          style={[
            styles.disc,
            { width: disc, height: disc, borderRadius: disc / 2, left: cx - disc / 2, top: cy - disc / 2 },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: ring, height: ring, borderRadius: ring / 2, left: cx - ring / 2, top: cy - ring / 2 },
          ]}
        />

        {/* أربع صور في الزوايا */}
        <Floating style={{ left: -u(14), top: top0 }} duration={3400}>
          <PhotoFrame
            source={PHOTOS.jerusalem}
            width={u(150)}
            height={u(176)}
            radiusTop={u(34)}
            radiusBottom={u(34)}
            rotate="-6deg"
          />
        </Floating>

        <Floating style={{ right: u(26), top: top0 - u(10) }} delay={500} duration={3000}>
          <PhotoFrame
            source={PHOTOS.acre}
            width={u(112)}
            height={u(112)}
            radiusTop={u(56)}
            radiusBottom={u(56)}
          />
        </Floating>

        <Floating style={{ right: -u(16), top: top0 + u(138) }} delay={900} duration={3600}>
          <PhotoFrame
            source={PHOTOS.bethlehem}
            width={u(118)}
            height={u(154)}
            radiusTop={u(59)}
            radiusBottom={u(24)}
            rotate="5deg"
          />
        </Floating>

        <Floating style={{ left: u(34), top: top0 + u(196) }} delay={1300} duration={2800}>
          <PhotoFrame
            source={PHOTOS.jaffa}
            width={u(92)}
            height={u(92)}
            radiusTop={u(46)}
            radiusBottom={u(46)}
          />
        </Floating>

        {/* الشعار في المنتصف */}
        <View style={[styles.medallion, { left: cx - 38, top: cy - 38 }]}>
          <Text style={styles.medallionLetter}>R</Text>
          <View style={styles.medallionDot} />
        </View>
        <Text style={[styles.wordmark, { left: cx - 70, top: cy + 50 }]}>ROVAYA</Text>

        {/* الهيدر */}
        <View style={[styles.header, { top: insets.top + 10 }]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={Brand.green}
            />
          </Pressable>
          <LanguageSwitcher variant="solid" />
        </View>
      </View>

      {/* النص والأزرار */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          >
            <Text style={styles.primaryText}>{t('auth.login')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/register')}
            style={({ pressed }) => [styles.outlined, pressed && { backgroundColor: Brand.mint }]}
          >
            <Text style={styles.outlinedText}>{t('auth.register')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },

  disc: { position: 'absolute', backgroundColor: Brand.mint, opacity: 0.75 },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(232,176,75,0.55)',
    borderStyle: 'dashed',
  },

  frame: {
    backgroundColor: Brand.white,
    shadowColor: '#0B3326',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },

  medallion: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Brand.green,
    borderWidth: 3,
    borderColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B3326',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  medallionLetter: { color: Brand.white, fontSize: 40, fontWeight: '800', includeFontPadding: false },
  medallionDot: {
    position: 'absolute',
    top: 17,
    right: 17,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Brand.gold,
  },
  wordmark: {
    position: 'absolute',
    width: 140,
    textAlign: 'center',
    color: Brand.greenText,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 5,
  },

  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.mint,
    borderWidth: 1,
    borderColor: Brand.line,
  },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, justifyContent: 'space-between' },
  textBlock: { alignItems: 'center', gap: 8 },
  title: { color: Brand.greenText, fontSize: 29, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Brand.muted, fontSize: 15.5, lineHeight: 24, textAlign: 'center', maxWidth: 340 },

  actions: { gap: 12 },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: Brand.greenPressed, transform: [{ scale: 0.985 }] },
  primaryText: { color: Brand.white, fontSize: 17, fontWeight: '800' },
  outlined: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedText: { color: Brand.green, fontSize: 17, fontWeight: '800' },
});
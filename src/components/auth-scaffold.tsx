import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/hooks/use-language';
import { RevealContext } from '@/components/reveal-context';
import { Brand } from '@/constants/brand';

const OVERLAP = 34;

interface Props {
  image: number;
  title: string;
  tagline: string;
  /** هيرو أصغر للصفحات ذات الحقول الكثيرة */
  compact?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

/** زخرفة صغيرة مستوحاة من التطريز الفلسطيني */
function Ornament() {
  const colors = [Brand.gold, Brand.red, '#1F7A4D', Brand.red, Brand.gold];
  return (
    <View style={styles.ornament}>
      {colors.map((c, i) => (
        <View
          key={i}
          style={[
            styles.diamond,
            { backgroundColor: c },
            i === 2 && { width: 11, height: 11, borderRadius: 2 },
          ]}
        />
      ))}
    </View>
  );
}

export function AuthScaffold({ image, title, tagline, compact, onBack, children }: Props) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // نثبّت الارتفاع على أكبر قيمة رأيناها حتى لا يتغير التصميم (ولا تدخل الشاشة في حلقة إعادة رسم) عند ظهور الكيبورد
  const [height, setHeight] = useState(windowHeight);
  useEffect(() => {
    if (windowHeight > height) setHeight(windowHeight);
  }, [windowHeight, height]);

  const heroH = Math.max(height * (compact ? 0.3 : 0.37), 240) + insets.top * 0.4;

  /* ───── الكيبورد ───── */
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpen = keyboardHeight > 0;

  // يتأكد أن الحقل المركَّز عليه ظاهر فوق الكيبورد
  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    if (top == null) return;
    const focused = (TextInput as any).State?.currentlyFocusedInput?.();
    focused?.measureInWindow?.((_x: number, y: number, _w: number, h: number) => {
      const overlap = y + h + 28 - top;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(reveal, 100);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  /* ───── تقريب بطيء للصورة (يتوقف أثناء الكتابة) ───── */
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (keyboardOpen) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(zoom, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [zoom, keyboardOpen]);

  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/welcome')));

  const scroll = (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      contentContainerStyle={{
        paddingTop: heroH - OVERLAP,
        // على أندرويد نضيف مساحة بقدر الكيبورد بدل KeyboardAvoidingView (الذي يسبب حلقة إعادة رسم مع edge-to-edge)
        paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
      }}
    >
      <View
        style={[
          styles.sheet,
          { minHeight: height - (heroH - OVERLAP), paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Ornament />
        {children}
      </View>
    </ScrollView>
  );

  return (
    <RevealContext.Provider value={reveal}>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* الهيرو الثابت */}
        <View style={[styles.hero, { height: heroH }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] },
            ]}
          >
            <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>

          <LinearGradient
            pointerEvents="none"
            colors={['rgba(5,35,27,0.65)', 'rgba(5,35,27,0)']}
            style={[styles.scrim, { top: 0, height: 150 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(5,35,27,0)', 'rgba(5,35,27,0.9)']}
            style={[styles.scrim, { bottom: 0, height: '75%' }]}
          />

          <View style={[styles.heroText, { bottom: OVERLAP + 20 }]}>
            <View style={styles.kickerRow}>
              <View style={styles.kickerLine} />
              <Text style={styles.kicker}>ROVAYA</Text>
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroTagline}>{tagline}</Text>
          </View>
        </View>

        {/* المحتوى يتمرر فوق الهيرو */}
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            {scroll}
          </KeyboardAvoidingView>
        ) : (
          <View style={{ flex: 1 }}>{scroll}</View>
        )}

        {/* أزرار ثابتة */}
        <View pointerEvents="box-none" style={[styles.header, { top: insets.top + 10 }]}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color={Brand.white}
            />
          </Pressable>
          <LanguageSwitcher variant="glass" />
        </View>
      </View>
    </RevealContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },

  hero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: Brand.deep },
  scrim: { position: 'absolute', left: 0, right: 0 },
  heroText: { position: 'absolute', left: 24, right: 24, alignItems: 'flex-start', gap: 6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  kickerLine: { width: 24, height: 2, borderRadius: 1, backgroundColor: Brand.gold },
  kicker: { color: Brand.gold, fontSize: 12, fontWeight: '800', letterSpacing: 5 },
  heroTitle: {
    color: Brand.white,
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroTagline: { color: 'rgba(247,235,210,0.92)', fontSize: 15, lineHeight: 22 },

  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  sheet: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 18,
  },
  ornament: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 14 },
  diamond: { width: 8, height: 8, borderRadius: 1.5, transform: [{ rotate: '45deg' }] },
});
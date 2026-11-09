import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/hooks/use-language';
import { PalestineFlag } from '@/components/palestine-flag';
import { Brand } from '@/constants/brand';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HERO_H = 250;
const OVERLAP = 28;

function SectionTitle({ icon, children }: { icon?: IconName; children: string }) {
  return (
    <View style={styles.sectionHead}>
      {icon && (
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={Brand.green} />
        </View>
      )}
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  flag,
  title,
  text,
}: {
  icon?: IconName;
  flag?: boolean;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        {flag ? <PalestineFlag width={26} /> : <Ionicons name={icon!} size={22} color={Brand.green} />}
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const footerH = 56 + 12 + 12 + insets.bottom;

  const { isAuthenticated } = useAuth();
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace(isAuthenticated ? '/(tabs)' : '/welcome');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footerH + 24 }}
      >
        {/* ── الصورة ── */}
        <View style={{ height: HERO_H }}>
          <Image
            source={require('../../assets/images/welcome/jerusalem.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
            style={[styles.scrim, { top: 0, height: 140 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
            style={[styles.scrim, { bottom: 0, height: '70%' }]}
          />

          <View style={[styles.header, { top: insets.top + 10 }]}>
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
            <LanguageSwitcher />
          </View>

          <View style={[styles.heroTitleWrap, { bottom: OVERLAP + 20 }]}>
            <Text style={styles.heroTitle}>{t('about.title')}</Text>
          </View>
        </View>

        {/* ── المحتوى ── */}
        <View style={styles.sheet}>
          {/* قصتنا */}
          <View style={styles.block}>
            <SectionTitle icon="book-outline">{t('about.story.title')}</SectionTitle>
            <Text style={styles.body}>{t('about.story.p1')}</Text>
            <Text style={styles.body}>{t('about.story.p2')}</Text>
          </View>

          {/* رؤيتنا */}
          <View style={[styles.card, styles.cardLight]}>
            <View style={[styles.cardIcon, { backgroundColor: Brand.white }]}>
              <Ionicons name="eye-outline" size={22} color={Brand.green} />
            </View>
            <Text style={[styles.cardTitle, { color: Brand.greenText }]}>{t('about.vision.title')}</Text>
            <Text style={[styles.cardText, { color: Brand.body }]}>{t('about.vision.text')}</Text>
          </View>

          {/* رسالتنا */}
          <View style={[styles.card, styles.cardDark]}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
              <Ionicons name="flag-outline" size={22} color={Brand.gold} />
            </View>
            <Text style={[styles.cardTitle, { color: Brand.white }]}>{t('about.mission.title')}</Text>
            <Text style={[styles.cardText, { color: 'rgba(255,255,255,0.88)' }]}>
              {t('about.mission.text')}
            </Text>
          </View>

          {/* لماذا روفايا؟ */}
          <View style={styles.block}>
            <SectionTitle>{t('about.why.title')}</SectionTitle>
            <View style={styles.whyCard}>
              <InfoRow
                icon="sparkles-outline"
                title={t('about.why.ai.title')}
                text={t('about.why.ai.text')}
              />
              <View style={styles.divider} />
              <InfoRow flag title={t('about.why.authentic.title')} text={t('about.why.authentic.text')} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── زر ثابت أسفل الشاشة ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={() => router.push('/auth')}
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>{t('common.getStarted')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  scrim: { position: 'absolute', left: 0, right: 0 },

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
  heroTitleWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'flex-start' },
  heroTitle: {
    color: Brand.white,
    fontSize: 34,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  sheet: {
    marginTop: -OVERLAP,
    backgroundColor: Brand.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    gap: 20,
  },
  block: { gap: 12 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: Brand.greenText, fontSize: 21, fontWeight: '800' },
  body: { color: Brand.body, fontSize: 15.5, lineHeight: 26 },

  card: { borderRadius: 24, padding: 20, gap: 8 },
  cardLight: { backgroundColor: Brand.mint },
  cardDark: { backgroundColor: Brand.green },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 19, fontWeight: '800' },
  cardText: { fontSize: 15, lineHeight: 24 },

  whyCard: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 24,
    padding: 18,
  },
  infoRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1, gap: 4 },
  infoTitle: { color: Brand.greenText, fontSize: 16.5, fontWeight: '800' },
  infoText: { color: Brand.muted, fontSize: 14.5, lineHeight: 22 },
  divider: { height: 1, backgroundColor: Brand.line, marginVertical: 16 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Brand.white,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
  },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: Brand.greenPressed, transform: [{ scale: 0.985 }] },
  primaryText: { color: Brand.white, fontSize: 17, fontWeight: '800' },
});
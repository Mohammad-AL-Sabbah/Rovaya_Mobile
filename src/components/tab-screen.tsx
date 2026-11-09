import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/floating-tab-bar';
import { Brand } from '@/constants/brand';

export const SURFACE = '#F5F8F6';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** هيكل مشترك لصفحات التبويبات: عنوان + محتوى يتمرر + مساحة آمنة فوق الشريط السفلي */
export function TabScreen({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 20,
          paddingBottom: space,
          gap: 18,
        }}
      >
        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerLine} />
            <Text style={styles.kicker}>ROVAYA</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

/** بطاقة "قريباً" للأقسام التي لم تُبنَ تفاصيلها بعد */
export function ComingSoonCard({ icon, description }: { icon: IconName; description: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.ring}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={34} color={Brand.green} />
        </View>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{t('common.comingSoon')}</Text>
      </View>
      <Text style={styles.cardText}>{description}</Text>
      <Text style={styles.cardHint}>{t('common.comingSoonText')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },

  header: { gap: 6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerLine: { width: 24, height: 2, borderRadius: 1, backgroundColor: Brand.gold },
  kicker: { color: '#C98A2B', fontSize: 11.5, fontWeight: '800', letterSpacing: 5 },
  title: { color: Brand.greenText, fontSize: 30, lineHeight: 40, fontWeight: '800' },
  subtitle: { color: Brand.muted, fontSize: 15, lineHeight: 23 },

  card: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  ring: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,176,75,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFF4D9',
  },
  pillText: { color: '#8A5A14', fontSize: 12.5, fontWeight: '800' },
  cardText: { color: Brand.greenText, fontSize: 17, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  cardHint: { color: Brand.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
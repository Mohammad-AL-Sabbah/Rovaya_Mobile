import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { TabScreen } from '@/components/tab-screen';
import { Brand } from '@/constants/brand';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Row({ icon, title, subtitle, right }: { icon: IconName; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={Brand.green} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  // بعد signOut يتحرك الراوتر تلقائياً إلى صفحة تسجيل الدخول (انظر _layout الجذر)
  const confirmLogout = () => {
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <TabScreen title={t('tabs.settings.title')}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t('settings.general')}</Text>
        <Row
          icon="language-outline"
          title={t('settings.language')}
          right={<LanguageSwitcher variant="solid" />}
        />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t('settings.account')}</Text>
        <Row icon="person-circle-outline" title={t('settings.signedInAs')} subtitle={user?.email} />
      </View>

      <Pressable
        onPress={confirmLogout}
        accessibilityRole="button"
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] }]}
      >
        <Ionicons name="log-out-outline" size={22} color={Brand.danger} />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
    padding: 16,
    borderRadius: 24,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  groupTitle: { color: Brand.muted, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: Brand.greenText, fontSize: 15.5, fontWeight: '700' },
  rowSubtitle: { color: Brand.muted, fontSize: 13.5 },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E9B8B2',
    backgroundColor: '#FFF6F5',
  },
  logoutText: { color: Brand.danger, fontSize: 16.5, fontWeight: '800' },
});
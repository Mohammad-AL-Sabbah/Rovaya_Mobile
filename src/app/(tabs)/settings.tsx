import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { TabScreen } from '@/components/tab-screen';
import { Brand } from '@/constants/brand';
import { deleteAccount } from '@/api/auth';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ------------------------------------------------------------------ */
/*  عناصر مساعدة                                                       */
/* ------------------------------------------------------------------ */

function GroupHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupHeaderIcon}>
        <Ionicons name={icon} size={14} color={Brand.green} />
      </View>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupLine} />
    </View>
  );
}

function Row({
  icon,
  tint = Brand.green,
  title,
  subtitle,
  right,
}: {
  icon: IconName;
  tint?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={21} color={tint} />
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

/* ------------------------------------------------------------------ */
/*  الشاشة                                                             */
/* ------------------------------------------------------------------ */

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const isArabic = i18n.language === 'ar';

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // للعرض فقط: إظهار/إخفاء كلمة المرور

  const confirmLogout = () => {
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPassword('');
    setShowPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      Alert.alert(t('common.error') || 'Error', t('validation.passwordRequired'));
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccount(password);
      if (result.success) {
        setShowDeleteModal(false);
        setPassword('');
        await signOut();
      } else {
        Alert.alert(t('common.error') || 'Error', result.message || t('errors.generic'));
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Error',
        error?.serverMessage || t('errors.unexpected')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TabScreen title={t('tabs.settings.title')}>
      {/* ---------- عام ---------- */}
      <View style={styles.group}>
        <GroupHeader icon="options-outline" title={t('settings.general')} />
        <Row
          icon="language-outline"
          tint="#2E86DE"
          title={t('settings.language')}
          right={<LanguageSwitcher variant="solid" />}
        />
      </View>

      {/* ---------- الحساب ---------- */}
      <View style={styles.group}>
        <GroupHeader icon="person-outline" title={t('settings.account')} />
        <Row
          icon="person-circle-outline"
          title={t('settings.signedInAs')}
          subtitle={user?.email}
        />
      </View>

      {/* ---------- تسجيل الخروج ---------- */}
      <Pressable
        onPress={confirmLogout}
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] }]}
      >
        <Ionicons name="log-out-outline" size={22} color={Brand.danger} />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>

      {/* ---------- منطقة الخطر ---------- */}
      <View style={styles.dangerZone}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning-outline" size={16} color={Brand.danger} />
          <Text style={styles.dangerTitle}>{isArabic ? 'منطقة الخطر' : 'Danger Zone'}</Text>
        </View>
        <Text style={styles.dangerText}>
          {isArabic
            ? 'حذف الحساب إجراء نهائي ولا يمكن التراجع عنه.'
            : 'Deleting your account is permanent and cannot be undone.'}
        </Text>
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] }]}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>{t('settings.deleteAccount')}</Text>
        </Pressable>
      </View>

      {/* ---------- Footer ---------- */}
      <View style={styles.footer}>
        <View style={styles.footerLogo}>
          <Ionicons name="compass-outline" size={18} color={Brand.green} />
          <Text style={styles.footerBrand}>ROVAYA</Text>
        </View>
        <Text style={styles.footerText}>
          {isArabic ? 'اكتشف فلسطين... رحلة وراء كل حكاية' : 'Discover Palestine... Every journey tells a story'}
        </Text>
      </View>

      {/* ---------- نافذة تأكيد حذف الحساب ---------- */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) closeDeleteModal();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          {/* الضغط خارج البطاقة يغلق النافذة (إلا أثناء الحذف) */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isDeleting) closeDeleteModal();
            }}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalIconRing}>
              <View style={styles.modalIcon}>
                <Ionicons name="warning" size={30} color={Brand.danger} />
              </View>
            </View>
            <Text style={styles.modalTitle}>{t('settings.deleteAccountConfirmTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('settings.deleteAccountConfirmText')}</Text>

            <View style={styles.passwordBox}>
              <Ionicons name="lock-closed-outline" size={19} color="#9AA9A0" />
              <TextInput
                style={styles.passwordInput}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor="#B2BDB6"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!isDeleting}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} disabled={isDeleting}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9AA9A0"
                />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeDeleteModal}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                disabled={isDeleting}
              >
                <Text style={styles.modalBtnCancelText}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                style={[styles.modalBtn, styles.modalBtnDelete, isDeleting && styles.modalBtnDisabled]}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnDeleteText}>{t('settings.deleteAccount')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  /* Groups */
  group: {
    gap: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.line,
    marginBottom: 18,
    shadowColor: '#173C2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: { color: Brand.greenText, fontSize: 13.5, fontWeight: '900' },
  groupLine: { flex: 1, height: 1, backgroundColor: '#EEF2EF' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { color: Brand.greenText, fontSize: 15.5, fontWeight: '700' },
  rowSubtitle: { color: Brand.muted, fontSize: 13.5 },

  /* Logout */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E9B8B2',
    backgroundColor: '#FFF6F5',
    marginBottom: 18,
  },
  logoutText: { color: Brand.danger, fontSize: 16.5, fontWeight: '800' },

  /* Danger zone */
  dangerZone: {
    gap: 10,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#EBC3BE',
    backgroundColor: '#FFFAF9',
  },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerTitle: { color: Brand.danger, fontSize: 13.5, fontWeight: '900' },
  dangerText: { color: '#9A6F6A', fontSize: 12.5, lineHeight: 19 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 15,
    backgroundColor: Brand.danger,
    marginTop: 4,
  },
  deleteText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },

  /* Footer */
  footer: { alignItems: 'center', marginTop: 30, marginBottom: 10, paddingHorizontal: 20 },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerBrand: { color: Brand.green, fontSize: 13.5, fontWeight: '900', letterSpacing: 2 },
  footerText: { color: '#A0AAA4', fontSize: 11, marginTop: 8, textAlign: 'center' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,24,18,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: Brand.white,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF5F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFE6E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Brand.greenText,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Brand.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 52,
    backgroundColor: '#F8FAF9',
    borderWidth: 1.5,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  passwordInput: { flex: 1, height: '100%', fontSize: 15, color: Brand.greenText },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: { backgroundColor: '#F0F3F1' },
  modalBtnCancelText: { color: Brand.greenText, fontSize: 15, fontWeight: '800' },
  modalBtnDelete: { backgroundColor: Brand.danger },
  modalBtnDeleteText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  modalBtnDisabled: { opacity: 0.7 },
});
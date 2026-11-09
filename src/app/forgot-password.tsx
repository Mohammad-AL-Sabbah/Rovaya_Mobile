import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { describeError, sendResetCode } from '@/api';
import { AuthScaffold } from '@/components/auth-scaffold';
import { NoticeBanner } from '@/components/notice-banner';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { Brand } from '@/constants/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ar' ? 'ar' : 'en';

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setBanner(null);

    const trimmed = email.trim();
    if (!trimmed) return setEmailError(t('validation.emailRequired'));
    if (!EMAIL_RE.test(trimmed)) return setEmailError(t('validation.emailInvalid'));

    setLoading(true);
    try {
      // الـ Backend يرد بنجاح دائماً (لا يكشف إن كان البريد مسجلاً) فننتقل لصفحة إدخال الرمز
      await sendResetCode(trimmed);
      router.push({ pathname: '/reset-password', params: { email: trimmed } });
    } catch (error) {
      setBanner(describeError(error, t, language).text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      image={require('../../assets/images/welcome/bethlehem.jpg')}
      title={t('forgot.title')}
      tagline={t('forgot.tagline')}
    >
      <View style={styles.introRow}>
        <View style={styles.introIcon}>
          <Ionicons name="key-outline" size={22} color={Brand.green} />
        </View>
        <Text style={styles.intro}>{t('forgot.intro')}</Text>
      </View>

      {!!banner && <NoticeBanner tone="error">{banner}</NoticeBanner>}

      <TextField
        label={t('forgot.email')}
        icon="mail-outline"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (emailError) setEmailError(undefined);
        }}
        placeholder={t('login.emailPlaceholder')}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton title={t('forgot.submit')} onPress={onSubmit} loading={loading} />

      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        hitSlop={8}
        style={styles.back}
        accessibilityRole="link"
      >
        <Text style={styles.link}>{t('forgot.back')}</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { flex: 1, color: Brand.body, fontSize: 15, lineHeight: 24 },
  back: { alignSelf: 'center' },
  link: { color: Brand.green, fontSize: 14.5, fontWeight: '800' },
});

import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { describeError } from '@/api';
import { useAuth } from '@/auth/auth-context';
import { AuthScaffold } from '@/components/auth-scaffold';
import { NoticeBanner } from '@/components/notice-banner';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { Brand } from '@/constants/brand';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ notice?: string; email?: string }>();

  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [banner, setBanner] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);

  const notice = params.notice === 'passwordReset' ? t('login.notice.passwordReset') : null;

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = t('validation.emailRequired');
    else if (!EMAIL_RE.test(trimmed)) next.email = t('validation.emailInvalid');
    if (!password) next.password = t('validation.passwordRequired');
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setBanner(null);
    if (!validate()) return;

    setLoading(true);
    try {
      // عند النجاح تتغير حالة الجلسة ويحوّلك الراوتر تلقائياً إلى الصفحات المحمية
      await signIn(email.trim(), password);
    } catch (error) {
      setBanner(describeError(error, t, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      image={require('../../assets/images/welcome/jerusalem.jpg')}
      title={t('login.title')}
      tagline={t('login.tagline')}
    >
      {!!notice && !banner && <NoticeBanner tone="success">{notice}</NoticeBanner>}
      {!!banner && <NoticeBanner tone={banner.tone}>{banner.text}</NoticeBanner>}

      <TextField
        label={t('login.email')}
        icon="mail-outline"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
        }}
        placeholder={t('login.emailPlaceholder')}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />

      <View style={{ gap: 12 }}>
        <TextField
          ref={passwordRef}
          label={t('login.password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
          }}
          placeholder={t('login.passwordPlaceholder')}
          error={fieldErrors.password}
          secure
          showLabel={t('common.showPassword')}
          hideLabel={t('common.hidePassword')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            router.push('/forgot-password');
          }}
          hitSlop={8}
          style={styles.forgot}
          accessibilityRole="link"
        >
          <Text style={styles.link}>{t('login.forgot')}</Text>
        </Pressable>
      </View>

      <PrimaryButton title={t('login.submit')} onPress={onSubmit} loading={loading} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{t('login.noAccount')}</Text>
        <Pressable onPress={() => {
            Keyboard.dismiss();
            router.replace('/register');
          }} hitSlop={8} accessibilityRole="link">
          <Text style={styles.link}>{t('login.createAccount')}</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end' },
  link: { color: Brand.green, fontSize: 14.5, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  footerText: { color: Brand.muted, fontSize: 15 },
});

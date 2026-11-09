import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { describeError, resetPassword, sendResetCode } from '@/api';
import { AuthScaffold } from '@/components/auth-scaffold';
import { NoticeBanner } from '@/components/notice-banner';
import { OtpInput } from '@/components/otp-input';
import { PasswordStrength } from '@/components/password-strength';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { Brand } from '@/constants/brand';
import { passwordStrength } from '@/constants/password-rules';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

type Errors = { code?: string; password?: string; confirm?: string };

export default function ResetPasswordScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { email = '' } = useLocalSearchParams<{ email?: string }>();

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<{ text: string; tone: 'error' | 'success' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  // بدون بريد (فتح الصفحة مباشرة) نرجع لصفحة "نسيت كلمة المرور"
  useEffect(() => {
    if (!email) router.replace('/forgot-password');
  }, [email]);

  // عدّاد إعادة الإرسال
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const validate = () => {
    const next: Errors = {};
    if (code.length !== CODE_LENGTH) next.code = t('validation.codeIncomplete');
    if (!password) next.password = t('validation.passwordRequired');
    else if (!passwordStrength(password).valid) next.password = t('validation.passwordWeak');
    if (!confirm) next.confirm = t('validation.confirmRequired');
    else if (confirm !== password) next.confirm = t('validation.passwordMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (loading) return;
    Keyboard.dismiss();
    setBanner(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword({ email, Code: code, NewPassword: password });
      router.replace({ pathname: '/login', params: { notice: 'passwordReset', email } });
    } catch (error) {
      const described = describeError(error, t, language);
      setBanner({ text: described.text, tone: described.tone });
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || loading) return;
    setBanner(null);
    try {
      await sendResetCode(email);
      setCode('');
      setCooldown(RESEND_SECONDS);
      setBanner({ text: t('reset.resent'), tone: 'success' });
    } catch (error) {
      const described = describeError(error, t, language);
      setBanner({ text: described.text, tone: described.tone });
    }
  };

  return (
    <AuthScaffold
      image={require('../../assets/images/welcome/jaffa.jpg')}
      title={t('reset.title')}
      tagline={t('reset.tagline')}
      compact
    >
      <Text style={styles.sentTo}>{t('reset.sentTo', { email })}</Text>

      {!!banner && <NoticeBanner tone={banner.tone}>{banner.text}</NoticeBanner>}

      <View style={{ gap: 12 }}>
        <Text style={styles.label}>{t('reset.code')}</Text>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
          }}
          length={CODE_LENGTH}
          hasError={!!errors.code}
          accessibilityLabel={t('reset.code')}
          onComplete={() => passwordRef.current?.focus()}
        />
        {!!errors.code && <Text style={styles.codeError}>{errors.code}</Text>}

        <Pressable onPress={onResend} disabled={cooldown > 0} hitSlop={8} style={styles.resend} accessibilityRole="button">
          <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
            {cooldown > 0 ? t('reset.resendIn', { seconds: cooldown }) : t('reset.resend')}
          </Text>
        </Pressable>
      </View>

      <TextField
        ref={passwordRef}
        label={t('reset.newPassword')}
        icon="lock-closed-outline"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        placeholder={t('reset.newPasswordPlaceholder')}
        error={errors.password}
        secure
        showLabel={t('common.showPassword')}
        hideLabel={t('common.hidePassword')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />

      <PasswordStrength password={password} />

      <TextField
        ref={confirmRef}
        label={t('reset.confirmPassword')}
        icon="shield-checkmark-outline"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
        }}
        placeholder={t('register.confirmPlaceholder')}
        error={errors.confirm}
        secure
        showLabel={t('common.showPassword')}
        hideLabel={t('common.hidePassword')}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton title={t('reset.submit')} onPress={onSubmit} loading={loading} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  sentTo: { color: Brand.body, fontSize: 15, lineHeight: 24 },
  label: { color: Brand.greenText, fontSize: 13.5, fontWeight: '700' },
  codeError: { color: Brand.danger, fontSize: 13, textAlign: 'center' },
  resend: { alignSelf: 'center', marginTop: 2 },
  link: { color: Brand.green, fontSize: 14.5, fontWeight: '800' },
  linkDisabled: { color: Brand.muted, fontWeight: '600' },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { describeError, register } from '@/api';
import { AuthScaffold } from '@/components/auth-scaffold';
import { NoticeBanner } from '@/components/notice-banner';
import { PasswordStrength } from '@/components/password-strength';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { CountryPicker } from '@/components/country-picker';
import { Brand } from '@/constants/brand';
import { passwordStrength } from '@/constants/password-rules';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'country' | 'password' | 'confirm';
type Errors = Partial<Record<Field, string>>;

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ar' ? 'ar' : 'en';

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  const set = (field: Field) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    if (!form.firstName.trim()) next.firstName = t('validation.firstNameRequired');
    if (!form.lastName.trim()) next.lastName = t('validation.lastNameRequired');

    const email = form.email.trim();
    if (!email) next.email = t('validation.emailRequired');
    else if (!EMAIL_RE.test(email)) next.email = t('validation.emailInvalid');

    const phone = form.phone.replace(/[\s-]/g, '');
    if (!phone) next.phone = t('validation.phoneRequired');
    else if (!PHONE_RE.test(phone)) next.phone = t('validation.phoneInvalid');

    if (!form.country.trim()) next.country = t('validation.countryRequired');

    if (!form.password) next.password = t('validation.passwordRequired');
    else if (!passwordStrength(form.password).valid) next.password = t('validation.passwordWeak');

    if (!form.confirm) next.confirm = t('validation.confirmRequired');
    else if (form.confirm !== form.password) next.confirm = t('validation.passwordMismatch');

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
      const email = form.email.trim();
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: form.password,
        confirmPassword: form.confirm,
        phoneNumber: form.phone.replace(/[\s-]/g, ''),
        country: form.country.trim(),
      });
      setDoneEmail(email);
    } catch (error) {
      setBanner(describeError(error, t, language).text);
    } finally {
      setLoading(false);
    }
  };

  /* ───── شاشة النجاح: تحقق من بريدك ───── */
  if (doneEmail) {
    return (
      <AuthScaffold
        image={require('../../assets/images/welcome/acre.jpg')}
        title={t('register.success.title')}
        tagline={t('register.tagline')}
        compact
      >
        <View style={styles.successWrap}>
          <View style={styles.successRing}>
            <View style={styles.successCircle}>
              <Ionicons name="mail-open-outline" size={38} color={Brand.green} />
            </View>
          </View>
          <Text style={styles.successText}>{t('register.success.text', { email: doneEmail })}</Text>
          <NoticeBanner tone="info">{t('register.success.hint')}</NoticeBanner>
        </View>

        <PrimaryButton
          title={t('register.success.goLogin')}
          onPress={() => router.replace({ pathname: '/login', params: { email: doneEmail } })}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      image={require('../../assets/images/welcome/acre.jpg')}
      title={t('register.title')}
      tagline={t('register.tagline')}
      compact
    >
      {!!banner && <NoticeBanner tone="error">{banner}</NoticeBanner>}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('register.firstName')}
            placeholder={t('register.firstName')}
            value={form.firstName}
            onChangeText={set('firstName')}
            error={errors.firstName}
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            submitBehavior="submit"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            ref={lastNameRef}
            label={t('register.lastName')}
            placeholder={t('register.lastName')}
            value={form.lastName}
            onChangeText={set('lastName')}
            error={errors.lastName}
            autoComplete="family-name"
            textContentType="familyName"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
          />
        </View>
      </View>

      <TextField
        ref={emailRef}
        label={t('register.email')}
        icon="mail-outline"
        value={form.email}
        onChangeText={set('email')}
        placeholder={t('login.emailPlaceholder')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        submitBehavior="submit"
      />

      <TextField
        ref={phoneRef}
        label={t('register.phone')}
        icon="call-outline"
        value={form.phone}
        onChangeText={set('phone')}
        placeholder={t('register.phonePlaceholder')}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />

      {/* Country Picker - مكون احترافي مع أعلام وبحث */}
      <CountryPicker
        label={t('register.country')}
        value={form.country}
        onSelect={set('country')}
        error={errors.country}
      />

      <TextField
        ref={passwordRef}
        label={t('register.password')}
        icon="lock-closed-outline"
        value={form.password}
        onChangeText={set('password')}
        placeholder={t('register.passwordPlaceholder')}
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

      <PasswordStrength password={form.password} />

      <TextField
        ref={confirmRef}
        label={t('register.confirmPassword')}
        icon="shield-checkmark-outline"
        value={form.confirm}
        onChangeText={set('confirm')}
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

      <PrimaryButton title={t('register.submit')} onPress={onSubmit} loading={loading} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{t('register.haveAccount')}</Text>
        <Pressable onPress={() => {
            Keyboard.dismiss();
            router.replace('/login');
          }} hitSlop={8} accessibilityRole="link">
          <Text style={styles.link}>{t('register.login')}</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  link: { color: Brand.green, fontSize: 14.5, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  footerText: { color: Brand.muted, fontSize: 15 },

  successWrap: { alignItems: 'center', gap: 18, paddingVertical: 8 },
  successRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,176,75,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { color: Brand.body, fontSize: 16, lineHeight: 26, textAlign: 'center' },
});
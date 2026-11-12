import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { fetchProfile, updateBasicProfile } from '@/api/profile';
import { CountryPicker } from '@/components/country-picker';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ------------------------------------------------------------------ */
/*  حقل إدخال أنيق (معرّف خارج الشاشة حتى لا يفقد التركيز أثناء الكتابة) */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  required?: boolean;
  icon: IconName;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** للبريد والهاتف: يبقى النص من اليسار لليمين حتى في العربية */
  ltr?: boolean;
  isArabic: boolean;
}

function Field({
  label,
  required,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  ltr,
  isArabic,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left' }]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputBox,
          { flexDirection: isArabic ? 'row-reverse' : 'row' },
          focused && styles.inputBoxFocused,
        ]}
      >
        <Ionicons name={icon} size={19} color={focused ? Brand.green : '#9AA9A0'} />
        <TextInput
          style={[
            styles.input,
            ltr
              ? { textAlign: 'left', writingDirection: 'ltr' }
              : { textAlign: isArabic ? 'right' : 'left' },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B2BDB6"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  الشاشة                                                             */
/* ------------------------------------------------------------------ */

export default function EditProfileScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await fetchProfile();
      if (data) {
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setOriginalEmail(data.email || '');
        setCountry(data.country || '');
        setPhoneNumber(data.phoneNumber || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // للعرض فقط: هل غيّر المستخدم بريده الإلكتروني؟
  const emailChanged =
    originalEmail.length > 0 &&
    email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !country.trim()) {
      Alert.alert(
        isArabic ? 'تنبيه' : 'Alert',
        isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields'
      );
      return;
    }

    setSaving(true);
    try {
      const res = await updateBasicProfile({ firstName, lastName, email, country, phoneNumber });
      if (res.success) {
        const baseMessage = isArabic ? 'تم تحديث البيانات بنجاح' : 'Profile updated successfully';
        const emailNote = emailChanged
          ? isArabic
            ? '\nتم إرسال رابط تأكيد إلى بريدك الإلكتروني الجديد.'
            : '\nA confirmation link was sent to your new email.'
          : '';
        Alert.alert(isArabic ? 'نجاح' : 'Success', baseMessage + emailNote);
        router.back();
      } else {
        Alert.alert(isArabic ? 'خطأ' : 'Error', res.message || 'Failed to update');
      }
    } catch (error: any) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', error?.serverMessage || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
      </View>
    );
  }

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  const rowDir = isArabic ? 'row-reverse' : 'row';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* ---------- Hero ---------- */}
        <LinearGradient
          colors={[Brand.deep, Brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.heroTopRow, { paddingTop: insets.top + 10, flexDirection: rowDir }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.heroTitle}>{isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroBody}>
            <View style={styles.initialsRing}>
              <View style={styles.initialsCircle}>
                {initials ? (
                  <Text style={styles.initialsText}>{initials}</Text>
                ) : (
                  <Ionicons name="person" size={32} color={Brand.green} />
                )}
              </View>
            </View>
            <Text style={styles.heroSubtitle}>
              {isArabic
                ? 'حافظ على بياناتك محدّثة ليسهل علينا خدمتك'
                : 'Keep your details up to date so we can serve you better'}
            </Text>
          </View>

          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
        </LinearGradient>

        <View style={styles.body}>
          {/* ---------- Basic info ---------- */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
              <View style={[styles.cardIcon, { backgroundColor: '#EDF6F0' }]}>
                <Ionicons name="person-outline" size={20} color={Brand.green} />
              </View>
              <Text style={styles.cardTitle}>{isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</Text>
            </View>

            <View style={[styles.nameRow, { flexDirection: rowDir }]}>
              <View style={{ flex: 1 }}>
                <Field
                  label={isArabic ? 'الاسم الأول' : 'First Name'}
                  required
                  icon="person-outline"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={isArabic ? 'أحمد' : 'Ahmad'}
                  isArabic={isArabic}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={isArabic ? 'اسم العائلة' : 'Last Name'}
                  required
                  icon="people-outline"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={isArabic ? 'خليل' : 'Khalil'}
                  isArabic={isArabic}
                />
              </View>
            </View>
          </View>

          {/* ---------- Contact ---------- */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
              <View style={[styles.cardIcon, { backgroundColor: '#EAF2FC' }]}>
                <Ionicons name="mail-outline" size={20} color="#2E86DE" />
              </View>
              <Text style={styles.cardTitle}>{isArabic ? 'معلومات التواصل' : 'Contact Details'}</Text>
            </View>

            <Field
              label={isArabic ? 'البريد الإلكتروني' : 'Email'}
              required
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              ltr
              isArabic={isArabic}
            />

            {emailChanged ? (
              <View style={[styles.notice, { flexDirection: rowDir }]}>
                <Ionicons name="information-circle" size={20} color="#D68910" />
                <Text style={[styles.noticeText, { textAlign: isArabic ? 'right' : 'left' }]}>
                  {isArabic
                    ? 'عند تغيير بريدك الإلكتروني سنرسل رابط تأكيد إلى البريد الجديد، يرجى تأكيده للمحافظة على حسابك مفعّلاً.'
                    : "When you change your email we'll send a confirmation link to the new address. Please confirm it to keep your account verified."}
                </Text>
              </View>
            ) : null}

            <Field
              label={isArabic ? 'رقم الهاتف' : 'Phone Number'}
              icon="call-outline"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+970 59 123 4567"
              keyboardType="phone-pad"
              ltr
              isArabic={isArabic}
            />
          </View>

          {/* ---------- Location ---------- */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
              <View style={[styles.cardIcon, { backgroundColor: '#FEF3E2' }]}>
                <Ionicons name="earth-outline" size={20} color="#F39C12" />
              </View>
              <Text style={styles.cardTitle}>{isArabic ? 'الموقع' : 'Location'}</Text>
            </View>

            <CountryPicker
              label={isArabic ? 'الدولة' : 'Country'}
              value={country}
              onSelect={setCountry}
            />
          </View>

          <Text style={[styles.legend, { textAlign: isArabic ? 'right' : 'left' }]}>
            {isArabic ? '* حقول مطلوبة' : '* Required fields'}
          </Text>
        </View>
      </ScrollView>

      {/* ---------- Sticky save bar ---------- */}
      <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            saving && styles.saveButtonDisabled,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>{isArabic ? 'حفظ التغييرات' : 'Save Changes'}</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Hero */
  hero: {
    paddingBottom: 62,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  heroTopRow: { alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  heroBody: { alignItems: 'center', marginTop: 18, zIndex: 2 },
  initialsRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: 26, fontWeight: '900', color: Brand.green },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  decorCircleOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.05)',
    right: -60,
    top: -60,
  },
  decorCircleTwo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(46,204,113,0.16)',
    left: -30,
    bottom: -30,
  },

  /* Body */
  body: { paddingHorizontal: 20, marginTop: -36, gap: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#EDF1EE',
    shadowColor: '#173C2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: Brand.greenText },
  nameRow: { gap: 12 },

  /* Field */
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: '800', color: Brand.muted },
  required: { color: '#E74C3C', fontWeight: '900' },
  inputBox: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAF9',
    borderWidth: 1.5,
    borderColor: '#E4EBE6',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputBoxFocused: { borderColor: Brand.green, backgroundColor: '#FFF' },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: Brand.greenText },

  /* Notice */
  notice: {
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F8E2B4',
    borderRadius: 14,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 19, color: '#8A5A0B' },

  legend: { fontSize: 11, color: '#9AA9A0', paddingHorizontal: 4 },

  /* Save bar */
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF1EE',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
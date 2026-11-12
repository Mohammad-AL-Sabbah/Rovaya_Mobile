import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import {
  deleteMedicalProfile,
  fetchMedicalProfile,
  saveMedicalProfile,
} from '@/api/profile';

const MAX_LENGTH = 500;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface FormValues {
  chronicDiseases: string;
  currentMedications: string;
  allergies: string;
}

const EMPTY: FormValues = { chronicDiseases: '', currentMedications: '', allergies: '' };

/* ------------------------------------------------------------------ */
/*  بطاقة حقل واحدة (معرّفة خارج الشاشة حتى لا يفقد الحقل التركيز)     */
/* ------------------------------------------------------------------ */

interface FieldCardProps {
  icon: IconName;
  tint: string;
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  chips: string[];
  noneLabel: string;
  separator: string;
}

function FieldCard({
  icon,
  tint,
  title,
  subtitle,
  placeholder,
  value,
  onChange,
  chips,
  noneLabel,
  separator,
}: FieldCardProps) {
  const addChip = (chip: string) => {
    const current = value.trim();
    if (current.toLowerCase().includes(chip.toLowerCase())) return;
    // إذا كان الحقل "لا يوجد" نستبدله بدل أن نلصق عليه
    if (!current || current === noneLabel) {
      onChange(chip);
      return;
    }
    onChange(`${current}${separator}${chip}`.slice(0, MAX_LENGTH));
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${tint}1A` }]}>
          <Ionicons name={icon} size={22} color={tint} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        placeholderTextColor="#9AA9A0"
        textAlignVertical="top"
      />

      <View style={styles.chipsRow}>
        {chips.map((chip) => (
          <Pressable key={chip} onPress={() => addChip(chip)} style={styles.chip}>
            <Ionicons name="add" size={14} color={Brand.green} />
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => onChange(noneLabel)} style={[styles.chip, styles.chipNone]}>
          <Text style={[styles.chipText, { color: Brand.muted }]}>{noneLabel}</Text>
        </Pressable>
      </View>

      <Text style={styles.counter}>
        {value.length}/{MAX_LENGTH}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  الشاشة                                                             */
/* ------------------------------------------------------------------ */

export default function MedicalProfileScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';
  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<FormValues>(EMPTY);
  const [saved, setSaved] = useState<FormValues>(EMPTY);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadMedicalProfile = useCallback(async () => {
    try {
      const data = await fetchMedicalProfile();
      if (data) {
        const values: FormValues = {
          chronicDiseases: data.chronicDiseases || '',
          currentMedications: data.currentMedications || '',
          allergies: data.allergies || '',
        };
        setForm(values);
        setSaved(values);
        setLastUpdated(data.id ? data.lastUpdated || null : null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicalProfile();
  }, [loadMedicalProfile]);

  const setField = (key: keyof FormValues) => (text: string) =>
    setForm((prev) => ({ ...prev, [key]: text }));

  const hasChanges = useMemo(
    () =>
      form.chronicDiseases !== saved.chronicDiseases ||
      form.currentMedications !== saved.currentMedications ||
      form.allergies !== saved.allergies,
    [form, saved]
  );

  const hasSavedData = useMemo(
    () => Object.values(saved).some((v) => v.trim().length > 0) || !!lastUpdated,
    [saved, lastUpdated]
  );

  const filledCount = useMemo(
    () => Object.values(form).filter((v) => v.trim().length > 0).length,
    [form]
  );

  const formattedDate = useMemo(() => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    if (isNaN(date.getTime())) return null;
    try {
      return date.toLocaleDateString(isArabic ? 'ar' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }, [lastUpdated, isArabic]);

  const getErrorMessage = (err: any, fallbackAr: string, fallbackEn: string) => {
    if (err?.kind === 'network' || err?.kind === 'timeout') {
      return tr(
        'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
        'Could not reach the server. Check your connection and try again.'
      );
    }
    if (isArabic && typeof err?.serverMessage === 'string' && err.serverMessage) {
      return err.serverMessage;
    }
    return tr(fallbackAr, fallbackEn);
  };

  const handleBack = () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      tr('تغييرات غير محفوظة', 'Unsaved changes'),
      tr('لديك تغييرات لم يتم حفظها. هل تريد الخروج بدون حفظ؟', 'You have unsaved changes. Leave without saving?'),
      [
        { text: tr('البقاء', 'Stay'), style: 'cancel' },
        { text: tr('خروج', 'Leave'), style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMedicalProfile({
        chronicDiseases: form.chronicDiseases.trim(),
        currentMedications: form.currentMedications.trim(),
        allergies: form.allergies.trim(),
      });
      Alert.alert(
        tr('تم الحفظ', 'Saved'),
        tr('تم حفظ ملفك الطبي بنجاح.', 'Your medical profile was saved successfully.'),
        [{ text: tr('حسناً', 'OK'), onPress: () => router.back() }]
      );
      setSaved(form);
    } catch (err: any) {
      Alert.alert(
        tr('خطأ', 'Error'),
        getErrorMessage(err, 'فشل في حفظ الملف الطبي', 'Failed to save the medical profile')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      tr('حذف الملف الطبي', 'Delete medical profile'),
      tr(
        'سيتم حذف جميع معلوماتك الطبية نهائياً. هل أنت متأكد؟',
        'All your medical information will be permanently deleted. Are you sure?'
      ),
      [
        { text: tr('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: tr('حذف', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMedicalProfile();
              setForm(EMPTY);
              setSaved(EMPTY);
              setLastUpdated(null);
              Alert.alert(tr('تم', 'Done'), tr('تم حذف الملف الطبي.', 'Medical profile deleted.'));
            } catch (err: any) {
              Alert.alert(
                tr('خطأ', 'Error'),
                getErrorMessage(err, 'فشل في حذف الملف الطبي', 'Failed to delete the medical profile')
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
      </View>
    );
  }

  const separator = isArabic ? '، ' : ', ';
  const noneLabel = tr('لا يوجد', 'None');
  const canSave = hasChanges && !saving && !deleting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero */}
        <LinearGradient colors={[Brand.deep, Brand.green]} style={styles.hero}>
          <View style={{ paddingTop: insets.top + 10 }}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color="#FFF"
              />
            </Pressable>

            <View style={styles.heroBody}>
              <View style={styles.heroIcon}>
                <Ionicons name="heart" size={30} color="#FFF" />
              </View>
              <Text style={styles.heroTitle}>{tr('ملفك الطبي', 'Your Medical Profile')}</Text>
              <Text style={styles.heroSubtitle}>
                {tr(
                  'رحلتك أجمل عندما تكون آمناً. شاركنا ما يلزم لنهتم بك عند الحاجة.',
                  'Your trip is better when you feel safe. Tell us what matters so we can look after you when needed.'
                )}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Why this matters */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color={Brand.green} />
              <Text style={styles.infoTitle}>{tr('لماذا نسألك عن هذا؟', 'Why do we ask?')}</Text>
            </View>
            <Text style={styles.infoText}>
              {tr(
                'في حال حدوث أي طارئ أثناء رحلتك، تساعدنا هذه المعلومات على التصرف بسرعة ودقة، مثل معرفة أدويتك أو حساسيتك قبل أي علاج. تعبئتها اختيارية، ويمكنك تعديلها أو حذفها في أي وقت.',
                'If an emergency happens during your trip, this information helps us act quickly and correctly, such as knowing your medications or allergies before any treatment. Filling it in is optional, and you can edit or delete it at any time.'
              )}
            </Text>

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(filledCount / 3) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {tr(`${filledCount} من 3`, `${filledCount} of 3`)}
              </Text>
            </View>

            {formattedDate ? (
              <View style={styles.updatedRow}>
                <Ionicons name="time-outline" size={14} color={Brand.muted} />
                <Text style={styles.updatedText}>
                  {tr('آخر تحديث: ', 'Last updated: ')}
                  {formattedDate}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Fields */}
          <FieldCard
            icon="pulse"
            tint="#E74C3C"
            title={tr('الأمراض المزمنة', 'Chronic Diseases')}
            subtitle={tr('أي حالة صحية طويلة الأمد تعاني منها', 'Any long-term health condition you have')}
            placeholder={tr('مثال: السكري، ضغط الدم...', 'e.g. Diabetes, high blood pressure...')}
            value={form.chronicDiseases}
            onChange={setField('chronicDiseases')}
            chips={
              isArabic
                ? ['السكري', 'ضغط الدم', 'الربو', 'أمراض القلب']
                : ['Diabetes', 'Hypertension', 'Asthma', 'Heart disease']
            }
            noneLabel={noneLabel}
            separator={separator}
          />

          <FieldCard
            icon="medkit"
            tint="#2E86DE"
            title={tr('الأدوية الحالية', 'Current Medications')}
            subtitle={tr('الأدوية التي تتناولها بانتظام وجرعاتها', 'Medicines you take regularly and their doses')}
            placeholder={tr('مثال: أنسولين، ميتفورمين 500 ملغ...', 'e.g. Insulin, Metformin 500 mg...')}
            value={form.currentMedications}
            onChange={setField('currentMedications')}
            chips={[]}
            noneLabel={noneLabel}
            separator={separator}
          />

          <FieldCard
            icon="warning"
            tint="#F39C12"
            title={tr('الحساسية', 'Allergies')}
            subtitle={tr('حساسية من طعام أو دواء أو غيره', 'Allergies to food, medicine or anything else')}
            placeholder={tr('مثال: البنسلين، المكسرات...', 'e.g. Penicillin, nuts...')}
            value={form.allergies}
            onChange={setField('allergies')}
            chips={
              isArabic
                ? ['البنسلين', 'المكسرات', 'اللاكتوز', 'الغبار']
                : ['Penicillin', 'Nuts', 'Lactose', 'Dust']
            }
            noneLabel={noneLabel}
            separator={separator}
          />

          {/* Delete */}
          {hasSavedData ? (
            <Pressable
              onPress={handleDelete}
              disabled={deleting || saving}
              style={[styles.deleteButton, (deleting || saving) && { opacity: 0.6 }]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                  <Text style={styles.deleteText}>
                    {tr('حذف الملف الطبي', 'Delete medical profile')}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>
                {hasChanges
                  ? tr('حفظ الملف الطبي', 'Save Medical Profile')
                  : tr('لا توجد تغييرات', 'No changes')}
              </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { alignItems: 'center', marginTop: 8, paddingHorizontal: 8 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },

  body: { paddingHorizontal: 20, marginTop: -36, gap: 16 },

  /* Info card */
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { fontSize: 15, fontWeight: '800', color: Brand.greenText },
  infoText: { fontSize: 13, lineHeight: 21, color: Brand.muted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E7EFEA',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Brand.green },
  progressText: { fontSize: 12, fontWeight: '800', color: Brand.green },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  updatedText: { fontSize: 12, color: Brand.muted },

  /* Field card */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9F0EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Brand.greenText },
  cardSubtitle: { fontSize: 12, color: Brand.muted, marginTop: 2 },
  input: {
    minHeight: 96,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E4EBE6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Brand.greenText,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF6F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipNone: { backgroundColor: '#F1F3F2' },
  chipText: { fontSize: 12, fontWeight: '700', color: Brand.green },
  counter: { fontSize: 11, color: '#9AA9A0', marginTop: 10, alignSelf: 'flex-end' },

  /* Delete */
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5C6C0',
    backgroundColor: '#FFF5F4',
  },
  deleteText: { color: '#E74C3C', fontSize: 14, fontWeight: '800' },

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
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
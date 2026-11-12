import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
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
  fetchEmergencyNumbers,
  addEmergencyNumber,
  removeEmergencyNumber,
} from '@/api/profile';

const MAX_NUMBERS = 5;
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/**
 * يوحّد شكل الرقم قبل الإرسال:
 * - يحول الأرقام العربية (٠١٢...) إلى إنجليزية
 * - يحذف المسافات والشرطات والأقواس
 * - يحتفظ بعلامة + فقط إن كانت في البداية
 */
const normalizePhone = (raw: string) => {
  const western = raw.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const cleaned = western.replace(/[^\d+]/g, '');
  const hasPlus = cleaned.startsWith('+');
  return (hasPlus ? '+' : '') + cleaned.replace(/\+/g, '');
};

const isValidPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS;
};

export default function EmergencyNumbersScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';

  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const isFull = numbers.length >= MAX_NUMBERS;

  const loadNumbers = useCallback(async () => {
    try {
      const data = await fetchEmergencyNumbers();
      setNumbers(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadNumbers();
      setLoading(false);
    })();
  }, [loadNumbers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNumbers();
    setRefreshing(false);
  };

  /** يحول خطأ الـ API إلى رسالة مناسبة للغة الحالية */
  const getErrorMessage = (err: any, fallbackAr: string, fallbackEn: string) => {
    if (err?.kind === 'network' || err?.kind === 'timeout') {
      return tr(
        'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
        'Could not reach the server. Check your connection and try again.'
      );
    }
    // رسائل الباك إند بالعربية، فنعرضها فقط عند استخدام الواجهة العربية
    if (isArabic && typeof err?.serverMessage === 'string' && err.serverMessage) {
      return err.serverMessage;
    }
    return tr(fallbackAr, fallbackEn);
  };

  const handleAdd = async () => {
    const phone = normalizePhone(newNumber);

    if (!phone) return;

    if (!isValidPhone(phone)) {
      setInputError(
        tr(
          `أدخل رقماً صحيحاً (من ${MIN_DIGITS} إلى ${MAX_DIGITS} رقماً)`,
          `Enter a valid number (${MIN_DIGITS} to ${MAX_DIGITS} digits)`
        )
      );
      return;
    }

    if (numbers.includes(phone)) {
      setInputError(tr('هذا الرقم مضاف مسبقاً', 'This number is already added'));
      return;
    }

    if (isFull) {
      setInputError(
        tr(
          `الحد الأقصى ${MAX_NUMBERS} أرقام`,
          `Maximum ${MAX_NUMBERS} numbers allowed`
        )
      );
      return;
    }

    setInputError(null);
    setSaving(true);
    try {
      await addEmergencyNumber(phone);
      setNewNumber('');
      await loadNumbers();
    } catch (err: any) {
      Alert.alert(
        tr('خطأ', 'Error'),
        getErrorMessage(err, 'فشل في إضافة الرقم', 'Failed to add the number')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (number: string) => {
    Alert.alert(
      tr('تأكيد الحذف', 'Confirm Delete'),
      tr(`هل تريد حذف الرقم ${number}؟`, `Delete ${number}?`),
      [
        { text: tr('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: tr('حذف', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setRemoving(number);
            try {
              await removeEmergencyNumber(number);
              await loadNumbers();
            } catch (err: any) {
              Alert.alert(
                tr('خطأ', 'Error'),
                getErrorMessage(err, 'فشل في حذف الرقم', 'Failed to delete the number')
              );
            } finally {
              setRemoving(null);
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

  const canAdd = !saving && !isFull && newNumber.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name={isArabic ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={Brand.green}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{tr('أرقام الطوارئ', 'Emergency Contacts')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Brand.green}
            colors={[Brand.green]}
          />
        }
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Brand.green} />
          <Text style={[styles.infoText, { textAlign: isArabic ? 'right' : 'left' }]}>
            {tr(
              'أضف أرقام أهلك أو أصدقائك المقربين، وسيتم التواصل معهم في حال حدوث أي طارئ أثناء رحلتك.',
              'Add the numbers of family or close friends. They will be contacted if an emergency happens during your trip.'
            )}
          </Text>
        </View>

        {/* Counter */}
        <View style={styles.counterRow}>
          <Text style={styles.sectionTitle}>
            {tr('الأرقام المضافة', 'Saved numbers')}
          </Text>
          <Text style={styles.counterText}>
            {numbers.length}/{MAX_NUMBERS}
          </Text>
        </View>

        {/* List */}
        <View style={styles.list}>
          {numbers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={36} color={Brand.muted} />
              <Text style={styles.emptyText}>
                {tr('لا توجد أرقام طوارئ مضافة بعد', 'No emergency numbers added yet')}
              </Text>
            </View>
          ) : (
            numbers.map((num) => (
              <View key={num} style={styles.numberItem}>
                <View style={styles.numberIcon}>
                  <Ionicons name="call" size={20} color={Brand.green} />
                </View>
                <Text style={styles.numberText}>{num}</Text>
                <Pressable
                  onPress={() => handleRemove(num)}
                  disabled={removing !== null}
                  style={styles.deleteButton}
                >
                  {removing === num ? (
                    <ActivityIndicator size="small" color="#E74C3C" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                  )}
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Add section */}
        {isFull ? (
          <Text style={styles.fullText}>
            {tr(
              `وصلت للحد الأقصى (${MAX_NUMBERS} أرقام). احذف رقماً لإضافة رقم جديد.`,
              `You reached the maximum (${MAX_NUMBERS} numbers). Delete one to add a new number.`
            )}
          </Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{tr('إضافة رقم جديد', 'Add a new number')}</Text>
            <View style={styles.addSection}>
              <TextInput
                style={[styles.input, inputError ? styles.inputError : null]}
                value={newNumber}
                onChangeText={(text) => {
                  setNewNumber(text);
                  if (inputError) setInputError(null);
                }}
                onSubmitEditing={handleAdd}
                placeholder={tr('مثال: +970599123456', 'e.g. +970599123456')}
                placeholderTextColor={Brand.muted}
                keyboardType="phone-pad"
                returnKeyType="done"
                maxLength={20}
                editable={!saving}
              />
              <Pressable
                onPress={handleAdd}
                disabled={!canAdd}
                style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name="add" size={24} color="#FFF" />
                )}
              </Pressable>
            </View>
            {inputError ? (
              <Text style={[styles.errorText, { textAlign: isArabic ? 'right' : 'left' }]}>
                {inputError}
              </Text>
            ) : (
              <Text style={[styles.hintText, { textAlign: isArabic ? 'right' : 'left' }]}>
                {tr(
                  'يفضل كتابة الرقم مع رمز الدولة.',
                  'Include the country code if possible.'
                )}
              </Text>
            )}
          </>
        )}

        <View style={{ height: Math.max(insets.bottom, 20) + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EE',
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Brand.greenText },
  content: { flex: 1, padding: 20 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EDF6F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20, color: Brand.greenText },

  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Brand.muted, marginBottom: 10 },
  counterText: { fontSize: 13, fontWeight: '800', color: Brand.green, marginBottom: 10 },

  list: { gap: 12, marginBottom: 24 },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EBE6',
    borderStyle: 'dashed',
    paddingVertical: 28,
  },
  emptyText: { textAlign: 'center', color: Brand.muted, fontSize: 14 },
  numberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EBE6',
  },
  numberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  // الأرقام تُعرض دائماً من اليسار لليمين حتى في الواجهة العربية
  numberText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Brand.greenText,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  addSection: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E4EBE6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Brand.greenText,
  },
  inputError: { borderColor: '#E74C3C' },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.5 },
  errorText: { color: '#E74C3C', fontSize: 12, marginTop: 8, paddingHorizontal: 4 },
  hintText: { color: Brand.muted, fontSize: 12, marginTop: 8, paddingHorizontal: 4 },
  fullText: {
    textAlign: 'center',
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
});
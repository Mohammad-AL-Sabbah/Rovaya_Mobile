import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

// ✅ استخدم الـ Backend الصحيح مباشرة
const BACKEND_URL = 'https://rovayabackend.runasp.net';

export default function PlannerScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';

  const [cities, setCities] = useState('رام الله, أريحا');
  const [days, setDays] = useState('2');
  const [people, setPeople] = useState('2');
  const [budget, setBudget] = useState('150');
  const [interests, setInterests] = useState('historical');
  
  const [loading, setLoading] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState<any>(null);

  const handleGenerateTrip = async () => {
    if (!cities || !days || !budget) {
      Alert.alert(isArabic ? 'تنبيه' : 'Alert', isArabic ? 'يرجى ملء الحقول الأساسية' : 'Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        cities: cities.split(',').map((c: string) => c.trim()),
        number_of_days: parseInt(days, 10),
        number_of_people: parseInt(people, 10),
        budget: parseFloat(budget),
        interests: interests.split(',').map((i: string) => i.trim()),
        start_date: new Date().toISOString().split('T')[0],
        activity_level: 'moderate',
      };

      console.log('📤 Sending to:', `${BACKEND_URL}/api/Customer/generate`);
      console.log('📋 Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BACKEND_URL}/api/Customer/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // إذا كان يتطلب Token، يمكنك إضافته هنا
          // 'Authorization': `Bearer YOUR_TOKEN`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      if (!responseText) {
        throw new Error(isArabic ? 'الاستجابة من السيرفر فارغة' : 'Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse error:', parseError);
        console.error('❌ Invalid JSON:', responseText.substring(0, 200));
        throw new Error(isArabic ? 'الاستجابة ليست بصيغة JSON صحيحة' : 'Invalid JSON response');
      }

      console.log('✅ Parsed result:', result);

      if (result.success && result.plan) {
        setGeneratedTrip(result.plan);
      } else {
        Alert.alert(
          isArabic ? 'خطأ' : 'Error', 
          result.message || (isArabic ? 'فشل في توليد الرحلة' : 'Failed to generate trip')
        );
      }
    } catch (error: any) {
      console.error('❌ Generate trip error:', error);
      Alert.alert(
        isArabic ? 'خطأ' : 'Error', 
        error.message || (isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnMap = () => {
    if (generatedTrip) {
      console.log('🗺️ Navigating to map with trip:', JSON.stringify(generatedTrip));
      router.push({
        pathname: '/trip/map',
        params: { tripData: JSON.stringify(generatedTrip) }
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>
          {isArabic ? 'جاري تصميم رحلتك الذكية...\n(قد يستغرق 30-60 ثانية)' : 'Designing your smart trip...\n(30-60 seconds)'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={40} color={Brand.gold} />
          <Text style={styles.headerTitle}>{t('tabs.planner.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('tabs.planner.description')}</Text>
        </View>

        {!generatedTrip ? (
          <View style={styles.form}>
            <Text style={styles.label}>{isArabic ? 'المدن المراد زيارتها' : 'Cities to visit'}</Text>
            <TextInput style={styles.input} value={cities} onChangeText={setCities} placeholder={isArabic ? "مثال: رام الله, أريحا" : "e.g., Ramallah, Jericho"} />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>{isArabic ? 'عدد الأيام' : 'Days'}</Text>
                <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>{isArabic ? 'عدد الأشخاص' : 'People'}</Text>
                <TextInput style={styles.input} value={people} onChangeText={setPeople} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>{isArabic ? 'الميزانية (دولار)' : 'Budget (USD)'}</Text>
            <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" />

            <Text style={styles.label}>{isArabic ? 'الاهتمامات' : 'Interests'}</Text>
            <TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder={isArabic ? "مثال: historical, nature, food" : "e.g., historical, nature, food"} />

            <Pressable onPress={handleGenerateTrip} style={styles.generateButton}>
              <Ionicons name="sparkles-outline" size={20} color={Brand.white} />
              <Text style={styles.generateButtonText}>
                {isArabic ? 'توليد الرحلة بالذكاء الاصطناعي' : 'Generate AI Trip'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={32} color={Brand.green} />
              <Text style={styles.resultTitle}>{generatedTrip.trip_title}</Text>
            </View>
            
            <Text style={styles.resultSummary}>{generatedTrip.summary}</Text>
            
            <View style={styles.resultStats}>
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={20} color={Brand.muted} />
                <Text style={styles.statText}>{generatedTrip.days.length} {isArabic ? 'أيام' : 'Days'}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="cash-outline" size={20} color={Brand.muted} />
                <Text style={styles.statText}>~${generatedTrip.total_estimated_cost}</Text>
              </View>
            </View>

            <Pressable onPress={handleViewOnMap} style={styles.mapButton}>
              <Ionicons name="map-outline" size={20} color={Brand.white} />
              <Text style={styles.mapButtonText}>
                {isArabic ? 'عرض المسار على الخريطة' : 'View Route on Map'}
              </Text>
            </Pressable>

            <Pressable onPress={() => setGeneratedTrip(null)} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>
                {isArabic ? 'تخطيط رحلة جديدة' : 'Plan a new trip'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, color: Brand.muted, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  header: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Brand.greenText, marginTop: 16 },
  headerSubtitle: { fontSize: 15, color: Brand.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  form: { paddingHorizontal: 20, gap: 16 },
  label: { fontSize: 14, fontWeight: '700', color: Brand.greenText, marginBottom: 6 },
  input: { backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Brand.greenText },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  generateButton: { backgroundColor: Brand.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  generateButtonText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  resultCard: { margin: 20, backgroundColor: Brand.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Brand.line },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  resultTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: Brand.greenText },
  resultSummary: { fontSize: 15, color: Brand.body, lineHeight: 24, marginBottom: 20 },
  resultStats: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 15, color: Brand.muted, fontWeight: '600' },
  mapButton: { backgroundColor: Brand.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  mapButtonText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  resetButton: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  resetButtonText: { color: Brand.muted, fontSize: 14, fontWeight: '700' },
});
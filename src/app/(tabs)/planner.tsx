import { Ionicons } from '@expo/vector-icons';
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
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';

const BACKEND_URL = 'https://rovayabackend.runasp.net';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ───────────── قائمة شاملة لمدن فلسطين (الضفة، غزة، الداخل) ─────────────
const ALL_CITIES: { id: string; ar: string; en: string }[] = [
  // الضفة الغربية
  { id: '1', ar: 'القدس', en: 'Jerusalem' },
  { id: '2', ar: 'رام الله', en: 'Ramallah' },
  { id: '3', ar: 'البيرة', en: 'Al-Bireh' },
  { id: '4', ar: 'نابلس', en: 'Nablus' },
  { id: '5', ar: 'أريحا', en: 'Jericho' },
  { id: '6', ar: 'بيت لحم', en: 'Bethlehem' },
  { id: '7', ar: 'بيت جالا', en: 'Beit Jala' },
  { id: '8', ar: 'بيت ساحور', en: 'Beit Sahour' },
  { id: '9', ar: 'الخليل', en: 'Hebron' },
  { id: '10', ar: 'دورا', en: 'Dura' },
  { id: '11', ar: 'يطا', en: 'Yatta' },
  { id: '12', ar: 'جنين', en: 'Jenin' },
  { id: '13', ar: 'طولكرم', en: 'Tulkarm' },
  { id: '14', ar: 'قلقيلية', en: 'Qalqilya' },
  { id: '15', ar: 'سلفيت', en: 'Salfit' },
  { id: '16', ar: 'طوباس', en: 'Tubas' },
  { id: '17', ar: 'أريحا', en: 'Jericho' },
  { id: '18', ar: 'بيرزيت', en: 'Birzeit' },
  // قطاع غزة
  { id: '19', ar: 'غزة', en: 'Gaza City' },
  { id: '20', ar: 'خان يونس', en: 'Khan Younis' },
  { id: '21', ar: 'رفح', en: 'Rafah' },
  { id: '22', ar: 'دير البلح', en: 'Deir al-Balah' },
  { id: '23', ar: 'جباليا', en: 'Jabalia' },
  { id: '24', ar: 'بيت لاهيا', en: 'Beit Lahiya' },
  { id: '25', ar: 'بيت حانون', en: 'Beit Hanoun' },
  { id: '26', ar: 'النصيرات', en: 'Al-Nuseirat' },
  // الداخل الفلسطيني (48)
  { id: '27', ar: 'عكا', en: 'Acre' },
  { id: '28', ar: 'يافا', en: 'Jaffa' },
  { id: '29', ar: 'حيفا', en: 'Haifa' },
  { id: '30', ar: 'الناصرة', en: 'Nazareth' },
  { id: '31', ar: 'اللد', en: 'Lydd' },
  { id: '32', ar: 'الرملة', en: 'Ramla' },
  { id: '33', ar: 'أم الفحم', en: 'Umm al-Fahm' },
  { id: '34', ar: 'الطيبة', en: 'Tayibe' },
  { id: '35', ar: 'بئر السبع', en: 'Beersheba' },
  { id: '36', ar: 'سخنين', en: 'Sakhnin' },
  { id: '37', ar: 'شفاعمرو', en: 'Shfar\'am' },
  { id: '38', ar: 'باقة الغربية', en: 'Baqa al-Gharbiyye' },
];

// ───────────── خيارات الاهتمامات ─────────────
const INTEREST_OPTIONS: { key: string; icon: IconName; ar: string; en: string }[] = [
  { key: 'historical', icon: 'hourglass-outline', ar: 'تاريخ', en: 'History' },
  { key: 'religious', icon: 'business-outline', ar: 'أماكن مقدسة', en: 'Holy sites' },
  { key: 'nature', icon: 'leaf-outline', ar: 'طبيعة', en: 'Nature' },
  { key: 'food', icon: 'restaurant-outline', ar: 'طعام', en: 'Food' },
  { key: 'culture', icon: 'color-palette-outline', ar: 'ثقافة وفن', en: 'Culture & arts' },
  { key: 'shopping', icon: 'bag-handle-outline', ar: 'تسوق', en: 'Shopping' },
  { key: 'adventure', icon: 'compass-outline', ar: 'مغامرة', en: 'Adventure' },
  { key: 'relaxation', icon: 'cafe-outline', ar: 'استرخاء', en: 'Relaxation' },
];

const BUDGET_PRESETS = [100, 150, 250, 400, 600];

async function getStoredToken(): Promise<string | null> {
  const candidateKeys = ['rovaya.accessToken', 'accessToken', 'token', 'userToken', 'rovaya.token'];
  for (const key of candidateKeys) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value && typeof value === 'string' && value.length > 10) return value;
    } catch { /* تجاهل */ }
  }
  return null;
}

/** عدّاد (+ / −) */
function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        hitSlop={8}
        style={[styles.stepBtn, atMin && styles.stepBtnOff]}
      >
        <Ionicons name="remove" size={20} color={atMin ? Brand.muted : Brand.green} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={atMax}
        hitSlop={8}
        style={[styles.stepBtn, atMax && styles.stepBtnOff]}
      >
        <Ionicons name="add" size={20} color={atMax ? Brand.muted : Brand.green} />
      </Pressable>
    </View>
  );
}

export default function PlannerScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = !!i18n.language?.startsWith('ar');
  const tr = (ar: string, en: string) => (isArabic ? ar : en);
  const pick = (ar?: string, en?: string) => (isArabic ? ar || en || '' : en || ar || '');

  // ───── حالة النموذج ─────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [days, setDays] = useState(2);
  const [people, setPeople] = useState(2);
  const [budget, setBudget] = useState('150');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['historical']);

  // ───── حالة النتيجة ─────
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState<any>(null);
  const [tripId, setTripId] = useState<number | null>(null);
  const [resultPeople, setResultPeople] = useState(1);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});

  // فلترة المدن بناءً على البحث
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return ALL_CITIES;
    const query = searchQuery.toLowerCase();
    return ALL_CITIES.filter(
      (c) => c.ar.toLowerCase().includes(query) || c.en.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleCity = (cityName: string) =>
    setSelectedCities((prev) => (prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]));

  const toggleInterest = (key: string) =>
    setSelectedInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const budgetNum = parseFloat(budget) || 0;
  const perPersonPerDay = budgetNum > 0 ? Math.round(budgetNum / Math.max(people, 1) / Math.max(days, 1)) : 0;

  const handleGenerateTrip = async () => {
    if (selectedCities.length === 0) {
      Alert.alert(tr('تنبيه', 'Alert'), tr('اختر مدينة واحدة على الأقل', 'Please select at least one city'));
      return;
    }
    if (budgetNum <= 0) {
      Alert.alert(tr('تنبيه', 'Alert'), tr('أدخل ميزانية صحيحة', 'Please enter a valid budget'));
      return;
    }

    setLoading(true);
    try {
      const token = await getStoredToken();
      if (!token) {
        Alert.alert(tr('غير مسجل الدخول', 'Not Logged In'), tr('يرجى تسجيل الدخول أولاً', 'Please login first'));
        return;
      }

      const requestBody = {
        cities: selectedCities,
        number_of_days: days,
        number_of_people: people,
        budget: budgetNum,
        interests: selectedInterests.length ? selectedInterests : ['historical'],
        start_date: new Date().toISOString().split('T')[0],
        // تم إزالة activity_level كما طلبت
      };

      const response = await fetch(`${BACKEND_URL}/api/Customer/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
      }
      const result = await response.json();

      if (result.success && result.plan) {
        const plan = result.plan;
        setGeneratedTrip(plan);
        setTripId(typeof result.trip_id === 'number' ? result.trip_id : null);
        setResultPeople(requestBody.number_of_people);
        setActivated(false);
        const open: Record<number, boolean> = {};
        (plan.days ?? []).forEach((_: any, i: number) => (open[i] = true));
        setOpenDays(open);
      } else {
        Alert.alert(tr('خطأ', 'Error'), result.message || tr('فشل في توليد الرحلة', 'Failed to generate trip'));
      }
    } catch (error: any) {
      Alert.alert(tr('خطأ', 'Error'), error?.message || tr('حدث خطأ', 'Error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrip = async () => {
    setActivating(true);
    try {
      const token = await getStoredToken();
      if (!token) {
        Alert.alert(tr('غير مسجل الدخول', 'Not Logged In'), tr('يرجى تسجيل الدخول أولاً', 'Please login first'));
        return;
      }

      let id = tripId;
      if (id == null) {
        const tripsRes = await fetch(`${BACKEND_URL}/api/Customer/my-trips`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tripsData = await tripsRes.json();
        id = tripsData?.data?.[0]?.id ?? null;
      }
      if (id == null) throw new Error('No trip id');

      const res = await fetch(`${BACKEND_URL}/api/Customer/activate-trip/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Activation failed');

      setActivated(true);
      Alert.alert(
        tr('تم بنجاح', 'Success'),
        tr('تم اعتماد الرحلة وجعلها نشطة! يمكنك رؤيتها في "رحلاتي".', 'Trip activated! You can find it in "My Trips".')
      );
    } catch {
      Alert.alert(tr('خطأ', 'Error'), tr('فشل في اعتماد الرحلة', 'Failed to activate trip'));
    } finally {
      setActivating(false);
    }
  };

  const handleViewOnMap = () => {
    if (generatedTrip) {
      router.push({ pathname: '/trip/map', params: { tripData: JSON.stringify(generatedTrip) } });
    }
  };

  const typeIcon = (type: string): IconName =>
    type === 'food' || type === 'meal' ? 'restaurant-outline' : type === 'visit' ? 'eye-outline' : 'star-outline';
  const typeLabel = (type: string) =>
    type === 'food' || type === 'meal' ? tr('طعام', 'Food') : type === 'visit' ? tr('زيارة', 'Visit') : tr('نشاط', 'Activity');

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>
          {tr('جاري تصميم رحلتك الذكية...\n(قد يستغرق 30-60 ثانية)', 'Designing your smart trip...\n(30-60 seconds)')}
        </Text>
      </View>
    );
  }

  const trip = generatedTrip;
  const tripDays: any[] = trip?.days ?? [];
  const allOpen = tripDays.length > 0 && tripDays.every((_, i) => openDays[i]);
  const canGenerate = selectedCities.length > 0 && budgetNum > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="sparkles" size={40} color={Brand.gold} />
          <Text style={styles.headerTitle}>{t('tabs.planner.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('tabs.planner.description')}</Text>
        </View>

        {!trip ? (
          <View style={styles.form}>
            {/* 1) الوجهة (محسّنة مع البحث والشرائح) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="location" size={18} color={Brand.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tr('إلى أين تريد الذهاب؟', 'Where do you want to go?')}</Text>
                  <Text style={styles.cardSub}>
                    {selectedCities.length > 0
                      ? tr(`${selectedCities.length} مدن مختارة`, `${selectedCities.length} selected`)
                      : tr('ابحث واختر مدينة أو أكثر', 'Search and pick one or more cities')}
                  </Text>
                </View>
                {selectedCities.length > 0 && (
                  <Pressable onPress={() => setSelectedCities([])} hitSlop={8}>
                    <Text style={styles.clearText}>{tr('مسح', 'Clear')}</Text>
                  </Pressable>
                )}
              </View>

              {/* عرض المدن المختارة كشرائح (Chips) */}
              {selectedCities.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedChipsContainer}>
                  {selectedCities.map((cityName) => {
                    const cityData = ALL_CITIES.find((c) => c.ar === cityName);
                    return (
                      <View key={cityName} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText}>{cityData ? tr(cityData.ar, cityData.en) : cityName}</Text>
                        <Pressable onPress={() => toggleCity(cityName)} hitSlop={6}>
                          <Ionicons name="close-circle" size={18} color={Brand.muted} />
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* حقل البحث */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={Brand.muted} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={tr('ابحث عن مدينة...', 'Search for a city...')}
                  placeholderTextColor={Brand.muted}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Brand.muted} />
                  </Pressable>
                )}
              </View>

              {/* قائمة النتائج المفلترة */}
              <View style={styles.cityList}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 220 }}>
                  {filteredCities.length === 0 ? (
                    <View style={styles.emptySearch}>
                      <Text style={styles.emptySearchText}>{tr('لا توجد نتائج', 'No results found')}</Text>
                    </View>
                  ) : (
                    filteredCities.map((c) => {
                      const active = selectedCities.includes(c.ar);
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => toggleCity(c.ar)}
                          style={[styles.cityRow, active && styles.cityRowActive]}
                        >
                          <Ionicons name="location-outline" size={18} color={active ? Brand.green : Brand.muted} />
                          <Text style={[styles.cityName, active && styles.cityNameActive]}>{tr(c.ar, c.en)}</Text>
                          <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                            {active && <Ionicons name="checkmark" size={16} color={Brand.white} />}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {selectedCities.length > days && (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#8B6914" />
                  <Text style={styles.hintText}>
                    {tr(
                      'عدد المدن أكبر من عدد الأيام، قد لا تُغطّى كل المدن.',
                      'You picked more cities than days, so not every city may be covered.'
                    )}
                  </Text>
                </View>
              )}
            </View>

            {/* 2) الأيام والأشخاص */}
            <View style={styles.row}>
              <View style={[styles.card, styles.half]}>
                <View style={styles.miniHeader}>
                  <Ionicons name="calendar-outline" size={18} color={Brand.green} />
                  <Text style={styles.miniTitle}>{tr('عدد الأيام', 'Days')}</Text>
                </View>
                <Stepper value={days} onChange={setDays} min={1} max={7} />
              </View>

              <View style={[styles.card, styles.half]}>
                <View style={styles.miniHeader}>
                  <Ionicons name="people-outline" size={18} color={Brand.green} />
                  <Text style={styles.miniTitle}>{tr('عدد الأشخاص', 'People')}</Text>
                </View>
                <Stepper value={people} onChange={setPeople} min={1} max={10} />
              </View>
            </View>

            {/* 3) الميزانية */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="cash" size={18} color={Brand.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tr('الميزانية الإجمالية', 'Total budget')}</Text>
                  <Text style={styles.cardSub}>{tr('لجميع الأشخاص، بالدولار', 'For everyone, in USD')}</Text>
                </View>
              </View>

              <View style={styles.budgetInputWrap}>
                <Text style={styles.budgetPrefix}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={budget}
                  onChangeText={(v) => setBudget(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  placeholder="150"
                  placeholderTextColor={Brand.muted}
                />
              </View>

              <View style={styles.chipsWrap}>
                {BUDGET_PRESETS.map((v) => {
                  const active = budgetNum === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setBudget(String(v))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>${v}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {perPersonPerDay > 0 && (
                <Text style={styles.budgetHint}>
                  {tr(
                    `≈ $${perPersonPerDay} للشخص في اليوم`,
                    `≈ $${perPersonPerDay} per person per day`
                  )}
                </Text>
              )}
            </View>

            {/* 4) الاهتمامات */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="heart" size={18} color={Brand.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tr('ما الذي يهمك؟', 'What are you into?')}</Text>
                  <Text style={styles.cardSub}>{tr('اختر ما يناسبك', 'Choose all that apply')}</Text>
                </View>
              </View>

              <View style={styles.chipsWrap}>
                {INTEREST_OPTIONS.map((o) => {
                  const active = selectedInterests.includes(o.key);
                  return (
                    <Pressable
                      key={o.key}
                      onPress={() => toggleInterest(o.key)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Ionicons name={o.icon} size={15} color={active ? Brand.white : Brand.green} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{tr(o.ar, o.en)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* الأزرار */}
            <Pressable
              onPress={handleGenerateTrip}
              disabled={!canGenerate}
              style={[styles.generateButton, !canGenerate && styles.disabledButton]}
            >
              <Ionicons name="sparkles-outline" size={20} color={Brand.white} />
              <Text style={styles.generateButtonText}>{tr('توليد الرحلة بالذكاء الاصطناعي', 'Generate AI Trip')}</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/my-trips')} style={styles.archiveButton}>
              <Ionicons name="folder-open-outline" size={20} color={Brand.green} />
              <Text style={styles.archiveButtonText}>{tr('عرض رحلاتي المحفوظة', 'View My Saved Trips')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            {/* رأس الرحلة */}
            <View style={styles.tripHeader}>
              <Ionicons name="checkmark-circle" size={32} color={Brand.green} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tripTitle}>{pick(trip.trip_title, trip.trip_title_en)}</Text>
              </View>
            </View>

            <Text style={styles.tripSummary}>{pick(trip.summary, trip.summary_en)}</Text>

            {!!trip.warning && (
              <View style={styles.warnBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#8B6914" />
                <Text style={styles.warnText}>
                  {tr('قد تتجاوز التكلفة التقديرية الميزانية المحددة قليلًا.', 'The estimated cost may slightly exceed your budget.')}
                </Text>
              </View>
            )}

            <View style={styles.tripStats}>
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={18} color={Brand.green} />
                <Text style={styles.statText}>
                  {tripDays.length} {tr('أيام', 'Days')}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="people-outline" size={18} color={Brand.green} />
                <Text style={styles.statText}>{resultPeople}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="cash-outline" size={18} color={Brand.green} />
                <Text style={styles.statText}>~${trip.total_estimated_cost}</Text>
              </View>
            </View>

            {/* الأزرار الرئيسية */}
            <View style={styles.actionsContainer}>
              <Pressable onPress={handleViewOnMap} style={[styles.actionButton, styles.primaryButton]}>
                <Ionicons name="map-outline" size={20} color={Brand.white} />
                <Text style={styles.primaryButtonText}>{tr('عرض المسار على الخريطة', 'View Route on Map')}</Text>
              </Pressable>

              <Pressable
                onPress={handleActivateTrip}
                disabled={activating || activated}
                style={[styles.actionButton, styles.secondaryButton, (activating || activated) && styles.disabledButton]}
              >
                {activating ? (
                  <ActivityIndicator size="small" color={Brand.white} />
                ) : (
                  <>
                    <Ionicons name={activated ? 'checkmark-circle' : 'star-outline'} size={20} color={Brand.white} />
                    <Text style={styles.secondaryButtonText}>
                      {activated ? tr('الرحلة نشطة', 'Trip is active') : tr('اعتماد الرحلة وجعلها نشطة', 'Activate Trip')}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* عنوان القسم + فتح/طي الكل */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{tr('برنامج الرحلة', 'Itinerary')}</Text>
              <Pressable
                onPress={() => {
                  const next: Record<number, boolean> = {};
                  tripDays.forEach((_, i) => (next[i] = !allOpen));
                  setOpenDays(next);
                }}
                hitSlop={8}
              >
                <Text style={styles.toggleAll}>{allOpen ? tr('طي الكل', 'Collapse all') : tr('فتح الكل', 'Expand all')}</Text>
              </Pressable>
            </View>

            {/* الأيام والأنشطة */}
            {tripDays.map((day: any, dayIndex: number) => {
              const open = !!openDays[dayIndex];
              return (
                <View key={dayIndex} style={styles.dayCard}>
                  <Pressable
                    onPress={() => setOpenDays((p) => ({ ...p, [dayIndex]: !p[dayIndex] }))}
                    style={styles.dayHeader}
                  >
                    <View style={styles.dayNumberBadge}>
                      <Text style={styles.dayNumberText}>{day.day_number}</Text>
                    </View>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayTitle}>{pick(day.theme, day.theme_en)}</Text>
                      <View style={styles.dayMeta}>
                        <Ionicons name="location-outline" size={14} color={Brand.muted} />
                        <Text style={styles.dayMetaText}>{pick(day.city, day.city_en)}</Text>
                        <Ionicons name="calendar-outline" size={14} color={Brand.muted} style={{ marginStart: 10 }} />
                        <Text style={styles.dayMetaText}>{day.date}</Text>
                      </View>
                    </View>
                    <View style={styles.dayCostBadge}>
                      <Text style={styles.dayCostText}>${day.daily_cost}</Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={Brand.muted} />
                  </Pressable>

                  {open &&
                    (day.activities ?? []).map((activity: any, actIndex: number) => {
                      const name = pick(activity.place_name, activity.place_name_en);
                      const tips = pick(activity.tips, activity.tips_en);
                      return (
                        <View key={actIndex} style={styles.activityCard}>
                          <View style={styles.activityTime}>
                            <Text style={styles.activityTimeText}>{activity.time}</Text>
                            <Text style={styles.activityTimeEnd}>{activity.end_time}</Text>
                          </View>
                          <View style={styles.activityDivider} />
                          <View style={styles.activityContent}>
                            <View style={styles.activityTypeBadge}>
                              <Ionicons name={typeIcon(activity.activity_type)} size={14} color={Brand.green} />
                              <Text style={styles.activityTypeText}>{typeLabel(activity.activity_type)}</Text>
                            </View>

                            <Text style={styles.activityPlaceName}>{name}</Text>

                            <Text style={styles.activityDescription}>
                              {pick(activity.description, activity.description_en)}
                            </Text>

                            <View style={styles.activityFooter}>
                              <View style={styles.activityCost}>
                                <Ionicons name="cash-outline" size={14} color={Brand.gold} />
                                <Text style={styles.activityCostText}>
                                  ${activity.cost_per_person} / {tr('شخص', 'person')}
                                </Text>
                              </View>
                            </View>

                            {!!tips && (
                              <View style={styles.tipsBox}>
                                <Ionicons name="bulb-outline" size={16} color={Brand.gold} />
                                <Text style={styles.tipsText}>{tips}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                </View>
              );
            })}

            <Pressable onPress={() => router.push('/my-trips')} style={[styles.actionButton, styles.outlineButton]}>
              <Ionicons name="folder-open-outline" size={20} color={Brand.muted} />
              <Text style={styles.outlineButtonText}>{tr('عرض جميع رحلاتي', 'View All My Trips')}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setGeneratedTrip(null);
                setTripId(null);
                setActivated(false);
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>{tr('تخطيط رحلة جديدة', 'Plan a new trip')}</Text>
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
  header: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Brand.greenText, marginTop: 14 },
  headerSubtitle: { fontSize: 15, color: Brand.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  form: { paddingHorizontal: 20, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  card: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: Brand.greenText },
  cardSub: { fontSize: 12, color: Brand.muted, fontWeight: '600', marginTop: 2 },
  clearText: { fontSize: 13, fontWeight: '800', color: Brand.green },

  // أنماط البحث والشرائح الجديدة
  selectedChipsContainer: { flexDirection: 'row', flexGrow: 0 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.mint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedChipText: { fontSize: 13, fontWeight: '700', color: Brand.green },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8F5',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Brand.greenText, paddingVertical: 10 },
  emptySearch: { paddingVertical: 20, alignItems: 'center' },
  emptySearchText: { color: Brand.muted, fontSize: 14 },

  cityList: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Brand.white,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityRowActive: { backgroundColor: '#F0F9F3' },
  cityName: { flex: 1, fontSize: 15, fontWeight: '600', color: Brand.greenText },
  cityNameActive: { fontWeight: '800', color: Brand.green },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: Brand.green, borderColor: Brand.green },

  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniTitle: { fontSize: 14, fontWeight: '800', color: Brand.greenText },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F4F8F5',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  chipActive: { backgroundColor: Brand.green, borderColor: Brand.green },
  chipText: { fontSize: 14, fontWeight: '700', color: Brand.greenText },
  chipTextActive: { color: Brand.white },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E7',
    padding: 10,
    borderRadius: 12,
  },
  hintText: { flex: 1, fontSize: 12, color: '#8B6914', fontWeight: '600' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.5 },
  stepValue: { fontSize: 26, fontWeight: '900', color: Brand.greenText },

  budgetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8F5',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  budgetPrefix: { fontSize: 22, fontWeight: '900', color: Brand.green },
  budgetInput: { flex: 1, fontSize: 22, fontWeight: '900', color: Brand.greenText, paddingVertical: 12 },
  budgetHint: { fontSize: 12.5, fontWeight: '700', color: Brand.muted },

  generateButton: {
    backgroundColor: Brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  generateButtonText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.white,
  },
  archiveButtonText: { color: Brand.green, fontSize: 15, fontWeight: '700' },

  // ───── النتيجة ─────
  resultContainer: { paddingHorizontal: 20 },
  tripHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  tripTitle: { fontSize: 22, fontWeight: '900', color: Brand.greenText },
  tripSummary: { fontSize: 15, color: Brand.body, lineHeight: 24, marginBottom: 16, paddingHorizontal: 4 },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 12.5, color: '#8B6914', fontWeight: '600' },
  tripStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  statText: { fontSize: 15, color: Brand.green, fontWeight: '700' },

  actionsContainer: { gap: 12, marginBottom: 24 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryButton: { backgroundColor: Brand.green },
  primaryButtonText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { backgroundColor: Brand.gold },
  secondaryButtonText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  outlineButton: { backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line, marginTop: 8 },
  outlineButtonText: { color: Brand.muted, fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  resetButton: { alignItems: 'center', marginTop: 8, paddingVertical: 12 },
  resetButtonText: { color: Brand.muted, fontSize: 14, fontWeight: '700' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Brand.greenText },
  toggleAll: { fontSize: 13, fontWeight: '700', color: Brand.green },

  dayCard: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: { color: Brand.white, fontSize: 18, fontWeight: '900' },
  dayInfo: { flex: 1 },
  dayTitle: { fontSize: 16, fontWeight: '800', color: Brand.greenText, marginBottom: 4 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dayMetaText: { fontSize: 12, color: Brand.muted, fontWeight: '600' },
  dayCostBadge: { backgroundColor: Brand.gold, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dayCostText: { color: Brand.white, fontSize: 13, fontWeight: '800' },

  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FBFA',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8EDE9',
  },
  activityTime: { width: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  activityTimeText: { fontSize: 14, fontWeight: '800', color: Brand.green },
  activityTimeEnd: { fontSize: 11, color: Brand.muted },
  activityDivider: { width: 2, backgroundColor: Brand.line, marginHorizontal: 10 },
  activityContent: { flex: 1 },
  activityTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activityTypeText: { fontSize: 11, fontWeight: '700', color: Brand.green },
  activityPlaceName: { fontSize: 15, fontWeight: '800', color: Brand.greenText },
  activityDescription: { fontSize: 13, color: Brand.body, lineHeight: 20, marginTop: 6, marginBottom: 10 },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityCost: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityCostText: { fontSize: 13, fontWeight: '700', color: Brand.gold },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8E7',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  tipsText: { flex: 1, fontSize: 12, color: '#8B6914', lineHeight: 18, fontStyle: 'italic' },
});
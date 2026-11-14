import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Brand } from '@/constants/brand';

const BACKEND_URL = 'https://rovayabackend.runasp.net';

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

function extractTripMeta(itineraryJson: string, fallbackTitle: string) {
  try {
    const plan = JSON.parse(itineraryJson);
    return {
      titleAr: plan.trip_title || fallbackTitle,
      titleEn: plan.trip_title_en || plan.trip_title || fallbackTitle,
    };
  } catch {
    return { titleAr: fallbackTitle, titleEn: fallbackTitle };
  }
}

export default function MyTripsArchivedScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const isArabic = !!i18n.language?.startsWith('ar');
  const tr = (ar: string, en: string) => (isArabic ? ar : en);
  const pick = (ar?: string, en?: string) => (isArabic ? (ar || en || '') : (en || ar || ''));

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getStoredToken();
      if (!token) { setLoading(false); return; }

      const response = await fetch(`${BACKEND_URL}/api/Customer/my-trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.data) {
        const archivedTrips = data.data.filter((trip: any) => trip.status === 2);
        archivedTrips.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTrips(archivedTrips);
      }
    } catch (error) {
      console.error('Fetch archived trips error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const languageKey = i18n.language;

  const handleActivate = async (tripId: number) => {
    setActionLoading(tripId);
    try {
      const token = await getStoredToken();
      const response = await fetch(`${BACKEND_URL}/api/Customer/activate-trip/${tripId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        Alert.alert(tr('نجاح', 'Success'), tr('تم تفعيل الرحلة', 'Trip activated'));
        fetchTrips();
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      Alert.alert(tr('خطأ', 'Error'), tr('فشل في التفعيل', 'Activation failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (tripId: number, tripTitle: string) => {
    Alert.alert(
      tr('تأكيد الحذف', 'Confirm Delete'),
      tr(`هل أنت متأكد من حذف "${tripTitle}" نهائياً؟`, `Permanently delete "${tripTitle}"?`),
      [
        { text: tr('إلغاء', 'Cancel'), style: 'cancel' },
        {
          text: tr('حذف', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(tripId);
            try {
              const token = await getStoredToken();
              const response = await fetch(`${BACKEND_URL}/api/Customer/delete-trip/${tripId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                fetchTrips();
              } else {
                throw new Error('Failed');
              }
            } catch (error) {
              Alert.alert(tr('خطأ', 'Error'), tr('فشل في الحذف', 'Delete failed'));
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleViewMap = (itineraryJson: string) => {
    try {
      const plan = JSON.parse(itineraryJson);
      router.push({ pathname: '/trip/map', params: { tripData: JSON.stringify(plan) } });
    } catch (e) {
      Alert.alert(tr('خطأ', 'Error'), tr('بيانات الرحلة غير صالحة', 'Invalid trip data'));
    }
  };

  const renderTripItem = useCallback(({ item }: { item: any }) => {
    const meta = extractTripMeta(item.itineraryJson, item.tripTitle);
    const displayTitle = pick(meta.titleAr, meta.titleEn);

    return (
      <View style={styles.tripCard}>
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Ionicons name="archive-outline" size={16} color={Brand.muted} />
            <Text style={styles.statusText}>
              {tr('مؤرشفة', 'Archived')}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString(isArabic ? 'ar-PS' : 'en-US')}
          </Text>
        </View>

        <Text style={styles.tripTitle} numberOfLines={2}>{displayTitle}</Text>

        <View style={styles.tripMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={Brand.muted} />
            <Text style={styles.metaText}>{item.startDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={16} color={Brand.muted} />
            <Text style={styles.metaText}>${item.totalBudget}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => handleViewMap(item.itineraryJson)}
            style={[styles.actionBtn, styles.mapBtn]}
          >
            <Ionicons name="map-outline" size={18} color={Brand.white} />
            <Text style={styles.mapBtnText}>{tr('الخريطة', 'Map')}</Text>
          </Pressable>

          <Pressable
            onPress={() => handleActivate(item.id)}
            disabled={actionLoading === item.id}
            style={[styles.actionBtn, styles.activateBtn, actionLoading === item.id && styles.disabledBtn]}
          >
            {actionLoading === item.id ? (
              <ActivityIndicator size="small" color={Brand.white} />
            ) : (
              <>
                <Ionicons name="star-outline" size={18} color={Brand.white} />
                <Text style={styles.activateBtnText}>{tr('تفعيل', 'Activate')}</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleDelete(item.id, displayTitle)}
            disabled={actionLoading === item.id}
            style={[styles.actionBtn, styles.deleteBtn]}
          >
            <Ionicons name="trash-outline" size={18} color={Brand.danger || '#E74C3C'} />
          </Pressable>
        </View>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageKey, actionLoading, isArabic]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>
          {tr('جاري تحميل الأرشيف...', 'Loading archive...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={Brand.green} />
        </Pressable>
        <Text style={styles.headerTitle}>{tr('الأرشيف', 'Archived Trips')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="archive-outline" size={64} color={Brand.muted} />
          <Text style={styles.emptyTitle}>{tr('لا توجد رحلات مؤرشفة', 'No archived trips')}</Text>
          <Text style={styles.emptySubtitle}>
            {tr('الرحلات التي تكملها أو تحذفها ستظهر هنا', 'Completed or deleted trips will appear here')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTripItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, color: Brand.muted, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Brand.line },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Brand.greenText },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Brand.greenText, marginTop: 16 },
  emptySubtitle: { fontSize: 15, color: Brand.muted, textAlign: 'center', marginTop: 8 },

  tripCard: { backgroundColor: Brand.white, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Brand.line },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.mint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700', color: Brand.muted },
  dateText: { fontSize: 12, color: Brand.muted, fontWeight: '600' },
  tripTitle: { fontSize: 18, fontWeight: '800', color: Brand.greenText, marginBottom: 12, lineHeight: 24 },
  tripMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: Brand.body, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, flex: 1 },
  mapBtn: { backgroundColor: Brand.green, flex: 2 },
  mapBtnText: { color: Brand.white, fontSize: 14, fontWeight: '700' },
  activateBtn: { backgroundColor: Brand.gold, flex: 2 },
  activateBtnText: { color: Brand.white, fontSize: 14, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FECACA', flex: 1 },
  disabledBtn: { opacity: 0.6 },
});
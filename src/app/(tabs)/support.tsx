import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { useTabBarSpace } from '@/components/floating-tab-bar';
import { resolveMediaUrl } from '@/api/config';
import { createSupportTicket, getMySupportTickets, type SupportTicket } from '@/api/support';

type Filter = 'all' | 'open' | 'closed';

const MAX_IMAGES = 5;
const PROGRESS_STEPS = [0, 1, 2, 3];

/* ------------------------------------------------------------------ */
/* حقل إدخال بحالة تركيز واضحة                                          */
/* ------------------------------------------------------------------ */
type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
};

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA8A0"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

export default function SupportScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();
  const isArabic = !!i18n.language?.startsWith('ar');

  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  // مودال الإنشاء
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', phone: '' });
  const [images, setImages] = useState<any[]>([]);

  // مودال التفاصيل
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // معرض الصورة الكامل
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await getMySupportTickets();
      setTickets(data);
    } catch (error: any) {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        error?.message || (isArabic ? 'حدث خطأ غير متوقع' : 'Unexpected error occurred'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isArabic]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const isClosed = (s: number) => s === 3 || s === 4;

  const counts = useMemo(() => {
    const closed = tickets.filter((t) => isClosed(t.status)).length;
    return { all: tickets.length, open: tickets.length - closed, closed };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    if (filter === 'open') return tickets.filter((t) => !isClosed(t.status));
    if (filter === 'closed') return tickets.filter((t) => isClosed(t.status));
    return tickets;
  }, [tickets, filter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isArabic ? 'ar-PS' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tr('صلاحية مطلوبة', 'Permission Required'), tr('يرجى السماح بالوصول إلى الصور', 'Please allow access to photos'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) {
      setImages((prev) => [...prev, ...result.assets].slice(0, MAX_IMAGES));
    }
  };

  const formValid = !!form.title.trim() && !!form.description.trim() && !!form.phone.trim();

  const handleSubmit = async () => {
    if (!formValid) {
      Alert.alert(tr('تنبيه', 'Alert'), tr('يرجى ملء جميع الحقول المطلوبة', 'Please fill all required fields'));
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket(form.title, form.description, form.phone, images);
      Alert.alert(tr('نجاح', 'Success'), tr('تم إرسال التذكرة بنجاح', 'Ticket submitted successfully'));
      setModalVisible(false);
      setForm({ title: '', description: '', phone: '' });
      setImages([]);
      fetchTickets();
    } catch (error: any) {
      Alert.alert(tr('خطأ', 'Error'), error?.message || tr('فشل في إرسال التذكرة', 'Failed to submit ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: number) => {
    switch (status) {
      case 0: return { ar: 'جديدة', en: 'Sent', color: '#D97706', bg: '#FFFBEB' };
      case 1: return { ar: 'تم الاستلام', en: 'Received', color: '#2563EB', bg: '#EFF6FF' };
      case 2: return { ar: 'قيد المعالجة', en: 'In Progress', color: '#EA580C', bg: '#FFF7ED' };
      case 3: return { ar: 'تم الحل', en: 'Resolved', color: '#059669', bg: '#ECFDF5' };
      case 4: return { ar: 'مرفوضة', en: 'Rejected', color: '#DC2626', bg: '#FEF2F2' };
      default: return { ar: 'غير معروف', en: 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const openDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailsModalVisible(true);
  };

  const openLightbox = (url: string) => {
    setLightboxUrl(resolveMediaUrl(url));
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
    setLightboxUrl(null);
  };

  /* ------------------------------ بطاقة التذكرة ------------------------------ */
  const renderTicket = ({ item }: { item: SupportTicket }) => {
    const status = getStatusConfig(item.status);
    const imageCount = item.imageUrls?.length ?? 0;
    return (
      <Pressable
        onPress={() => openDetails(item)}
        style={({ pressed }) => [styles.ticketCard, pressed && styles.ticketCardPressed]}
      >
        <View style={[styles.accentBar, { backgroundColor: status.color }]} />

        <View style={styles.ticketTop}>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{isArabic ? status.ar : status.en}</Text>
          </View>
          <Text style={styles.ticketDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.ticketTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.ticketDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.ticketFooter}>
          <View style={styles.footerMeta}>
            {!!item.adminNotes && (
              <View style={styles.footerItem}>
                <Ionicons name="chatbubble-ellipses" size={14} color={Brand.green} />
                <Text style={[styles.footerText, { color: Brand.green }]}>{tr('تم الرد', 'Replied')}</Text>
              </View>
            )}
            {imageCount > 0 && (
              <View style={styles.footerItem}>
                <Ionicons name="image-outline" size={14} color={Brand.muted} />
                <Text style={styles.footerText}>{imageCount}</Text>
              </View>
            )}
          </View>
          <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color="#9AA8A0" />
        </View>
      </Pressable>
    );
  };

  /* ------------------------------ شريط التقدم ------------------------------ */
  const renderProgress = (current: number) => (
    <View style={styles.progressRow}>
      {PROGRESS_STEPS.map((step, i) => {
        const done = current >= step;
        const cfg = getStatusConfig(step);
        const first = i === 0;
        const last = i === PROGRESS_STEPS.length - 1;
        return (
          <View key={step} style={styles.progressStep}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressLine, first && styles.lineHidden, current >= step && styles.lineDone]} />
              <View style={[styles.progressDot, done && styles.progressDotDone, current === step && styles.progressDotCurrent]}>
                {done && <Ionicons name="checkmark" size={11} color="#FFF" />}
              </View>
              <View style={[styles.progressLine, last && styles.lineHidden, current > step && styles.lineDone]} />
            </View>
            <Text style={[styles.progressLabel, current === step && styles.progressLabelCurrent]} numberOfLines={2}>
              {isArabic ? cfg.ar : cfg.en}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const filters: { key: Filter; ar: string; en: string }[] = [
    { key: 'all', ar: 'الكل', en: 'All' },
    { key: 'open', ar: 'مفتوحة', en: 'Open' },
    { key: 'closed', ar: 'مغلقة', en: 'Closed' },
  ];

  return (
    <View style={styles.container}>
      {/* ------------------------------ الهيدر ------------------------------ */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color={Brand.greenText} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{tr('الدعم الفني', 'Support')}</Text>
          {!loading && (
            <Text style={styles.headerSubtitle}>
              {counts.open > 0
                ? tr(`${counts.open} تذكرة مفتوحة`, `${counts.open} open ${counts.open === 1 ? 'ticket' : 'tickets'}`)
                : tr('لا توجد تذاكر مفتوحة', 'No open tickets')}
            </Text>
          )}
        </View>
      </View>

      {/* ------------------------------ الفلاتر ------------------------------ */}
      {!loading && tickets.length > 0 && (
        <View style={styles.filterRow}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{isArabic ? f.ar : f.en}</Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{counts[f.key]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ------------------------------ القائمة ------------------------------ */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Brand.green} />
        </View>
      ) : (
        <FlatList
          data={visibleTickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicket}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: space + 110 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name={tickets.length === 0 ? 'chatbubbles-outline' : 'file-tray-outline'} size={34} color={Brand.green} />
              </View>
              <Text style={styles.emptyTitle}>
                {tickets.length === 0 ? tr('لا توجد تذاكر بعد', 'No tickets yet') : tr('لا توجد تذاكر في هذا التصنيف', 'No tickets in this view')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tickets.length === 0
                  ? tr('واجهت مشكلة؟ افتح تذكرة وسيرد عليك فريق الدعم.', 'Having trouble? Open a ticket and the support team will reply.')
                  : tr('جرّب تصنيفاً آخر لعرض باقي التذاكر.', 'Try another filter to see your other tickets.')}
              </Text>
              {tickets.length === 0 && (
                <Pressable style={styles.emptyButton} onPress={() => setModalVisible(true)}>
                  <Text style={styles.emptyButtonText}>{tr('فتح تذكرة', 'Open a ticket')}</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* ------------------------------ زر الإنشاء ------------------------------ */}
      {!loading && (
        <Pressable style={[styles.fab, { bottom: space + 20 }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.fabText}>{tr('تذكرة جديدة', 'New ticket')}</Text>
        </Pressable>
      )}

      {/* ================= مودال إنشاء تذكرة ================= */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{tr('تذكرة دعم جديدة', 'New support ticket')}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8} style={styles.closeCircle}>
                <Ionicons name="close" size={18} color={Brand.muted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label={`${tr('عنوان المشكلة', 'Issue title')} *`}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder={tr('مثال: مشكلة في تسجيل الدخول', 'e.g., Login issue')}
              />
              <Field
                label={`${tr('رقم الهاتف للتواصل', 'Contact phone')} *`}
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                keyboardType="phone-pad"
                placeholder="059xxxxxxx"
              />
              <Field
                label={`${tr('شرح المشكلة', 'Description')} *`}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                placeholder={tr('اشرح مشكلتك بالتفصيل...', 'Describe your issue in detail...')}
                multiline
              />

              <View style={styles.fieldWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{tr('مرفقات (صور)', 'Attachments (images)')}</Text>
                  <Text style={styles.labelHint}>{images.length}/{MAX_IMAGES}</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                  {images.length < MAX_IMAGES && (
                    <Pressable style={styles.addImageTile} onPress={pickImages}>
                      <Ionicons name="camera-outline" size={22} color={Brand.green} />
                      <Text style={styles.addImageText}>{tr('إضافة', 'Add')}</Text>
                    </Pressable>
                  )}
                  {images.map((img, idx) => (
                    <View key={idx} style={styles.imagePreviewItem}>
                      <Image source={{ uri: img.uri }} style={styles.imagePreview} contentFit="cover" />
                      <Pressable
                        style={styles.removeImage}
                        hitSlop={6}
                        onPress={() => setImages(images.filter((_, i) => i !== idx))}
                      >
                        <Ionicons name="close" size={12} color="#FFF" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <Pressable
              style={[styles.submitButton, (!formValid || submitting) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting || !formValid}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>{tr('إرسال التذكرة', 'Send ticket')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= مودال تفاصيل التذكرة ================= */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailsModalVisible(false)} />
          <View style={[styles.sheet, styles.detailsSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {selectedTicket && (() => {
              const status = getStatusConfig(selectedTicket.status);
              const rejected = selectedTicket.status === 4;
              const imageUrls = selectedTicket.imageUrls ?? [];
              return (
                <>
                  <View style={styles.grabber} />
                  <View style={styles.sheetHeader}>
                    <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>{isArabic ? status.ar : status.en}</Text>
                    </View>
                    <Pressable onPress={() => setDetailsModalVisible(false)} hitSlop={8} style={styles.closeCircle}>
                      <Ionicons name="close" size={18} color={Brand.muted} />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
                    <Text style={styles.detailsTitle}>{selectedTicket.title}</Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="calendar-outline" size={14} color={Brand.muted} />
                        <Text style={styles.metaText}>{formatDate(selectedTicket.createdAt)}</Text>
                      </View>
                      {!!selectedTicket.userPhone && (
                        <View style={styles.metaChip}>
                          <Ionicons name="call-outline" size={14} color={Brand.muted} />
                          <Text style={styles.metaText}>{selectedTicket.userPhone}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.detailsDescription}>{selectedTicket.description}</Text>

                    {/* تقدم الطلب */}
                    {rejected ? (
                      <View style={styles.rejectedBox}>
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                        <Text style={styles.rejectedText}>{tr('تم رفض هذه التذكرة', 'This ticket was rejected')}</Text>
                      </View>
                    ) : (
                      renderProgress(selectedTicket.status)
                    )}

                    {/* رد الدعم */}
                    {selectedTicket.adminNotes ? (
                      <View style={styles.responseBox}>
                        <View style={styles.responseHeader}>
                          <View style={styles.responseIconBox}>
                            <Ionicons name="headset" size={16} color="#FFF" />
                          </View>
                          <Text style={styles.responseTitle}>{tr('رد فريق الدعم', 'Support team reply')}</Text>
                        </View>
                        <Text style={styles.responseText}>{selectedTicket.adminNotes}</Text>
                      </View>
                    ) : (
                      <View style={styles.noResponseBox}>
                        <Ionicons name="hourglass-outline" size={18} color={Brand.muted} />
                        <Text style={styles.noResponseText}>
                          {tr('لم يصل رد بعد. سنخبرك فور الرد على تذكرتك.', 'No reply yet. We will answer your ticket soon.')}
                        </Text>
                      </View>
                    )}

                    {/* المرفقات */}
                    {imageUrls.length > 0 && (
                      <View style={styles.imagesSection}>
                        <Text style={styles.sectionTitle}>
                          {tr('المرفقات', 'Attachments')} ({imageUrls.length})
                        </Text>
                        <View style={styles.imagesGrid}>
                          {imageUrls.map((url, idx) => {
                            const resolved = resolveMediaUrl(url);
                            return (
                              <Pressable key={idx} onPress={() => openLightbox(url)} style={styles.gridImageWrap}>
                                <Image
                                  source={{ uri: resolved }}
                                  style={styles.gridImage}
                                  contentFit="cover"
                                  transition={200}
                                  onError={(e) => console.warn('Image load error:', resolved, e)}
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ================= معرض الصورة الكامل ================= */}
      <Modal visible={lightboxVisible} animationType="fade" transparent onRequestClose={closeLightbox}>
        <Pressable style={styles.lightboxOverlay} onPress={closeLightbox}>
          <Pressable
            style={[styles.lightboxClose, { top: insets.top + 12 }]}
            onPress={closeLightbox}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImage} contentFit="contain" transition={200} />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ */
const INK = Brand.greenText;
const LINE = '#E3EAE5';
const SURFACE = '#F4F7F5';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* الهيدر */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: INK },
  headerSubtitle: { fontSize: 13, color: Brand.muted, marginTop: 2, fontWeight: '600' },

  /* الفلاتر */
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingStart: 14,
    paddingEnd: 6,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: LINE,
  },
  filterChipActive: { backgroundColor: Brand.green, borderColor: Brand.green },
  filterText: { fontSize: 13, fontWeight: '700', color: INK },
  filterTextActive: { color: '#FFF' },
  filterCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  filterCountText: { fontSize: 12, fontWeight: '800', color: Brand.muted },
  filterCountTextActive: { color: '#FFF' },

  /* بطاقة التذكرة */
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
  },
  ticketCardPressed: { backgroundColor: '#FAFCFB', borderColor: Brand.green },
  accentBar: { position: 'absolute', start: 0, top: 0, bottom: 0, width: 4 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '800' },
  ticketDate: { fontSize: 12, color: Brand.muted, fontWeight: '600' },
  ticketTitle: { fontSize: 17, fontWeight: '800', color: INK, lineHeight: 24 },
  ticketDesc: { fontSize: 14, color: Brand.body, lineHeight: 21, marginTop: 4 },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    minHeight: 20,
  },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 12, color: Brand.muted, fontWeight: '700' },

  /* حالة فارغة */
  emptyState: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: INK, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Brand.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  /* زر الإنشاء */
  fab: {
    position: 'absolute',
    end: 20,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.green,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  /* المودالات */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10,20,14,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  detailsSheet: { maxHeight: '92%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D5DDD8', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 19, fontWeight: '900', color: INK },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },

  /* حقول النموذج */
  fieldWrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '800', color: INK, marginBottom: 8 },
  labelHint: { fontSize: 12, fontWeight: '700', color: Brand.muted, marginBottom: 8 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: INK,
  },
  inputFocused: { backgroundColor: '#FFF', borderColor: Brand.green },
  textArea: { height: 110 },

  /* الصور في النموذج */
  previewRow: { gap: 10, paddingVertical: 2 },
  addImageTile: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBD9C4',
    borderStyle: 'dashed',
    backgroundColor: '#F2FAF4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addImageText: { fontSize: 12, fontWeight: '700', color: Brand.green },
  imagePreviewItem: { width: 76, height: 76 },
  imagePreview: { width: 76, height: 76, borderRadius: 14 },
  removeImage: {
    position: 'absolute',
    top: -6,
    end: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F2A24',
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    height: 52,
    borderRadius: 16,
    marginTop: 12,
  },
  disabledButton: { opacity: 0.45 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  /* تفاصيل التذكرة */
  detailsTitle: { fontSize: 21, fontWeight: '900', color: INK, lineHeight: 30 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: SURFACE,
  },
  metaText: { fontSize: 13, color: Brand.body, fontWeight: '600' },
  detailsDescription: { fontSize: 15, color: Brand.body, lineHeight: 25, marginTop: 16, marginBottom: 22 },

  /* شريط التقدم */
  progressRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: SURFACE,
  },
  progressStep: { flex: 1, alignItems: 'center' },
  progressTrack: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#D5DDD8' },
  lineDone: { backgroundColor: Brand.green },
  lineHidden: { backgroundColor: 'transparent' },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D5DDD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: { backgroundColor: Brand.green },
  progressDotCurrent: { borderWidth: 3, borderColor: '#BBE3C6' },
  progressLabel: { fontSize: 11, color: Brand.muted, fontWeight: '600', textAlign: 'center', marginTop: 8, paddingHorizontal: 2 },
  progressLabelCurrent: { color: INK, fontWeight: '800' },

  rejectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    marginBottom: 20,
  },
  rejectedText: { fontSize: 14, fontWeight: '700', color: '#B91C1C' },

  /* رد الدعم */
  responseBox: {
    backgroundColor: '#F2FAF4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CDE8D5',
    marginBottom: 22,
  },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  responseIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseTitle: { fontSize: 15, fontWeight: '800', color: INK },
  responseText: { fontSize: 15, color: Brand.body, lineHeight: 24 },

  noResponseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: SURFACE,
    borderRadius: 14,
    marginBottom: 22,
  },
  noResponseText: { flex: 1, fontSize: 14, color: Brand.muted, fontWeight: '600', lineHeight: 20 },

  /* المرفقات */
  imagesSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: INK, marginBottom: 12 },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridImageWrap: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E9EFEB',
  },
  gridImage: { width: '100%', height: '100%' },

  /* المعرض */
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: {
    position: 'absolute',
    end: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
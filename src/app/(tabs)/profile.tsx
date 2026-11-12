import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Brand } from '@/constants/brand';
import { useAuth } from '@/auth/auth-context';
import { API_URL } from '@/api/config';
import { fetchProfile, uploadProfileImage } from '@/api/profile';
import { useAsync } from '@/hooks/use-async';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';

  const { data: profile, loading, reload } = useAsync(fetchProfile, 'profile');

  // ✅ الحل للمشكلة الثانية: إعادة جلب البيانات تلقائياً عند العودة لهذه الصفحة
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const [uploading, setUploading] = useState(false);

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const userEmail = profile?.email || user?.email || '';
  const userCountry = profile?.country || '';
  const avatarUrl = resolveImageUrl(profile?.profileImageUrl);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const result = await uploadProfileImage(uri);
      if (result.success) {
        Alert.alert(isArabic ? 'تم بنجاح' : 'Success', isArabic ? 'تم تحديث صورتك الشخصية بنجاح' : 'Your profile picture has been updated');
        reload();
      } else {
        Alert.alert(isArabic ? 'تعذر التحديث' : 'Error', result.message || (isArabic ? 'فشل رفع الصورة' : 'Upload failed'));
      }
    } catch (err: any) {
      Alert.alert(isArabic ? 'حدث خطأ' : 'Error', err?.serverMessage || (isArabic ? 'حدث خطأ أثناء رفع الصورة' : 'An error occurred'));
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(isArabic ? 'إذن مطلوب' : 'Permission Required', isArabic ? 'نحتاج إذن الوصول إلى الصور' : 'Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const menuItems = [
    {
      title: isArabic ? 'الملف الطبي' : 'Medical Profile',
      subtitle: isArabic ? 'الأمراض والأدوية والحساسية' : 'Diseases, medications and allergies',
      icon: 'heart-outline' as const,
      tint: '#E74C3C',
      onPress: () => router.push('/profile/medical'),
    },
    {
      title: isArabic ? 'أرقام الطوارئ' : 'Emergency Contacts',
      subtitle: isArabic ? 'أرقام مهمة للحالات الطارئة' : 'Important emergency contact numbers',
      icon: 'call-outline' as const,
      tint: '#2E86DE',
      onPress: () => router.push('/profile/emergency'), // ✅ الحل للمشكلة الأولى
    },
  ];

  const renderMenuSection = (title: string, items: typeof menuItems) => (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.menuCard}>
        {items.map((item, index) => (
          <React.Fragment key={item.title}>
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.tint}1A` }]}>
                <Ionicons name={item.icon} size={23} color={item.tint} />
              </View>
              <View style={[styles.menuContent, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={Brand.green} />
              </View>
            </Pressable>
            {index !== items.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>{isArabic ? 'جاري تحميل بياناتك...' : 'Loading your profile...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 24 }}>
        {/* ---------- Header ---------- */}
        <LinearGradient colors={[Brand.deep, Brand.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={[styles.headerContent, { paddingTop: insets.top + 18, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <View style={[styles.headerText, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
              <View style={styles.greetingPill}>
                <Text style={styles.headerGreeting}>{isArabic ? 'مرحباً بعودتك 👋' : 'Welcome back 👋'}</Text>
              </View>
              <Text style={styles.headerName} numberOfLines={1}>{fullName || (isArabic ? 'مسافر' : 'Traveler')}</Text>
              <Text style={styles.headerSubtitle}>{isArabic ? 'اكتشف المزيد من رحلتك مع روفايا' : 'Make every journey memorable with ROVAYA'}</Text>
            </View>
            <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
          <View style={styles.decorCircleThree} />
        </LinearGradient>

        {/* ---------- Profile card ---------- */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#2ECC71', Brand.green]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={250} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={43} color={Brand.green} />
                  </View>
                )}
              </View>
            </LinearGradient>
            <Pressable onPress={pickImage} disabled={uploading} style={styles.cameraButton}>
              {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={18} color="#FFFFFF" />}
            </Pressable>
          </View>

          <Text style={styles.profileName}>{fullName || (isArabic ? 'مسافر' : 'Traveler')}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
          {userCountry ? (
            <View style={[styles.countryBadge, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <Ionicons name="location" size={14} color={Brand.green} />
              <Text style={styles.countryText}>{userCountry}</Text>
            </View>
          ) : null}

          <View style={styles.cardDivider} />

          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={({ pressed }) => [
              styles.editButton,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.editButtonText}>{isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}</Text>
          </Pressable>
        </View>

        {/* ---------- Safety tip ---------- */}
        <View style={[styles.safetyCard, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <View style={styles.safetyIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.safetyTextWrap, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.safetyTitle}>{isArabic ? 'سافر بأمان وراحة بال' : 'Travel with peace of mind'}</Text>
            <Text style={[styles.safetyText, { textAlign: isArabic ? 'right' : 'left' }]}>
              {isArabic
                ? 'أكمل ملفك الطبي وأضف أرقام الطوارئ لنكون بجانبك وقت الحاجة.'
                : 'Complete your medical profile and add emergency contacts so we can be there when you need us.'}
            </Text>
          </View>
        </View>

        {renderMenuSection(isArabic ? 'المعلومات الشخصية' : 'Personal Information', menuItems)}

        {/* ---------- Footer ---------- */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="compass-outline" size={20} color={Brand.green} />
            <Text style={styles.footerBrand}>ROVAYA</Text>
          </View>
          <Text style={styles.footerText}>{isArabic ? 'اكتشف فلسطين... رحلة وراء كل حكاية' : 'Discover Palestine... Every journey tells a story'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8F6' },
  loadingText: { marginTop: 14, color: Brand.muted, fontSize: 14, fontWeight: '500' },

  /* Header */
  header: { paddingBottom: 80, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', position: 'relative' },
  headerContent: { paddingHorizontal: 24, justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 },
  headerText: { flex: 1 },
  greetingPill: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginBottom: 10 },
  headerGreeting: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  headerName: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', maxWidth: '95%' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 8 },
  logoutButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  decorCircleOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.05)', right: -65, top: -70 },
  decorCircleTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.045)', left: -40, bottom: -45 },
  decorCircleThree: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(46,204,113,0.18)', right: 60, bottom: 30 },

  /* Profile card */
  profileCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: -56, borderRadius: 28, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 22, alignItems: 'center', elevation: 6, shadowColor: '#173C2B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 16, zIndex: 3 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: { width: 118, height: 118, borderRadius: 59, padding: 4, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: '100%', height: '100%', borderRadius: 55, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#EAF4EE', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F3EC' },
  cameraButton: { position: 'absolute', bottom: 2, right: 2, width: 38, height: 38, borderRadius: 19, backgroundColor: Brand.green, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  profileName: { fontSize: 22, fontWeight: '900', color: Brand.greenText, marginTop: 2 },
  profileEmail: { fontSize: 13, color: '#89968F', marginTop: 5 },
  countryBadge: { alignItems: 'center', gap: 6, backgroundColor: '#EDF6F0', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, marginTop: 14 },
  countryText: { fontSize: 12, fontWeight: '700', color: Brand.green },
  cardDivider: { alignSelf: 'stretch', height: 1, backgroundColor: '#EEF2EF', marginTop: 20 },
  editButton: { alignSelf: 'stretch', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.green, paddingVertical: 13, borderRadius: 15 },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  /* Safety card */
  safetyCard: { alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 20, padding: 16, borderRadius: 22, backgroundColor: '#EAF6EF', borderWidth: 1, borderColor: '#D5ECDD' },
  safetyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  safetyTextWrap: { flex: 1, gap: 4 },
  safetyTitle: { color: Brand.greenText, fontSize: 14, fontWeight: '900' },
  safetyText: { color: '#5C6F65', fontSize: 12, lineHeight: 19 },

  /* Menu */
  section: { marginTop: 26, marginHorizontal: 20 },
  sectionHeader: { alignItems: 'center', marginBottom: 13, gap: 10 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71' },
  sectionTitle: { color: Brand.greenText, fontSize: 15, fontWeight: '900' },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E4EBE6' },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 15, borderWidth: 1, borderColor: '#EDF1EE', elevation: 2, shadowColor: '#173C2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  menuItem: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  menuIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1, gap: 4 },
  menuTitle: { color: Brand.greenText, fontSize: 14, fontWeight: '800' },
  menuSubtitle: { color: '#929E97', fontSize: 11, fontWeight: '500' },
  chevronCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF6F0', alignItems: 'center', justifyContent: 'center' },
  menuDivider: { height: 1, backgroundColor: '#F0F3F1', marginHorizontal: 5 },

  /* Footer */
  footer: { alignItems: 'center', marginTop: 36, paddingHorizontal: 25 },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerBrand: { color: Brand.green, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  footerText: { color: '#A0AAA4', fontSize: 11, marginTop: 9, textAlign: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

  const { data: profile, loading, reload } = useAsync(
    fetchProfile,
    'profile'
  );

  const [uploading, setUploading] = useState(false);

  const fullName =
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  const userEmail = profile?.email || user?.email || '';
  const userCountry = profile?.country || '';
  const avatarUrl = resolveImageUrl(profile?.profileImageUrl);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmText'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);

    try {
      const result = await uploadProfileImage(uri);

      if (result.success) {
        Alert.alert(
          isArabic ? 'تم بنجاح' : 'Success',
          isArabic
            ? 'تم تحديث صورتك الشخصية بنجاح'
            : 'Your profile picture has been updated'
        );

        reload();
      } else {
        Alert.alert(
          isArabic ? 'تعذر التحديث' : 'Error',
          result.message || (isArabic ? 'فشل رفع الصورة' : 'Upload failed')
        );
      }
    } catch (err: any) {
      Alert.alert(
        isArabic ? 'حدث خطأ' : 'Error',
        err?.serverMessage ||
          (isArabic
            ? 'حدث خطأ أثناء رفع الصورة'
            : 'An error occurred while uploading the image')
      );
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        isArabic ? 'إذن مطلوب' : 'Permission Required',
        isArabic
          ? 'نحتاج إذن الوصول إلى الصور لتغيير صورتك الشخصية'
          : 'Photo library permission is required'
      );
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
      subtitle: isArabic
        ? 'الأمراض والأدوية والحساسية'
        : 'Diseases, medications and allergies',
      icon: 'heart-outline' as const,
      onPress: () => router.push('/profile/medical'),
    },
    {
      title: isArabic ? 'أرقام الطوارئ' : 'Emergency Contacts',
      subtitle: isArabic
        ? 'أرقام مهمة للحالات الطارئة'
        : 'Important emergency contact numbers',
      icon: 'call-outline' as const,
      onPress: () => Alert.alert(
        isArabic ? 'قريباً' : 'Coming Soon'
      ),
    },
  ];

  const accountItems = [
    {
      title: isArabic ? 'تغيير كلمة المرور' : 'Change Password',
      subtitle: isArabic
        ? 'حافظ على أمان حسابك'
        : 'Keep your account secure',
      icon: 'lock-closed-outline' as const,
      onPress: () => Alert.alert(
        isArabic ? 'قريباً' : 'Coming Soon'
      ),
    },
  ];

  const renderMenuSection = (
    title: string,
    items: typeof menuItems
  ) => (
    <View style={styles.section}>
      <View
        style={[
          styles.sectionHeader,
          { flexDirection: isArabic ? 'row-reverse' : 'row' },
        ]}
      >
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
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.menuIcon}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={Brand.green}
                />
              </View>

              <View
                style={[
                  styles.menuContent,
                  { alignItems: isArabic ? 'flex-end' : 'flex-start' },
                ]}
              >
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name={isArabic ? 'chevron-back' : 'chevron-forward'}
                size={19}
                color="#A0ADA7"
              />
            </Pressable>

            {index !== items.length - 1 && (
              <View style={styles.menuDivider} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>
          {isArabic ? 'جاري تحميل بياناتك...' : 'Loading your profile...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={[Brand.deep, Brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View
            style={[
              styles.headerContent,
              {
                paddingTop: insets.top + 18,
                flexDirection: isArabic ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View
              style={[
                styles.headerText,
                { alignItems: isArabic ? 'flex-end' : 'flex-start' },
              ]}
            >
              <Text style={styles.headerGreeting}>
                {isArabic ? 'مرحباً بعودتك 👋' : 'Welcome back 👋'}
              </Text>

              <Text style={styles.headerName} numberOfLines={1}>
                {fullName || (isArabic ? 'مسافر' : 'Traveler')}
              </Text>

              <Text style={styles.headerSubtitle}>
                {isArabic
                  ? 'اكتشف المزيد من رحلتك مع روفايا'
                  : 'Make every journey memorable with ROVAYA'}
              </Text>
            </View>

            <Pressable
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* Decorative circles */}
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={250}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={43}
                    color={Brand.green}
                  />
                </View>
              )}
            </View>

            <Pressable
              onPress={pickImage}
              disabled={uploading}
              style={styles.cameraButton}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          <Text style={styles.profileName}>
            {fullName || (isArabic ? 'مسافر' : 'Traveler')}
          </Text>

          <Text style={styles.profileEmail}>
            {userEmail}
          </Text>

          {userCountry ? (
            <View
              style={[
                styles.countryBadge,
                { flexDirection: isArabic ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={15}
                color={Brand.green}
              />
              <Text style={styles.countryText}>
                {userCountry}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={({ pressed }) => [
              styles.editButton,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={Brand.green}
            />

            <Text style={styles.editButtonText}>
              {isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            </Text>
          </Pressable>
        </View>

        {/* Personal Section */}
        {renderMenuSection(
          isArabic ? 'المعلومات الشخصية' : 'Personal Information',
          menuItems
        )}


        {/* App Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons
              name="compass-outline"
              size={20}
              color={Brand.green}
            />
            <Text style={styles.footerBrand}>ROVAYA</Text>
          </View>

          <Text style={styles.footerText}>
            {isArabic
              ? 'اكتشف فلسطين... رحلة وراء كل حكاية'
              : 'Discover Palestine... Every journey tells a story'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8F6',
  },

  loadingText: {
    marginTop: 14,
    color: Brand.muted,
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    paddingBottom: 75,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },

  headerContent: {
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },

  headerText: {
    flex: 1,
  },

  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 7,
  },

  headerName: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    maxWidth: '95%',
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 9,
  },

  logoutButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  decorCircleOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.045)',
    right: -65,
    top: -70,
  },

  decorCircleTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.04)',
    left: -40,
    bottom: -45,
  },

  // Profile
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -52,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 23,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#173C2B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    zIndex: 3,
  },

  avatarWrapper: {
    position: 'relative',
    marginBottom: 13,
  },

  avatarBorder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#EAF4EE',
    elevation: 3,
    overflow: 'hidden',
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
  },

  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F3EC',
  },

  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.green,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileName: {
    fontSize: 21,
    fontWeight: '900',
    color: Brand.greenText,
    marginTop: 3,
  },

  profileEmail: {
    fontSize: 13,
    color: '#89968F',
    marginTop: 5,
  },

  countryBadge: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDF6F0',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
  },

  countryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.green,
  },

  editButton: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EDF6F0',
    paddingHorizontal: 23,
    paddingVertical: 11,
    borderRadius: 13,
  },

  editButtonText: {
    color: Brand.green,
    fontSize: 13,
    fontWeight: '800',
  },

  // Sections
  section: {
    marginTop: 29,
    marginHorizontal: 20,
  },

  sectionHeader: {
    alignItems: 'center',
    marginBottom: 13,
    gap: 12,
  },

  sectionTitle: {
    color: Brand.greenText,
    fontSize: 15,
    fontWeight: '900',
  },

  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4EBE6',
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EDF1EE',
    elevation: 2,
    shadowColor: '#173C2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
  },

  menuItem: {
    alignItems: 'center',
    paddingVertical: 17,
    gap: 12,
  },

  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#EDF6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuContent: {
    flex: 1,
    gap: 5,
  },

  menuTitle: {
    color: Brand.greenText,
    fontSize: 14,
    fontWeight: '800',
  },

  menuSubtitle: {
    color: '#929E97',
    fontSize: 11,
    fontWeight: '500',
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#F0F3F1',
    marginHorizontal: 5,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 35,
    paddingHorizontal: 25,
  },

  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  footerBrand: {
    color: Brand.green,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerText: {
    color: '#A0AAA4',
    fontSize: 11,
    marginTop: 9,
    textAlign: 'center',
  },
});

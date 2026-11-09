import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';

export const LANGUAGES = ['en', 'ar'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'rovaya.language';
const RTL_LANGUAGES: AppLanguage[] = ['ar'];

const isSupported = (value?: string | null): value is AppLanguage =>
  !!value && (LANGUAGES as readonly string[]).includes(value);

export const isRTLLanguage = (lang: AppLanguage) => RTL_LANGUAGES.includes(lang);

function detectDeviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode;
    return isSupported(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

/**
 * i18next يُهيَّأ هنا فور استيراد هذا الملف، قبل أول عرض للشاشات،
 * فلا تظهر المفاتيح (welcome.title ...) ولا يحدث خطأ "undefined".
 */
const initialLanguage = detectDeviceLanguage();

const ready = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  // أثناء التطوير: يطبع في الـ terminal أي مفتاح ترجمة ناقص بدل أن يمرّ بصمت
  saveMissing: __DEV__,
  missingKeyHandler: (lngs, _ns, key) => {
    if (__DEV__) console.warn(`[i18n] missing key "${key}" for ${lngs.join(', ')}`);
  },
});

/**
 * اتجاه الواجهة (يمين↔يسار) صار يُطبَّق من الـ JavaScript مباشرة (انظر direction في _layout الجذر)،
 * فلا نحتاج forceRTL ولا إعادة تحميل. نعطّل RTL الأصلي حتى لا يتعارض مع هذا (يسري عند التشغيل التالي).
 */
function normalizeNativeDirection() {
  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }
}

/** تُستدعى مرة واحدة من _layout الجذر: تقرأ اللغة المحفوظة وتطبقها */
export async function initI18n(): Promise<AppLanguage> {
  try {
    await ready;

    let target: AppLanguage = initialLanguage;
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isSupported(saved)) target = saved;
    } catch {
      // نتجاهل خطأ التخزين
    }

    if (i18n.language !== target) await i18n.changeLanguage(target);
    normalizeNativeDirection();
    return target;
  } catch (error) {
    console.warn('[i18n] init failed:', error);
    return initialLanguage;
  }
}

/** تغيير اللغة من داخل التطبيق: فوري، بدون إعادة تحميل */
export async function changeLanguage(lang: AppLanguage) {
  await ready;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // لا شيء
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { changeLanguage, isRTLLanguage, type AppLanguage } from '@/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  const language: AppLanguage = i18n.language === 'ar' ? 'ar' : 'en';

  const setLanguage = useCallback((lang: AppLanguage) => changeLanguage(lang), []);
  const toggleLanguage = useCallback(
    () => changeLanguage(language === 'ar' ? 'en' : 'ar'),
    [language]
  );

  /** هل لغة الواجهة الحالية من اليمين لليسار؟ (يُحدَّد من اللغة وليس من إعدادات الجهاز) */
  return { language, isRTL: isRTLLanguage(language), setLanguage, toggleLanguage };
}
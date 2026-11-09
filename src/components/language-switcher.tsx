import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Brand } from '@/constants/brand';
import { useLanguage } from '@/hooks/use-language';

type Props = {
  /** glass: فوق الصور | solid: على الخلفيات البيضاء */
  variant?: 'glass' | 'solid';
};

/** زر تبديل اللغة، استخدمه في أي شاشة */
export function LanguageSwitcher({ variant = 'glass' }: Props) {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const glass = variant === 'glass';
  const color = glass ? Brand.white : Brand.green;

  return (
    <Pressable
      onPress={toggleLanguage}
      accessibilityRole="button"
      accessibilityLabel={t('common.switchLanguage')}
      style={({ pressed }) => [styles.pill, glass ? styles.glass : styles.solid, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="globe-outline" size={16} color={color} />
      <Text style={[styles.text, { color }]}>{language === 'ar' ? 'English' : 'العربية'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  glass: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.4)' },
  solid: { backgroundColor: Brand.mint, borderColor: Brand.line },
  text: { fontSize: 13, fontWeight: '700' },
});

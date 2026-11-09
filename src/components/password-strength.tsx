import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Brand } from '@/constants/brand';
import { ACTIVE_RULES, PASSWORD_POLICY, passwordStrength } from '@/constants/password-rules';

const LEVEL_KEYS = ['', 'weak', 'fair', 'good', 'strong'] as const;
const LEVEL_COLORS = ['#DCE7E1', '#D9503F', '#E8A33D', '#5BA66B', '#1F7A4D'] as const;

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useTranslation();
  const { checks, level } = passwordStrength(password);
  const color = LEVEL_COLORS[level];

  return (
    <View style={styles.wrap}>
      <View style={styles.meterRow}>
        <View style={styles.bars}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i <= level ? color : '#E3ECE7' }]}
            />
          ))}
        </View>
        {level > 0 && (
          <Text style={[styles.level, { color }]}>{t(`password.levels.${LEVEL_KEYS[level]}`)}</Text>
        )}
      </View>

      <View style={styles.rules}>
        {ACTIVE_RULES.map((rule) => {
          const ok = checks[rule];
          return (
            <View key={rule} style={styles.ruleRow}>
              <Ionicons
                name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={ok ? '#1F7A4D' : '#9AA9A1'}
              />
              <Text style={[styles.ruleText, ok && styles.ruleOk]}>
                {t(`password.rules.${rule}`, { n: PASSWORD_POLICY.minLength })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: -4 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  level: { fontSize: 12.5, fontWeight: '800', minWidth: 52, textAlign: 'right' },
  rules: { gap: 6 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { color: Brand.muted, fontSize: 13 },
  ruleOk: { color: Brand.greenText, fontWeight: '600' },
});

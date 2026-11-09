import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Tone = 'error' | 'info' | 'success';

const TONES = {
  error: { bg: '#FDF0EE', border: '#F3C9C3', fg: '#B3261E', icon: 'alert-circle' },
  info: { bg: '#FFF8E6', border: '#F2DFA8', fg: '#7A5A0B', icon: 'information-circle' },
  success: { bg: '#E8F5EE', border: '#BFE0CE', fg: '#0F5A3F', icon: 'checkmark-circle' },
} as const;

export function NoticeBanner({ tone = 'error', children }: { tone?: Tone; children: string }) {
  const c = TONES[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Ionicons name={c.icon} size={20} color={c.fg} />
      <Text style={[styles.text, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600' },
});

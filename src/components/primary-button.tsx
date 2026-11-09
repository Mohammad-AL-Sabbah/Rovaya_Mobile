import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/brand';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
}

export function PrimaryButton({ title, onPress, loading, disabled, variant = 'solid' }: Props) {
  const solid = variant === 'solid';
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        solid ? styles.solid : styles.outline,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
        disabled && !loading && { opacity: 0.55 },
      ]}
    >
      {solid && (
        <LinearGradient
          pointerEvents="none"
          colors={['#1A7155', '#0B3A2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading ? (
        <ActivityIndicator color={solid ? Brand.white : Brand.green} />
      ) : (
        <Text style={[styles.text, { color: solid ? Brand.white : Brand.green }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    borderWidth: 1,
    borderColor: 'rgba(232,176,75,0.6)',
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  outline: { borderWidth: 1.5, borderColor: Brand.green },
  text: { fontSize: 17, fontWeight: '800' },
});

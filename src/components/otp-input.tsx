import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { toLatinDigits } from '@/utils/digits';

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  hasError?: boolean;
  accessibilityLabel?: string;
  onComplete?: (code: string) => void;
}

/** خانات رمز التحقق: حقل واحد مخفي فوق المربعات (يدعم اللصق والأرقام العربية) */
export const OtpInput = forwardRef<TextInput, Props>(function OtpInput(
  { value, onChange, length = 4, hasError, accessibilityLabel, onComplete },
  ref
) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { direction: 'ltr' }]} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const digit = value[i];
          const active = focused && i === activeIndex;
          return (
            <View
              key={i}
              style={[
                styles.box,
                !!digit && styles.boxFilled,
                active && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              <Text style={styles.digit}>{digit ?? ''}</Text>
              {active && !digit && <View style={styles.caret} />}
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const clean = toLatinDigits(text).replace(/\D/g, '').slice(0, length);
          onChange(clean);
          if (clean.length === length) onComplete?.(clean);
        }}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        style={styles.hidden}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { height: 68 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  box: {
    width: 64,
    height: 68,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DCE7E1',
    backgroundColor: '#F6F9F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: Brand.white, borderColor: Brand.green },
  boxActive: {
    borderColor: Brand.gold,
    backgroundColor: Brand.white,
    shadowColor: Brand.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  boxError: { borderColor: Brand.danger, backgroundColor: '#FDF0EE' },
  digit: { fontSize: 28, fontWeight: '800', color: Brand.greenText },
  caret: { position: 'absolute', width: 2, height: 28, borderRadius: 1, backgroundColor: Brand.gold },
  hidden: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: 'transparent' },
});

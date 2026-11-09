import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useCallback, useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { RevealContext } from '@/components/reveal-context';
import { Brand } from '@/constants/brand';
import { useLanguage } from '@/hooks/use-language';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type BlurHandler = NonNullable<TextInputProps['onBlur']>;

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: IconName;
  error?: string | null;
  /** حقل كلمة مرور مع زر إظهار/إخفاء */
  secure?: boolean;
  showLabel?: string;
  hideLabel?: string;
  /**
   * التعبئة التلقائية (Autofill) معطّلة افتراضياً لأنها تسبب تعليق التركيز على بعض أجهزة أندرويد.
   * فعّلها فقط لحقلي البريد وكلمة المرور في تسجيل الدخول بعد التأكد أن كل شيء مستقر.
   */
  autoFill?: boolean;
}

const NO_AUTOFILL = {
  autoComplete: 'off',
  importantForAutofill: 'no',
  textContentType: 'none',
} as const;

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, icon, error, secure = false, showLabel, hideLabel, autoFill = false, onFocus, onBlur, ...inputProps },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const reveal = useContext(RevealContext);
  const { isRTL } = useLanguage();

  const handleFocus = useCallback<FocusHandler>(
    (event) => {
      setFocused(true);
      onFocus?.(event);
      setTimeout(reveal, 120);
    },
    [onFocus, reveal]
  );

  const handleBlur = useCallback<BlurHandler>(
    (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur]
  );

  const iconColor = error ? Brand.danger : focused ? Brand.green : '#8A9A92';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        {icon ? <Ionicons name={icon} size={20} color={iconColor} /> : null}

        <TextInput
          {...inputProps}
          {...(autoFill ? null : NO_AUTOFILL)}
          ref={ref}
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholderTextColor="#9AAAA2"
          secureTextEntry={secure ? hidden : inputProps.secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? showLabel : hideLabel}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color="#8A9A92" />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={15} color={Brand.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: Brand.greenText, fontSize: 13.5, fontWeight: '700' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DCE7E1',
    backgroundColor: '#F6F9F7',
  },
  // لا نغيّر elevation عند التركيز (يسبب إعادة رسم غير ضرورية على أندرويد)
  fieldFocused: { borderColor: Brand.gold, backgroundColor: Brand.white },
  fieldError: { borderColor: Brand.danger, backgroundColor: '#FDF0EE' },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: 16,
    color: Brand.greenText,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { flex: 1, color: Brand.danger, fontSize: 13 },
});
import React, { useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { useLanguage } from '@/hooks/use-language';

/** شريط أفقي يعمل بشكل صحيح في العربية (أول عنصر عند اليمين) */
export function HCarousel<T>({
  data,
  keyOf,
  renderItem,
  gap = 14,
}: {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  gap?: number;
}) {
  const { isRTL } = useLanguage();
  const ref = useRef<ScrollView>(null);
  const items = isRTL ? [...data].reverse() : data;

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ direction: 'ltr' }}
      contentContainerStyle={{ paddingHorizontal: 20, gap }}
      onContentSizeChange={() => {
        if (isRTL) ref.current?.scrollToEnd({ animated: false });
      }}
    >
      {items.map((item) => (
        <View key={keyOf(item)} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          {renderItem(item)}
        </View>
      ))}
    </ScrollView>
  );
}
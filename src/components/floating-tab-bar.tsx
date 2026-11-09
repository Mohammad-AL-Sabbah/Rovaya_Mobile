import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Brand } from '@/constants/brand';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ───────── المقاسات ───────── */
const BAR_H = 68; // ارتفاع الشريط
const SIDE = 14; // هامش الشريط من الجانبين
const FAB = 64; // قطر الزر الأوسط
const NOTCH_R = 40; // نصف قطر التجويف حول الزر
const FAB_CY = 6; // مركز الزر بالنسبة لأعلى الشريط
const TOP_PAD = 34; // مساحة فوق الشريط لبروز الزر
const CENTER_GAP = 96; // عرض المنطقة الوسطى بين الأزرار
const CORNER = 26;

const INACTIVE = '#8A9A92';

/* ───────── ترتيب الأزرار ───────── */
const LEFT = ['home', 'recommendations'] as const;
const RIGHT = ['profile', 'settings'] as const;
const CENTER = 'planner';

/** صفحات القراءة الكاملة: نخفي الشريط السفلي ليتسع المحتوى */
const HIDE_ON = ['news',''];

const ICONS: Record<string, { off: IconName; on: IconName }> = {
  home: { off: 'home-outline', on: 'home' },
  recommendations: { off: 'star-outline', on: 'star' },
  planner: { off: 'sparkles-outline', on: 'sparkles' },
  profile: { off: 'person-outline', on: 'person' },
  settings: { off: 'settings-outline', on: 'settings' },
};

const bottomMargin = (insetBottom: number) => Math.max(insetBottom, 8) + 6;

/** المساحة التي يجب تركها أسفل محتوى الصفحات حتى لا يغطيها الشريط */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_H + bottomMargin(insets.bottom) + 28;
}

/** مسار الشريط مع تجويف دائري ناعم في المنتصف للزر البارز */
function barPath(w: number, h: number) {
  const cx = w / 2;
  const R = NOTCH_R;
  const jy = 14; // ارتفاع نقطة التقاء الكتف بالدائرة
  const jx = Math.sqrt(R * R - (jy - FAB_CY) ** 2);
  const shoulder = 15;
  const tx = (jy - FAB_CY) / R; // مركبة المماس الأفقية
  const ty = jx / R; // مركبة المماس الرأسية
  const k = 8;
  const r = CORNER;

  const left = cx - jx;
  const right = cx + jx;

  return [
    `M ${r} 0`,
    `H ${left - shoulder}`,
    `C ${left - shoulder + 10} 0 ${left - tx * k} ${jy - ty * k} ${left} ${jy}`,
    `A ${R} ${R} 0 0 0 ${right} ${jy}`,
    `C ${right + tx * k} ${jy - ty * k} ${right + shoulder - 10} 0 ${right + shoulder} 0`,
    `H ${w - r}`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

function TabItem({
  focused,
  label,
  icon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  icon: { off: IconName; on: IconName };
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
    >
      {focused && <View style={styles.activeBar} />}
      <Ionicons name={focused ? icon.on : icon.off} size={24} color={focused ? Brand.green : INACTIVE} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.label, focused && styles.labelActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const barW = width - SIDE * 2;
  const activeName = state.routes[state.index]?.name;
  const routeByName = (name: string) => state.routes.find((r) => r.name === name);

  const press = (name: string) => {
    const route = routeByName(name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (activeName !== name && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };
  const longPress = (name: string) => {
    const route = routeByName(name);
    if (route) navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  const renderItem = (name: string) =>
    routeByName(name) ? (
      <TabItem
        key={name}
        focused={activeName === name}
        label={t(`tabs.${name}.label`)}
        icon={ICONS[name]}
        onPress={() => press(name)}
        onLongPress={() => longPress(name)}
      />
    ) : null;

  const centerActive = activeName === CENTER;

  if (activeName && HIDE_ON.includes(activeName)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { left: SIDE, right: SIDE, bottom: bottomMargin(insets.bottom), height: BAR_H + TOP_PAD },
      ]}
    >
      {/* جسم الشريط مع ظل مرسوم */}
      <View pointerEvents="none" style={[styles.svgWrap, { top: TOP_PAD }]}>
        <Svg width={barW} height={BAR_H + 12}>
          <Path d={barPath(barW, BAR_H)} fill="rgba(5,35,27,0.04)" transform="translate(0 9)" />
          <Path d={barPath(barW, BAR_H)} fill="rgba(5,35,27,0.06)" transform="translate(0 5)" />
          <Path d={barPath(barW, BAR_H)} fill="rgba(5,35,27,0.08)" transform="translate(0 2)" />
          <Path
            d={barPath(barW, BAR_H)}
            fill={Brand.white}
            stroke="rgba(11,51,38,0.07)"
            strokeWidth={1}
          />
        </Svg>
      </View>

      {/* الأزرار الأربعة */}
      <View style={[styles.row, { top: TOP_PAD }]}>
        {LEFT.map(renderItem)}
        <View style={{ width: CENTER_GAP }} />
        {RIGHT.map(renderItem)}
      </View>

      {/* الزر الأوسط: المخطط الذكي */}
      {routeByName(CENTER) && (
        <>
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.centerWrap]}>
            <Pressable
              onPress={() => press(CENTER)}
              onLongPress={() => longPress(CENTER)}
              accessibilityRole="tab"
              accessibilityState={{ selected: centerActive }}
              accessibilityLabel={t('tabs.planner.title')}
              style={({ pressed }) => [
                styles.fab,
                { marginTop: TOP_PAD + FAB_CY - FAB / 2 },
                centerActive && styles.fabActive,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={['#1F8A66', '#0B3A2B']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="sparkles" size={28} color={Brand.white} />
            </Pressable>
          </View>

          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={[styles.centerLabel, { top: TOP_PAD + 49 }, centerActive && styles.labelActive]}
          >
            {t('tabs.planner.label')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  svgWrap: { position: 'absolute', left: 0, right: 0 },

  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: Brand.gold,
  },
  label: { color: INACTIVE, fontSize: 11, fontWeight: '600', maxWidth: 66 },
  labelActive: { color: Brand.green, fontWeight: '800' },

  centerWrap: { alignItems: 'center' },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232,176,75,0.55)',
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fabActive: { borderColor: Brand.gold, borderWidth: 2.5 },
  centerLabel: {
    position: 'absolute',
    alignSelf: 'center',
    color: INACTIVE,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
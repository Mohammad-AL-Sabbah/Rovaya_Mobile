import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Brand } from '@/constants/brand';

/* خريطة تخطيطية (ليست حدوداً سياسية): مواقع المدن النسبية فقط حسب خطوط الطول والعرض */
const LON: [number, number] = [34.4, 35.6];
const LAT: [number, number] = [31.4, 33.1];
const MAP_H = 250;

type Side = 'right' | 'left' | 'top';
interface City {
  key: string;
  lon: number;
  lat: number;
  side: Side;
  main?: boolean;
}

const CITIES: City[] = [
  { key: 'acre', lon: 35.07, lat: 32.93, side: 'right' },
  { key: 'nablus', lon: 35.26, lat: 32.22, side: 'right' },
  { key: 'jaffa', lon: 34.75, lat: 32.05, side: 'right' },
  { key: 'jerusalem', lon: 35.21, lat: 31.77, side: 'top', main: true },
  { key: 'bethlehem', lon: 35.2, lat: 31.7, side: 'left' },
  { key: 'hebron', lon: 35.1, lat: 31.53, side: 'left' },
  { key: 'jericho', lon: 35.46, lat: 31.86, side: 'top' },
];

// مسار مقترح من الشمال إلى الجنوب
const ROUTE = ['acre', 'nablus', 'jerusalem', 'bethlehem', 'hebron'];

// الساحل المتوسطي تقريباً (من الشمال إلى الجنوب)
const COAST: [number, number][] = [
  [35.1, 33.1],
  [35.07, 32.93],
  [34.95, 32.6],
  [34.9, 32.5],
  [34.75, 32.05],
  [34.64, 31.8],
  [34.45, 31.52],
  [34.4, 31.4],
];

function PulseRing() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
        },
      ]}
    />
  );
}

export function DiscoverMapCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const W = Math.round(width - 40 - 28); // عرض الشاشة - هوامش الصفحة - حشوة البطاقة

  const px = (lon: number) => ((lon - LON[0]) / (LON[1] - LON[0])) * W;
  const py = (lat: number) => ((LAT[1] - lat) / (LAT[1] - LAT[0])) * MAP_H;

  const point = (key: string) => {
    const c = CITIES.find((x) => x.key === key)!;
    return { x: px(c.lon), y: py(c.lat) };
  };

  // مسار ناعم عبر المدن
  const pts = ROUTE.map(point);
  let route = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    route += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  route += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

  // منطقة البحر
  const coast = COAST.map(([lon, lat]) => `${px(lon)} ${py(lat)}`);
  const sea = `M ${coast[0]} ${coast
    .slice(1)
    .map((c) => `L ${c}`)
    .join(' ')} L 0 ${MAP_H} L 0 0 Z`;
  const coastLine = `M ${coast[0]} ${coast
    .slice(1)
    .map((c) => `L ${c}`)
    .join(' ')}`;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{t('home.map.title')}</Text>
          <Text style={styles.subtitle}>{t('home.map.subtitle')}</Text>
        </View>
        <View style={styles.headIcon}>
          <Ionicons name="map" size={20} color={Brand.gold} />
        </View>
      </View>

      {/* الخريطة دائماً بالاتجاه الجغرافي الصحيح (غرب يسار / شرق يمين) */}
      <View style={[styles.map, { width: W, height: MAP_H, direction: 'ltr' }]}>
        <Svg width={W} height={MAP_H}>
          <Defs>
            <Pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <Circle cx="2" cy="2" r="1.1" fill="rgba(247,235,210,0.16)" />
            </Pattern>
          </Defs>
          <Rect width={W} height={MAP_H} fill="#12503A" />
          <Rect width={W} height={MAP_H} fill="url(#dots)" />
          <Path d={sea} fill="#0A2E3B" />
          <Path d={coastLine} fill="none" stroke="#2E7A8A" strokeWidth={2} />
          <Path d={route} fill="none" stroke="rgba(232,176,75,0.28)" strokeWidth={8} strokeLinecap="round" />
          <Path
            d={route}
            fill="none"
            stroke={Brand.gold}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeDasharray="1 7"
          />
        </Svg>

        <Text style={[styles.seaLabel, { left: 12, bottom: 14 }]}>{t('home.map.sea')}</Text>

        {CITIES.map((c) => {
          const x = px(c.lon);
          const y = py(c.lat);
          const size = c.main ? 18 : 12;
          const label = t(`home.map.cities.${c.key}`);

          return (
            <React.Fragment key={c.key}>
              {c.main && (
                <View style={[styles.pulseHost, { left: x - 9, top: y - 9 }]}>
                  <PulseRing />
                </View>
              )}

              <View
                style={[
                  styles.dot,
                  {
                    left: x - size / 2,
                    top: y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                  },
                  c.main && styles.dotMain,
                ]}
              />

              {c.side === 'right' && (
                <Text style={[styles.labelBox, styles.labelAbs, c.main && styles.labelMain, { left: x + size / 2 + 6, top: y - 9 }]}>
                  {label}
                </Text>
              )}
              {c.side === 'left' && (
                <Text
                  style={[
                    styles.labelBox,
                    styles.labelAbs,
                    c.main && styles.labelMain,
                    { right: W - x + size / 2 + 6, top: y - 9 },
                  ]}
                >
                  {label}
                </Text>
              )}
              {c.side === 'top' && (
                <View style={[styles.topWrap, { left: x - 50, top: y - size / 2 - 28 }]}>
                  <Text style={[styles.labelBox, c.main && styles.labelMain]}>{label}</Text>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

    
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 14,
    borderRadius: 26,
    backgroundColor: '#0B3A2B',
    borderWidth: 1,
    borderColor: 'rgba(232,176,75,0.4)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingTop: 4 },
  title: { color: Brand.white, fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(247,235,210,0.85)', fontSize: 13.5, lineHeight: 20 },
  headIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  map: { borderRadius: 20, overflow: 'hidden', alignSelf: 'center' },
  seaLabel: {
    position: 'absolute',
    color: '#6FB4C4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  dot: {
    position: 'absolute',
    backgroundColor: '#6FE7B8',
    borderWidth: 2.5,
    borderColor: '#0B3A2B',
  },
  dotMain: { backgroundColor: Brand.gold, borderColor: Brand.white, borderWidth: 3 },
  pulseHost: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  pulse: { width: 18, height: 18, borderRadius: 9, backgroundColor: Brand.gold },

  labelAbs: { position: 'absolute' },
  labelBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(5,35,27,0.78)',
    color: '#F7EBD2',
    fontSize: 11.5,
    fontWeight: '700',
  },
  labelMain: { backgroundColor: Brand.gold, color: Brand.deep, fontWeight: '800' },
  topWrap: { position: 'absolute', width: 100, alignItems: 'center' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: Brand.gold,
  },
  ctaText: { color: Brand.deep, fontSize: 15, fontWeight: '800' },
});
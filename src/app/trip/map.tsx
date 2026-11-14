import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Brand } from '@/constants/brand';
import {
  Coord,
  Lang,
  Place,
  PlaceCategory,
  RouteResult,
  PALESTINE_CITIES,
  distanceMeters,
  geocodePlace,
  getDirectionsUrl,
  getPlaceDetails,
  getPlaceUrl,
  getRoute,
  getUserLocation,
  isInPalestine,
  normalizeCoord,
  searchNearbyPlaces,
} from '@/api/maps';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Stop = Coord & {
  key: string;
  dayNumber: number;
  time: string;
  endTime: string;
  type: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  tipsAr: string;
  tipsEn: string;
  cityAr: string;
  cityEn: string;
  cost: number;
};

type PlaceSheet = {
  id: string;
  name: string;
  coord: Coord;
  category?: PlaceCategory;
  base?: Place;
};

const FALLBACK: Coord = { latitude: 31.9038, longitude: 35.2034 };
const DAY_COLORS = [Brand.green, '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D'];

const CATEGORIES: { key: PlaceCategory; icon: IconName; color: string; ar: string; en: string }[] = [
  { key: 'restaurant', icon: 'restaurant', color: '#EF4444', ar: 'مطاعم', en: 'Restaurants' },
  { key: 'cafe', icon: 'cafe', color: '#B45309', ar: 'كافيهات', en: 'Cafés' },
  { key: 'lodging', icon: 'bed', color: '#0EA5E9', ar: 'فنادق', en: 'Hotels' },
  { key: 'tourist_attraction', icon: 'camera', color: '#8B5CF6', ar: 'معالم سياحية', en: 'Attractions' },
  { key: 'pharmacy', icon: 'medkit', color: '#10B981', ar: 'صيدليات', en: 'Pharmacies' },
  { key: 'atm', icon: 'card', color: '#64748B', ar: 'صرافات', en: 'ATMs' },
  { key: 'gas_station', icon: 'car-sport', color: '#F59E0B', ar: 'محطات وقود', en: 'Gas stations' },
  { key: 'parking', icon: 'car', color: '#475569', ar: 'مواقف', en: 'Parking' },
];

const centroid = (pts: Coord[]): Coord => ({
  latitude: pts.reduce((s, p) => s + p.latitude, 0) / pts.length,
  longitude: pts.reduce((s, p) => s + p.longitude, 0) / pts.length,
});

/** Marker بـ View مخصص: يتتبع التغيّر لحظة فقط ثم يتوقف (ثبات وأداء على أندرويد) */
function PinMarker({
  coordinate,
  onPress,
  zIndex,
  children,
}: {
  coordinate: Coord;
  onPress?: () => void;
  zIndex?: number;
  children: React.ReactNode;
}) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTrack(false), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={track}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={zIndex}
    >
      {children}
    </Marker>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F5B301"
        />
      ))}
    </View>
  );
}

export default function TripMapScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: SH } = useWindowDimensions();
  const isArabic = !!i18n.language?.startsWith('ar');
  const lang: Lang = isArabic ? 'ar' : 'en';
  const tr = (ar: string, en: string) => (isArabic ? ar : en);
  const pick = (ar?: string, en?: string) => (isArabic ? ar || en || '' : en || ar || '');

  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);
  const mountedRef = useRef(true);
  const routeReq = useRef(0);
  const nearbyCache = useRef(new Map<string, Place[]>());
  const listScroll = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({});
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // ───── بيانات الرحلة ─────
  const { tripData } = useLocalSearchParams<{ tripData?: string }>();
  const parsedTrip = useMemo(() => {
    try {
      return tripData ? JSON.parse(tripData) : null;
    } catch {
      return null;
    }
  }, [tripData]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'all' | number>('all');

  // ───── الموقع ─────
  const [locStatus, setLocStatus] = useState<'loading' | 'granted' | 'denied' | 'unavailable'>('loading');
  const [userLoc, setUserLoc] = useState<Coord | null>(null);

  // ───── الخريطة والمسار ─────
  const [mapReady, setMapReady] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeTick, setRouteTick] = useState(0);

  // ───── البطاقة السفلية القابلة للطي ─────
  const [panelOpen, setPanelOpen] = useState(false);
  const [headerH, setHeaderH] = useState(120);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // ───── الطبقات ─────
  const [layersOpen, setLayersOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [nearby, setNearby] = useState<Record<string, Place[]>>({});

  // ───── نافذة تفاصيل المكان ─────
  const [placeSheet, setPlaceSheet] = useState<PlaceSheet | null>(null);
  const [placeData, setPlaceData] = useState<Place | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [showHours, setShowHours] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ارتفاع البطاقة وهي مفتوحة، والجزء الظاهر منها وهي مطوية
  const EXPANDED_H = Math.min(Math.round(SH * 0.58), 520);
  const collapsedVisible = headerH + insets.bottom;
  const hiddenY = Math.max(EXPANDED_H - collapsedVisible, 0);

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: panelOpen ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [panelOpen, sheetAnim]);

  const sheetTranslate = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [hiddenY, 0] });

  // سحب الرأس لأعلى/أسفل لفتح وإغلاق البطاقة
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -20) setPanelOpen(true);
        else if (g.dy > 20) setPanelOpen(false);
      },
    })
  ).current;

  // ───── 1) موقع المستخدم ─────
  const loadLocation = useCallback(async () => {
    const r = await getUserLocation();
    if (!mountedRef.current) return null;
    setLocStatus(!r.granted ? 'denied' : r.coord ? 'granted' : 'unavailable');
    setUserLoc(r.coord);
    return r.coord;
  }, []);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  // ───── 2) استخراج المحطات وتحديد إحداثياتها ─────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const raw: any[] = [];
      for (const d of parsedTrip?.days ?? []) {
        for (const a of d?.activities ?? []) {
          raw.push({ a, d, key: `${d?.day_number}-${raw.length}` });
        }
      }

      const resolved = await Promise.all(
        raw.map(async ({ a, d, key }: any): Promise<Stop | null> => {
          const cityAr = String(d?.city ?? '');
          const cityEn = String(d?.city_en ?? '');

          // إحداثيات Gemini كتلميح (تقريبية)
          const hintRaw = normalizeCoord(a?.latitude, a?.longitude);
          const hint = hintRaw && isInPalestine(hintRaw) ? hintRaw : null;

          let coord: Coord | null = null;

          const g = await geocodePlace(String(a?.place_name_en || a?.place_name || ''), cityEn || cityAr);
          if (g && isInPalestine(g)) {
            const gc = { latitude: g.latitude, longitude: g.longitude };
            if (!hint) coord = gc;
            else if (g.partial) coord = hint; // نتيجة جزئية: نفضّل التلميح
            else coord = distanceMeters(gc, hint) < 20000 ? gc : hint; // بعيد جدًا عن التلميح: نثق بالتلميح
          } else if (hint) {
            coord = hint;
          } else {
            coord = PALESTINE_CITIES[cityEn] ?? PALESTINE_CITIES[cityAr] ?? null;
          }
          if (!coord) return null;

          return {
            ...coord,
            key,
            dayNumber: Number(d?.day_number) || 1,
            time: String(a?.time ?? ''),
            endTime: String(a?.end_time ?? ''),
            type: String(a?.activity_type ?? 'visit'),
            nameAr: String(a?.place_name ?? ''),
            nameEn: String(a?.place_name_en ?? ''),
            descAr: String(a?.description ?? ''),
            descEn: String(a?.description_en ?? ''),
            tipsAr: String(a?.tips ?? ''),
            tipsEn: String(a?.tips_en ?? ''),
            cityAr,
            cityEn,
            cost: Number(a?.cost_per_person) || 0,
          };
        })
      );

      if (cancelled) return;
      setStops(resolved.filter((s): s is Stop => s !== null));
      setStopsLoading(false);
    })().catch((e) => {
      console.warn('Stops error:', e);
      if (!cancelled) setStopsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [parsedTrip]);

  const dayMeta = useMemo(() => {
    const m = new Map<number, { themeAr: string; themeEn: string; date: string }>();
    (parsedTrip?.days ?? []).forEach((d: any) => {
      m.set(Number(d?.day_number) || 1, {
        themeAr: String(d?.theme ?? ''),
        themeEn: String(d?.theme_en ?? ''),
        date: String(d?.date ?? ''),
      });
    });
    return m;
  }, [parsedTrip]);

  const dayNumbers = useMemo(
    () => Array.from(new Set(stops.map((s) => s.dayNumber))).sort((a, b) => a - b),
    [stops]
  );

  const visibleStops = useMemo(
    () => (selectedDay === 'all' ? stops : stops.filter((s) => s.dayNumber === selectedDay)),
    [stops, selectedDay]
  );

  // المسار يبدأ من موقع السائح إذا كان "الكل" أو اليوم الأول، وإلا من أول محطة باليوم
  const userOrigin = !!userLoc && (selectedDay === 'all' || selectedDay === dayNumbers[0]);

  // ارتفاع الشريط العلوي (للإزاحة والتكبير)
  const hasLocWarn = locStatus === 'denied' || locStatus === 'unavailable';
  const topOffset = insets.top + 60 + (dayNumbers.length ? 48 : 0) + (hasLocWarn ? 46 : 0);

  // ───── 3) رسم المسار على الطرق ─────
  useEffect(() => {
    if (stopsLoading) return;
    if (visibleStops.length === 0) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    const origin = userOrigin && userLoc ? userLoc : visibleStops[0];
    const dests = userOrigin ? visibleStops : visibleStops.slice(1);
    if (dests.length === 0) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    const id = ++routeReq.current;
    setRoute(null);
    setRouteError(null);
    setRouteLoading(true);

    getRoute(origin, dests, lang)
      .then(({ route: r, error }) => {
        if (id !== routeReq.current || !mountedRef.current) return;
        setRoute(r);
        setRouteError(error);
      })
      .catch((e) => {
        if (id === routeReq.current && mountedRef.current) setRouteError(String(e?.message ?? e));
      })
      .finally(() => {
        if (id === routeReq.current && mountedRef.current) setRouteLoading(false);
      });
  }, [stopsLoading, visibleStops, userLoc, userOrigin, lang, routeTick]);

  // المقطع الواصل إلى المحطة رقم i
  const legFor = (i: number) => {
    if (!route) return null;
    const idx = userOrigin ? i : i - 1;
    return idx >= 0 ? route.legs[idx] ?? null : null;
  };

  // ───── 4) تكبير الخريطة ─────
  const fitAll = useCallback(() => {
    const pts: Coord[] = [...(userOrigin && userLoc ? [userLoc] : []), ...visibleStops];
    if (pts.length === 0 || !mapRef.current) return;
    const bottomPad = (panelOpen ? EXPANDED_H : collapsedVisible) + 30;
    try {
      if (pts.length === 1) {
        mapRef.current.animateToRegion({ ...pts[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
      } else {
        mapRef.current.fitToCoordinates(pts, {
          edgePadding: { top: topOffset + 10, right: 60, bottom: bottomPad, left: 60 },
          animated: true,
        });
      }
    } catch {}
  }, [visibleStops, userLoc, userOrigin, panelOpen, EXPANDED_H, collapsedVisible, topOffset]);

  const fitKey = `${selectedDay}-${visibleStops.length}-${userOrigin}`;
  useEffect(() => {
    if (!mapReady || stopsLoading) return;
    const t = setTimeout(fitAll, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, stopsLoading, fitKey]);

  /** تحريك الخريطة لمحطة، مع رفعها لتظهر فوق البطاقة المفتوحة */
  const focusStop = useCallback(
    (c: Coord, withSheet: boolean) => {
      const r = regionRef.current;
      const latD = Math.min(r?.latitudeDelta ?? 0.05, 0.05);
      const lngD = Math.min(r?.longitudeDelta ?? 0.05, 0.05);
      let dLat = 0;
      if (withSheet) {
        const visibleCenterY = (topOffset + (SH - EXPANDED_H)) / 2;
        const offsetPx = SH / 2 - visibleCenterY;
        dLat = -(offsetPx / SH) * latD;
      }
      mapRef.current?.animateToRegion(
        { latitude: c.latitude + dLat, longitude: c.longitude, latitudeDelta: latD, longitudeDelta: lngD },
        500
      );
    },
    [SH, EXPANDED_H, topOffset]
  );

  // ───── 5) الأماكن القريبة (طبقات) ─────
  const centers = useMemo<Coord[]>(() => {
    if (visibleStops.length === 0) return [userLoc ?? FALLBACK];
    if (selectedDay === 'all') {
      return dayNumbers.map((n) => centroid(stops.filter((s) => s.dayNumber === n)));
    }
    return [centroid(visibleStops)];
  }, [visibleStops, stops, selectedDay, dayNumbers, userLoc]);

  const cacheKey = (cat: string, c: Coord) =>
    `${cat}:${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}:${lang}`;

  useEffect(() => {
    CATEGORIES.filter((c) => enabled[c.key]).forEach((cat) => {
      centers.forEach(async (center) => {
        const k = cacheKey(cat.key, center);
        if (nearbyCache.current.has(k)) {
          setNearby((p) => (p[k] ? p : { ...p, [k]: nearbyCache.current.get(k)! }));
          return;
        }
        const res = await searchNearbyPlaces(center, cat.key, 5000, lang);
        nearbyCache.current.set(k, res);
        if (mountedRef.current) setNearby((p) => ({ ...p, [k]: res }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, centers, lang]);

  const visibleNearby = useMemo(() => {
    const seen = new Set<string>();
    const out: Place[] = [];
    CATEGORIES.filter((c) => enabled[c.key]).forEach((cat) => {
      centers.forEach((center) => {
        (nearby[cacheKey(cat.key, center)] ?? []).forEach((p) => {
          const id = `${cat.key}:${p.id}`;
          if (!seen.has(id)) {
            seen.add(id);
            out.push(p);
          }
        });
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby, enabled, centers, lang]);

  const enabledCount = CATEGORIES.filter((c) => enabled[c.key]).length;

  // ───── 6) تفاصيل مكان (من Google) ─────
  const openPlace = useCallback((p: PlaceSheet) => {
    setShowHours(false);
    setPlaceSheet(p);
  }, []);

  useEffect(() => {
    if (!placeSheet) {
      setPlaceData(null);
      setPlaceLoading(false);
      return;
    }
    let cancelled = false;
    setPlaceData(null);
    setPlaceLoading(true);
    getPlaceDetails(placeSheet.id, lang)
      .then((d) => {
        if (!cancelled) setPlaceData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlaceLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeSheet?.id, lang]);

  const placeView = useMemo<Place | null>(() => {
    if (!placeSheet) return null;
    const base: Place = placeSheet.base ?? {
      id: placeSheet.id,
      name: placeSheet.name,
      ...placeSheet.coord,
      category: placeSheet.category,
    };
    if (!placeData) return base;
    const out: any = { ...base };
    Object.entries(placeData).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') out[k] = v;
    });
    return out as Place;
  }, [placeSheet, placeData]);

  // ───── أدوات العرض ─────
  const fmtDistance = (m: number) =>
    m < 1000 ? `${Math.round(m)} ${tr('م', 'm')}` : `${(m / 1000).toFixed(1)} ${tr('كم', 'km')}`;

  const fmtDuration = (s: number) => {
    const m = Math.max(Math.round(s / 60), 1);
    if (m < 60) return `${m} ${tr('د', 'min')}`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} ${tr('س', 'h')} ${r} ${tr('د', 'min')}` : `${h} ${tr('س', 'h')}`;
  };

  const dayColor = (n: number) => DAY_COLORS[(Math.max(n, 1) - 1) % DAY_COLORS.length];
  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  const typeIcon = (t: string): IconName =>
    t === 'food' || t === 'meal' ? 'restaurant-outline' : t === 'visit' ? 'eye-outline' : 'star-outline';
  const typeLabel = (t: string) =>
    t === 'food' || t === 'meal' ? tr('طعام', 'Food') : t === 'visit' ? tr('زيارة', 'Visit') : tr('نشاط', 'Activity');

  /** رسالة مفهومة بدل نص الخطأ الخام */
  const routeProblem = (e: string) => {
    if (e.includes('MISSING_API_KEY')) {
      return tr(
        'مفتاح Google غير موجود داخل التطبيق. أضفه في app.json ثم أعد بناء التطبيق.',
        'Google API key is missing from the app. Add it in app.json and rebuild.'
      );
    }
    if (/REQUEST_DENIED|PERMISSION_DENIED|API_KEY|blocked|unregistered/i.test(e)) {
      return tr(
        'رفضت Google المفتاح. فعّل Routes API وتأكد من قيود المفتاح.',
        'Google rejected the API key. Enable Routes API and check the key restrictions.'
      );
    }
    if (/ZERO_RESULTS|NO_ROUTE/i.test(e)) {
      return tr('لا يوجد طريق بين هذه الأماكن.', 'No road route found between these places.');
    }
    return tr('تعذّر رسم المسار على الطرق.', "Couldn't draw the road route.");
  };

  const startNavigation = () => {
    if (visibleStops.length === 0) return;
    const dest = visibleStops[visibleStops.length - 1];
    const via = visibleStops.slice(0, -1);
    openUrl(getDirectionsUrl(dest, userOrigin ? userLoc : visibleStops[0], userOrigin ? via : via.slice(1)));
  };

  const goToMyLocation = async () => {
    const c = userLoc ?? (await loadLocation());
    if (c) mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 600);
  };

  // ───── تفاعل المحطات ─────
  const onMarkerStop = (s: Stop) => {
    setPanelOpen(true);
    setExpandedKey(s.key);
    focusStop(s, true);
    setTimeout(() => {
      listScroll.current?.scrollTo({ y: Math.max((rowY.current[s.key] ?? 0) - 8, 0), animated: true });
    }, 350);
  };

  const onRowPress = (s: Stop) => {
    const willOpen = expandedKey !== s.key;
    setExpandedKey(willOpen ? s.key : null);
    if (willOpen) focusStop(s, true);
  };

  const showOnMap = (s: Stop) => {
    setPanelOpen(false);
    focusStop(s, false);
  };

  const totalCost = visibleStops.reduce((sum, s) => sum + s.cost, 0);
  const dayLabel = selectedDay === 'all' ? tr('كل الأيام', 'All days') : tr(`اليوم ${selectedDay}`, `Day ${selectedDay}`);

  // ───── الواجهة ─────
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...FALLBACK, latitudeDelta: 0.6, longitudeDelta: 0.6 }}
        showsUserLocation={locStatus === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={(r) => {
          regionRef.current = r;
        }}
        onPress={() => setPanelOpen(false)}
        onPoiClick={(e) => {
          const { placeId, name, coordinate } = e.nativeEvent;
          if (placeId) openPlace({ id: placeId, name: name ?? '', coord: coordinate });
        }}
      >
        {/* المسار على الطرق (حد أبيض + خط ملوّن) */}
        {route && route.points.length > 1 && (
          <>
            <Polyline coordinates={route.points} strokeColor="#FFFFFF" strokeWidth={9} zIndex={1} />
            <Polyline coordinates={route.points} strokeColor={Brand.green} strokeWidth={5} zIndex={2} />
          </>
        )}

        {/* محطات الرحلة */}
        {visibleStops.map((s, i) => (
          <PinMarker key={`${s.key}-${selectedDay}`} coordinate={s} zIndex={20} onPress={() => onMarkerStop(s)}>
            <View style={[styles.tripMarker, { backgroundColor: dayColor(s.dayNumber) }]}>
              <Text style={styles.tripMarkerText}>{i + 1}</Text>
            </View>
          </PinMarker>
        ))}

        {/* الأماكن القريبة (الطبقات المفعّلة) */}
        {visibleNearby.map((p) => {
          const cat = CATEGORIES.find((c) => c.key === p.category);
          return (
            <PinMarker
              key={`${p.category}-${p.id}`}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              zIndex={5}
              onPress={() => openPlace({ id: p.id, name: p.name, coord: p, category: p.category, base: p })}
            >
              <View style={[styles.nearbyMarker, { backgroundColor: cat?.color ?? '#666' }]}>
                <Ionicons name={cat?.icon ?? 'location'} size={14} color="#FFF" />
              </View>
            </PinMarker>
          );
        })}
      </MapView>

      {/* الشريط العلوي */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.roundBtn}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFF" />
          </Pressable>

          <View style={styles.titlePill}>
            <Text style={styles.titleText}>{tr('خريطة الرحلة', 'Trip Map')}</Text>
          </View>

          <Pressable onPress={() => setLayersOpen(true)} style={styles.roundBtn}>
            <Ionicons name="layers" size={22} color="#FFF" />
            {enabledCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{enabledCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {dayNumbers.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {(['all', ...dayNumbers] as Array<'all' | number>).map((d) => {
              const active = selectedDay === d;
              return (
                <Pressable
                  key={String(d)}
                  onPress={() => {
                    setSelectedDay(d);
                    setExpandedKey(null);
                  }}
                  style={[styles.chip, active && { backgroundColor: d === 'all' ? Brand.green : dayColor(d) }]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                    {d === 'all' ? tr('كل الأيام', 'All days') : tr(`اليوم ${d}`, `Day ${d}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {hasLocWarn && (
          <Pressable
            onPress={() => (locStatus === 'denied' ? Linking.openSettings() : loadLocation())}
            style={styles.warnBanner}
          >
            <Ionicons name="location-outline" size={16} color="#8B6914" />
            <Text style={styles.warnText}>
              {locStatus === 'denied'
                ? tr('الموقع غير مفعّل. اضغط لفتح الإعدادات.', 'Location is off. Tap to open settings.')
                : tr('تعذّر تحديد موقعك. اضغط للمحاولة مجددًا.', "Couldn't get your location. Tap to retry.")}
            </Text>
          </Pressable>
        )}
      </View>

      {/* أزرار صغيرة (موقعي / عرض الكل) */}
      <View style={[styles.fabCol, { top: topOffset }]} pointerEvents="box-none">
        <Pressable onPress={goToMyLocation} style={styles.fab}>
          <Ionicons name="locate" size={22} color={Brand.green} />
        </Pressable>
        <Pressable onPress={fitAll} style={styles.fab}>
          <Ionicons name="scan-outline" size={22} color={Brand.green} />
        </Pressable>
      </View>

      {/* ───── بطاقة تفاصيل الرحلة (قابلة للطي) ───── */}
      {!stopsLoading && (
        <Animated.View
          style={[
            styles.dock,
            { height: EXPANDED_H, paddingBottom: insets.bottom, transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          {/* الرأس: يظهر دائمًا، اضغط أو اسحب لفتح/طي */}
          <View {...pan.panHandlers} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
            <Pressable onPress={() => setPanelOpen((o) => !o)} style={styles.dockHeader}>
              <View style={styles.dockGrab} />

              <View style={styles.dockTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dockTitle} numberOfLines={1}>
                    {pick(parsedTrip?.trip_title, parsedTrip?.trip_title_en) || tr('تفاصيل الرحلة', 'Trip details')}
                  </Text>
                  <Text style={styles.dockSub}>
                    {dayLabel} • {visibleStops.length} {tr('محطات', 'stops')}
                  </Text>
                </View>
                <View style={styles.dockToggle}>
                  <Text style={styles.dockToggleText}>
                    {panelOpen ? tr('إخفاء', 'Hide') : tr('عرض المحطات', 'Show stops')}
                  </Text>
                  <Ionicons name={panelOpen ? 'chevron-down' : 'chevron-up'} size={18} color={Brand.green} />
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Ionicons name="time-outline" size={16} color={Brand.green} />
                  <Text style={styles.statText}>{route ? fmtDuration(route.durationSeconds) : '—'}</Text>
                </View>
                <View style={styles.statCell}>
                  <Ionicons name="swap-horizontal" size={16} color={Brand.green} />
                  <Text style={styles.statText}>{route ? fmtDistance(route.distanceMeters) : '—'}</Text>
                </View>
                <View style={styles.statCell}>
                  <Ionicons name="cash-outline" size={16} color={Brand.green} />
                  <Text style={styles.statText}>
                    ${Math.round(totalCost)}
                    <Text style={styles.statUnit}> /{tr('للشخص', 'person')}</Text>
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* المحتوى */}
          <View style={styles.dockBody}>
            {routeLoading && (
              <View style={styles.routeNote}>
                <ActivityIndicator size="small" color={Brand.green} />
                <Text style={styles.routeNoteText}>{tr('جاري رسم المسار...', 'Drawing route...')}</Text>
              </View>
            )}

            {!routeLoading && routeError && routeError !== 'NO_POINTS' && (
              <View style={styles.routeWarn}>
                <Ionicons name="alert-circle-outline" size={18} color="#8B6914" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeWarnText}>{routeProblem(routeError)}</Text>
                  {__DEV__ && (
                    <Text style={styles.routeWarnDetail} numberOfLines={3}>
                      {routeError}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => setRouteTick((t) => t + 1)} style={styles.retryBtn}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                </Pressable>
              </View>
            )}

            <ScrollView
              ref={listScroll}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {visibleStops.length === 0 && (
                <Text style={styles.emptyText}>
                  {tr('لا توجد محطات لعرضها. أنشئ رحلة أولًا.', 'No stops to show. Generate a trip first.')}
                </Text>
              )}

              {visibleStops.map((s, i) => {
                const newDay = i === 0 || visibleStops[i - 1].dayNumber !== s.dayNumber;
                const meta = dayMeta.get(s.dayNumber);
                const expanded = expandedKey === s.key;
                const leg = legFor(i);
                const fromUser = userLoc ? distanceMeters(userLoc, s) : null;
                const desc = pick(s.descAr, s.descEn);
                const tips = pick(s.tipsAr, s.tipsEn);
                const theme = pick(meta?.themeAr, meta?.themeEn);

                return (
                  <React.Fragment key={s.key}>
                    {newDay && (
                      <View style={styles.dayHeader}>
                        <View style={[styles.dayDot, { backgroundColor: dayColor(s.dayNumber) }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dayHeaderTitle}>
                            {tr(`اليوم ${s.dayNumber}`, `Day ${s.dayNumber}`)}
                            {meta?.date ? ` • ${meta.date}` : ''}
                          </Text>
                          <Text style={styles.dayHeaderSub} numberOfLines={2}>
                            {pick(s.cityAr, s.cityEn)}
                            {theme ? ` — ${theme}` : ''}
                          </Text>
                        </View>
                      </View>
                    )}

                    <Pressable
                      onLayout={(e) => {
                        rowY.current[s.key] = e.nativeEvent.layout.y;
                      }}
                      onPress={() => onRowPress(s)}
                      style={[styles.row, expanded && styles.rowActive]}
                    >
                      <View style={[styles.numBadge, { backgroundColor: dayColor(s.dayNumber) }]}>
                        <Text style={styles.numBadgeText}>{i + 1}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={expanded ? 3 : 2}>
                          {pick(s.nameAr, s.nameEn)}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {s.time}
                          {s.endTime ? ` - ${s.endTime}` : ''} • {typeLabel(s.type)} • ${s.cost}
                        </Text>

                        <View style={styles.chipsWrap}>
                          {fromUser !== null && (
                            <View style={styles.infoChip}>
                              <Ionicons name="walk-outline" size={12} color={Brand.green} />
                              <Text style={styles.infoChipText}>
                                {tr(`يبعد عنك ≈ ${fmtDistance(fromUser)}`, `≈ ${fmtDistance(fromUser)} from you`)}
                              </Text>
                            </View>
                          )}
                          {leg && (
                            <View style={[styles.infoChip, { backgroundColor: '#EEF2FF' }]}>
                              <Ionicons name="car-outline" size={12} color="#4338CA" />
                              <Text style={[styles.infoChipText, { color: '#4338CA' }]}>
                                {fmtDistance(leg.distanceMeters)} • {fmtDuration(leg.durationSeconds)}{' '}
                                {i === 0 && userOrigin ? tr('من موقعك', 'from you') : tr('من السابقة', 'from prev')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.muted} />
                    </Pressable>

                    {expanded && (
                      <View style={styles.detail}>
                        <View style={styles.typeBadge}>
                          <Ionicons name={typeIcon(s.type)} size={13} color={Brand.green} />
                          <Text style={styles.typeBadgeText}>{typeLabel(s.type)}</Text>
                        </View>
                        {!!desc && <Text style={styles.detailBody}>{desc}</Text>}
                        {!!tips && <Text style={styles.detailTip}>💡 {tips}</Text>}

                        <View style={styles.detailBtns}>
                          <Pressable onPress={() => showOnMap(s)} style={[styles.smallBtn, { backgroundColor: Brand.mint }]}>
                            <Ionicons name="map-outline" size={15} color={Brand.green} />
                            <Text style={[styles.smallBtnText, { color: Brand.green }]}>{tr('على الخريطة', 'On map')}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => openUrl(getDirectionsUrl(s, userLoc))}
                            style={[styles.smallBtn, { backgroundColor: Brand.green }]}
                          >
                            <Ionicons name="navigate" size={15} color="#FFF" />
                            <Text style={[styles.smallBtnText, { color: '#FFF' }]}>{tr('توجيه', 'Navigate')}</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </ScrollView>

            {visibleStops.length > 0 && (
              <Pressable onPress={startNavigation} style={styles.primaryBtn}>
                <Ionicons name="navigate" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>{tr('ابدأ التنقل', 'Start navigation')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {/* شاشة التحميل */}
      {stopsLoading && (
        <View style={[styles.loadingOverlay, { paddingTop: insets.top + 140 }]}>
          <ActivityIndicator size="large" color={Brand.green} />
          <Text style={styles.loadingText}>
            {tr('جاري تحديد أماكن الرحلة على الخريطة...', 'Locating your trip stops on the map...')}
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.roundBtn, styles.loadingBack, { top: insets.top + 8 }]}>
            <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFF" />
          </Pressable>
        </View>
      )}

      {/* ───── نافذة تفاصيل المكان (بيانات Google Maps) ───── */}
      <Modal visible={!!placeSheet} transparent animationType="slide" onRequestClose={() => setPlaceSheet(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPlaceSheet(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <View style={styles.sheetGrab} />

            {placeView && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                {/* الصور */}
                {placeLoading && !(placeView.photos?.length || placeView.photoUrl) ? (
                  <View style={styles.photoPlaceholder}>
                    <ActivityIndicator color={Brand.green} />
                  </View>
                ) : (
                  (placeView.photos?.length || placeView.photoUrl) && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {(placeView.photos?.length ? placeView.photos : [placeView.photoUrl!]).map((u, idx) => (
                        <Image key={idx} source={{ uri: u }} style={styles.photo} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  )
                )}

                {/* العنوان */}
                <View style={styles.sheetTitleRow}>
                  <Text style={styles.sheetTitle} numberOfLines={3}>
                    {placeView.name || tr('مكان', 'Place')}
                  </Text>
                  <Pressable onPress={() => setPlaceSheet(null)} hitSlop={10}>
                    <Ionicons name="close" size={24} color={Brand.muted} />
                  </Pressable>
                </View>

                {/* التقييم والحالة */}
                <View style={styles.metaRow}>
                  {!!placeView.rating && (
                    <View style={styles.metaItem}>
                      <Text style={styles.ratingNum}>{placeView.rating.toFixed(1)}</Text>
                      <Stars value={placeView.rating} />
                      {!!placeView.userRatingsTotal && (
                        <Text style={styles.metaMuted}>({placeView.userRatingsTotal})</Text>
                      )}
                    </View>
                  )}
                  {placeView.priceLevel !== undefined && placeView.priceLevel > 0 && (
                    <Text style={styles.metaMuted}>{'$'.repeat(placeView.priceLevel)}</Text>
                  )}
                </View>

                <View style={styles.metaRow}>
                  {placeView.openNow !== undefined && (
                    <Text style={[styles.metaStrong, { color: placeView.openNow ? '#16A34A' : '#DC2626' }]}>
                      {placeView.openNow ? tr('مفتوح الآن', 'Open now') : tr('مغلق الآن', 'Closed now')}
                    </Text>
                  )}
                  {userLoc && (
                    <Text style={styles.metaMuted}>
                      {tr(
                        `يبعد عنك ≈ ${fmtDistance(distanceMeters(userLoc, placeView))}`,
                        `≈ ${fmtDistance(distanceMeters(userLoc, placeView))} from you`
                      )}
                    </Text>
                  )}
                </View>

                {!!placeView.summary && <Text style={styles.sheetBody}>{placeView.summary}</Text>}

                {/* أزرار الإجراءات */}
                <View style={styles.actionsRow}>
                  {!!placeView.phone && (
                    <Pressable onPress={() => openUrl(`tel:${placeView.phone}`)} style={styles.actionBtn}>
                      <Ionicons name="call" size={20} color={Brand.green} />
                      <Text style={styles.actionText}>{tr('اتصال', 'Call')}</Text>
                    </Pressable>
                  )}
                  {!!placeView.website && (
                    <Pressable onPress={() => openUrl(placeView.website!)} style={styles.actionBtn}>
                      <Ionicons name="globe-outline" size={20} color={Brand.green} />
                      <Text style={styles.actionText}>{tr('الموقع', 'Website')}</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => openUrl(getDirectionsUrl(placeView, userLoc))} style={styles.actionBtn}>
                    <Ionicons name="navigate" size={20} color={Brand.green} />
                    <Text style={styles.actionText}>{tr('توجيه', 'Directions')}</Text>
                  </Pressable>
                  <Pressable onPress={() => openUrl(getPlaceUrl(placeView))} style={styles.actionBtn}>
                    <Ionicons name="logo-google" size={20} color={Brand.green} />
                    <Text style={styles.actionText}>{tr('في Google Maps', 'Google Maps')}</Text>
                  </Pressable>
                </View>

                {/* العنوان والساعات */}
                {!!placeView.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color={Brand.muted} />
                    <Text style={styles.infoText}>{placeView.address}</Text>
                  </View>
                )}
                {!!placeView.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color={Brand.muted} />
                    <Text style={styles.infoText}>{placeView.phone}</Text>
                  </View>
                )}
                {!!placeView.hours?.length && (
                  <View>
                    <Pressable onPress={() => setShowHours((v) => !v)} style={styles.infoRow}>
                      <Ionicons name="time-outline" size={18} color={Brand.muted} />
                      <Text style={[styles.infoText, { fontWeight: '800' }]}>{tr('ساعات العمل', 'Opening hours')}</Text>
                      <Ionicons name={showHours ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.muted} />
                    </Pressable>
                    {showHours &&
                      placeView.hours.map((h, i) => (
                        <Text key={i} style={styles.hoursText}>
                          {h}
                        </Text>
                      ))}
                  </View>
                )}

                {/* التقييمات */}
                {!!placeView.reviews?.length && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.sectionTitle}>{tr('التقييمات', 'Reviews')}</Text>
                    {placeView.reviews.map((rv, i) => (
                      <View key={i} style={styles.review}>
                        <View style={styles.reviewHead}>
                          <Text style={styles.reviewAuthor} numberOfLines={1}>
                            {rv.author}
                          </Text>
                          <Stars value={rv.rating} size={12} />
                        </View>
                        {!!rv.when && <Text style={styles.reviewWhen}>{rv.when}</Text>}
                        {!!rv.text && (
                          <Text style={styles.reviewText} numberOfLines={6}>
                            {rv.text}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {placeLoading && <ActivityIndicator style={{ marginTop: 12 }} color={Brand.green} />}
                {!placeLoading && !placeData && (
                  <Text style={styles.metaMuted}>
                    {tr('تعذّر تحميل كل التفاصيل. جرّب "في Google Maps".', 'Could not load all details. Try “Google Maps”.')}
                  </Text>
                )}

                <Text style={styles.attribution}>{tr('البيانات من Google Maps', 'Data by Google Maps')}</Text>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ───── نافذة الطبقات ───── */}
      <Modal visible={layersOpen} transparent animationType="slide" onRequestClose={() => setLayersOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLayersOpen(false)}>
          <Pressable style={[styles.layersSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tr('إظهار على الخريطة', 'Show on map')}</Text>
            <Text style={styles.modalSub}>
              {tr('الأماكن تُعرض حول محطات اليوم المختار.', 'Places are shown around the selected day’s stops.')}
            </Text>

            {CATEGORIES.map((c) => (
              <View key={c.key} style={styles.layerRow}>
                <View style={[styles.layerIcon, { backgroundColor: c.color }]}>
                  <Ionicons name={c.icon} size={16} color="#FFF" />
                </View>
                <Text style={styles.layerLabel}>{tr(c.ar, c.en)}</Text>
                <Switch
                  value={!!enabled[c.key]}
                  onValueChange={(v) => setEnabled((p) => ({ ...p, [c.key]: v }))}
                  trackColor={{ true: Brand.green, false: '#D1D5DB' }}
                />
              </View>
            ))}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEnabled({})} style={[styles.modalBtn, { backgroundColor: Brand.mint }]}>
                <Text style={[styles.modalBtnText, { color: Brand.green }]}>{tr('إخفاء الكل', 'Hide all')}</Text>
              </Pressable>
              <Pressable onPress={() => setLayersOpen(false)} style={[styles.modalBtn, { backgroundColor: Brand.green }]}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>{tr('تم', 'Done')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.paper },

  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  titleText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },

  chipsRow: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  chipText: { fontSize: 13, fontWeight: '800', color: Brand.greenText },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  warnText: { flex: 1, fontSize: 12, color: '#8B6914', fontWeight: '600' },

  // نستخدم right (متماثل ولا يعتمد على اتجاه RTL)
  fabCol: { position: 'absolute', right: 16, gap: 10, zIndex: 25 },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  // البطاقة السفلية
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 28,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  dockHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  dockGrab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  dockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dockTitle: { fontSize: 16, fontWeight: '900', color: Brand.greenText },
  dockSub: { fontSize: 12, color: Brand.muted, fontWeight: '600', marginTop: 2 },
  dockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.mint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dockToggleText: { fontSize: 12, fontWeight: '800', color: Brand.green },
  dockBody: { flex: 1, paddingHorizontal: 16, paddingBottom: 8, gap: 10 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Brand.mint,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, fontWeight: '800', color: Brand.greenText },
  statUnit: { fontSize: 10, color: Brand.muted, fontWeight: '600' },

  routeNote: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeNoteText: { fontSize: 12, color: Brand.muted, fontWeight: '600' },
  routeWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 10,
  },
  routeWarnText: { fontSize: 12.5, fontWeight: '700', color: '#8B6914', lineHeight: 18 },
  routeWarnDetail: { fontSize: 10, color: '#8B6914', marginTop: 2, opacity: 0.8 },
  retryBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: Brand.muted, textAlign: 'center', paddingVertical: 20 },

  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 6 },
  dayDot: { width: 10, height: 10, borderRadius: 5 },
  dayHeaderTitle: { fontSize: 13, fontWeight: '900', color: Brand.greenText },
  dayHeaderSub: { fontSize: 11, color: Brand.muted, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F9FBFA',
    borderWidth: 1,
    borderColor: '#E8EDE9',
    marginBottom: 6,
  },
  rowActive: { borderColor: Brand.green, backgroundColor: Brand.mint },
  numBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  rowTitle: { fontSize: 14, fontWeight: '800', color: Brand.greenText },
  rowSub: { fontSize: 11, color: Brand.muted, fontWeight: '600', marginTop: 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  infoChipText: { fontSize: 10.5, fontWeight: '700', color: Brand.green },

  detail: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8EDE9',
    borderRadius: 12,
    padding: 10,
    marginTop: -2,
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: Brand.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: Brand.green },
  detailBody: { fontSize: 12.5, color: Brand.body, lineHeight: 19 },
  detailTip: { fontSize: 12, color: '#8B6914', lineHeight: 18, fontStyle: 'italic' },
  detailBtns: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
  },
  smallBtnText: { fontSize: 12.5, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: Brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  tripMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFF',
  },
  tripMarkerText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  nearbyMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: Brand.paper,
    zIndex: 40,
  },
  loadingBack: { position: 'absolute', left: 16 },
  loadingText: { marginTop: 14, color: Brand.muted, fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // نافذة تفاصيل المكان
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: '88%',
  },
  sheetGrab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 10 },
  photo: { width: 240, height: 160, borderRadius: 14, marginEnd: 8, backgroundColor: '#EEE' },
  photoPlaceholder: {
    height: 120,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 21, fontWeight: '900', color: Brand.greenText },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNum: { fontSize: 15, fontWeight: '900', color: Brand.greenText },
  metaMuted: { fontSize: 13, color: Brand.muted, fontWeight: '600' },
  metaStrong: { fontSize: 13, fontWeight: '800' },
  sheetBody: { fontSize: 14, color: Brand.body, lineHeight: 21, marginTop: 10 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 6 },
  actionBtn: {
    minWidth: 76,
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Brand.mint,
  },
  actionText: { fontSize: 12, fontWeight: '800', color: Brand.green },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoText: { flex: 1, fontSize: 14, color: Brand.body },
  hoursText: { fontSize: 13, color: Brand.body, paddingStart: 28, paddingVertical: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: Brand.greenText, marginBottom: 8 },
  review: { backgroundColor: '#F9FBFA', borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewAuthor: { flex: 1, fontSize: 13, fontWeight: '800', color: Brand.greenText },
  reviewWhen: { fontSize: 11, color: Brand.muted, marginTop: 2 },
  reviewText: { fontSize: 13, color: Brand.body, lineHeight: 19, marginTop: 6 },
  attribution: { textAlign: 'center', fontSize: 11, color: Brand.muted, marginTop: 14 },

  // نافذة الطبقات
  layersSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: Brand.greenText },
  modalSub: { fontSize: 12, color: Brand.muted, marginTop: 4, marginBottom: 12 },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
  },
  layerIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  layerLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: Brand.greenText },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '800' },
});
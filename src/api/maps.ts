import * as Location from 'expo-location';
import Constants from 'expo-constants';

// ⚠️ Expo يحذف android.config / ios.config من الإعدادات العامة داخل التطبيق المبني،
// لذلك لا يمكن قراءة المفتاح منهما وقت التشغيل (وكان هذا سبب الخطأ
// "Method doesn't allow unregistered callers" لأن الطلبات كانت تخرج بدون مفتاح).
// ضع المفتاح في app.json تحت  expo.extra.googleMapsApiKey  أو في .env باسم EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

const GOOGLE_API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (extra.googleWebApiKey as string | undefined) ||
  (extra.googleMapsApiKey as string | undefined) ||
  (Constants.expoConfig?.android?.config?.googleMaps?.apiKey as string | undefined) ||
  (Constants.expoConfig?.ios?.config?.googleMapsApiKey as string | undefined) ||
  '';

export const HAS_API_KEY = !!GOOGLE_API_KEY;
if (!HAS_API_KEY) {
  console.warn('[maps] Google API key is missing. Add expo.extra.googleMapsApiKey in app.json and rebuild.');
}

// ───────────── الأنواع ─────────────
export type Coord = { latitude: number; longitude: number };
export type Lang = 'ar' | 'en';

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'lodging'
  | 'tourist_attraction'
  | 'pharmacy'
  | 'atm'
  | 'gas_station'
  | 'parking';

export interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: PlaceCategory;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  phone?: string;
  website?: string;
  photoUrl?: string;
  photos?: string[];
  reviews?: PlaceReview[];
  hours?: string[];
  summary?: string;
  mapsUrl?: string;
  priceLevel?: number;
}

export interface TripActivity {
  time: string;
  end_time: string;
  place_name: string;
  place_name_en?: string;
  place_id?: number | null;
  activity_type: string;
  description: string;
  description_en?: string;
  cost_per_person: number;
  tips?: string;
  tips_en?: string;
  is_from_dataset: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TripDay {
  day_number: number;
  date: string;
  city: string;
  city_en?: string;
  theme: string;
  theme_en?: string;
  activities: TripActivity[];
  daily_cost: number;
}

export interface TripPlan {
  trip_title: string;
  trip_title_en?: string;
  summary: string;
  summary_en?: string;
  total_estimated_cost: number;
  days: TripDay[];
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  points: Coord[];
  distanceMeters: number;
  durationSeconds: number;
  /** مقطع لكل وجهة بالترتيب (origin → stop1 → stop2 ...) */
  legs: RouteLeg[];
}

export type RouteOutcome = { route: RouteResult | null; error: string | null };

// ───────────── أدوات الإحداثيات ─────────────
export const PALESTINE_BOUNDS = { minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.95 };

export const isValidCoord = (c: any): c is Coord =>
  !!c &&
  typeof c.latitude === 'number' &&
  typeof c.longitude === 'number' &&
  Number.isFinite(c.latitude) &&
  Number.isFinite(c.longitude) &&
  Math.abs(c.latitude) <= 90 &&
  Math.abs(c.longitude) <= 180 &&
  !(c.latitude === 0 && c.longitude === 0);

export const isInPalestine = (c: Coord) =>
  c.latitude >= PALESTINE_BOUNDS.minLat &&
  c.latitude <= PALESTINE_BOUNDS.maxLat &&
  c.longitude >= PALESTINE_BOUNDS.minLng &&
  c.longitude <= PALESTINE_BOUNDS.maxLng;

/** يحوّل أي قيمة (رقم/نص) لإحداثية سليمة أو null */
export const normalizeCoord = (lat: any, lng: any): Coord | null => {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const c = { latitude: Number(lat), longitude: Number(lng) };
  return isValidCoord(c) ? c : null;
};

/** المسافة المباشرة (بالمتر) بين نقطتين */
export function distanceMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ───────────── HTTP ─────────────
async function http(
  url: string,
  init?: RequestInit,
  timeoutMs = 12000
): Promise<{ ok: boolean; status: number; json: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    let json: any = null;
    try {
      json = await res.json();
    } catch {}
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

const googHeaders = (fieldMask: string) => ({
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': GOOGLE_API_KEY,
  'X-Goog-FieldMask': fieldMask,
});

const errText = (r: { status: number; json: any }) => {
  const e = r.json?.error;
  return e ? `${e.status ?? r.status}: ${String(e.message ?? '').slice(0, 160)}` : `HTTP ${r.status}`;
};

// ───────────── موقع المستخدم (GPS) ─────────────
export async function getUserLocation(): Promise<{ granted: boolean; coord: Coord | null }> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { granted: false, coord: null };

    try {
      if (!(await Location.hasServicesEnabledAsync())) return { granted: true, coord: null };
    } catch {}

    let coord: Coord | null = null;

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) coord = normalizeCoord(last.coords.latitude, last.coords.longitude);
    } catch {}

    try {
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((res) => setTimeout(() => res(null), 10000)),
      ]);
      if (fresh) {
        coord = normalizeCoord(fresh.coords.latitude, fresh.coords.longitude) ?? coord;
      }
    } catch {}

    return { granted: true, coord };
  } catch (e) {
    console.warn('getUserLocation error:', (e as Error).message);
    return { granted: false, coord: null };
  }
}

// ───────────── Geocoding ─────────────
const geoCache = new Map<string, (Coord & { partial: boolean }) | null>();

export async function geocodePlace(
  query: string,
  cityHint?: string
): Promise<(Coord & { partial: boolean }) | null> {
  const tryOne = async (address: string) => {
    if (!HAS_API_KEY) return null;
    if (geoCache.has(address)) return geoCache.get(address)!;
    let out: (Coord & { partial: boolean }) | null = null;
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(address)}` +
        `&bounds=${encodeURIComponent('29.4,34.2|33.4,35.95')}` +
        `&region=ps&language=en&key=${GOOGLE_API_KEY}`;
      const data = (await http(url)).json ?? {};
      if (data.status === 'OK' && data.results?.length) {
        const loc = data.results[0].geometry?.location;
        const c = normalizeCoord(loc?.lat, loc?.lng);
        if (c) out = { ...c, partial: !!data.results[0].partial_match };
      } else if (data.status !== 'ZERO_RESULTS') {
        console.warn('Geocode status:', data.status, data.error_message ?? '');
      }
    } catch (e) {
      console.warn('Geocode error:', (e as Error).message);
    }
    geoCache.set(address, out);
    return out;
  };

  const withCity = cityHint ? await tryOne(`${query}, ${cityHint}, Palestine`) : null;
  if (withCity && !withCity.partial) return withCity;
  const plain = await tryOne(`${query}, Palestine`);
  return withCity ?? plain;
}

export const PALESTINE_CITIES: Record<string, Coord> = {
  'القدس': { latitude: 31.7683, longitude: 35.2137 },
  Jerusalem: { latitude: 31.7683, longitude: 35.2137 },
  'رام الله': { latitude: 31.9038, longitude: 35.2034 },
  Ramallah: { latitude: 31.9038, longitude: 35.2034 },
  'نابلس': { latitude: 32.2211, longitude: 35.2544 },
  Nablus: { latitude: 32.2211, longitude: 35.2544 },
  'اريحا': { latitude: 31.8667, longitude: 35.4456 },
  'أريحا': { latitude: 31.8667, longitude: 35.4456 },
  Jericho: { latitude: 31.8667, longitude: 35.4456 },
  'بيت لحم': { latitude: 31.7054, longitude: 35.2024 },
  Bethlehem: { latitude: 31.7054, longitude: 35.2024 },
  'الخليل': { latitude: 31.5326, longitude: 35.0998 },
  Hebron: { latitude: 31.5326, longitude: 35.0998 },
  'عكا': { latitude: 32.9281, longitude: 35.0839 },
  Acre: { latitude: 32.9281, longitude: 35.0839 },
  'يافا': { latitude: 32.0541, longitude: 34.7563 },
  Jaffa: { latitude: 32.0541, longitude: 34.7563 },
  'غزة': { latitude: 31.5017, longitude: 34.4668 },
  Gaza: { latitude: 31.5017, longitude: 34.4668 },
  'جنين': { latitude: 32.4618, longitude: 35.2999 },
  Jenin: { latitude: 32.4618, longitude: 35.2999 },
  'طولكرم': { latitude: 32.3108, longitude: 35.0286 },
  Tulkarm: { latitude: 32.3108, longitude: 35.0286 },
  'سلفيت': { latitude: 32.0786, longitude: 35.1878 },
  Salfit: { latitude: 32.0786, longitude: 35.1878 },
  'قلقيلية': { latitude: 32.1878, longitude: 34.9636 },
  Qalqilya: { latitude: 32.1878, longitude: 34.9636 },
  'طوباس': { latitude: 32.3206, longitude: 35.585 },
  Tubas: { latitude: 32.3206, longitude: 35.585 },
};

// ───────────── فك تشفير Polyline ─────────────
export function decodePolyline(encoded?: string): Coord[] {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: Coord[] = [];
  let index = 0,
    lat = 0,
    lng = 0;

  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    const p = normalizeCoord(lat / 1e5, lng / 1e5);
    if (p) points.push(p);
  }
  return points;
}

// ───────────── المسار على الطرق ─────────────
const parseDuration = (d?: string) => {
  const n = parseInt(String(d ?? '0').replace('s', ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Routes API (الجديد) */
async function routesApi(origin: Coord, pts: Coord[], lang: Lang): Promise<RouteResult> {
  const dest = pts[pts.length - 1];
  const mid = pts.slice(0, -1);
  const ll = (c: Coord) => ({ location: { latLng: { latitude: c.latitude, longitude: c.longitude } } });

  const r = await http(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: googHeaders(
        'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration'
      ),
      body: JSON.stringify({
        origin: ll(origin),
        destination: ll(dest),
        intermediates: mid.map(ll),
        travelMode: 'DRIVE',
        languageCode: lang === 'ar' ? 'ar' : 'en-US',
        units: 'METRIC',
      }),
    },
    15000
  );

  if (!r.ok) throw new Error(errText(r));
  const route = r.json?.routes?.[0];
  if (!route) throw new Error('NO_ROUTE');

  const points = decodePolyline(route.polyline?.encodedPolyline);
  if (points.length < 2) throw new Error('EMPTY_POLYLINE');

  const legs: RouteLeg[] = (route.legs ?? []).map((l: any) => ({
    distanceMeters: l.distanceMeters ?? 0,
    durationSeconds: parseDuration(l.duration),
  }));

  return {
    points,
    distanceMeters: route.distanceMeters ?? legs.reduce((s, l) => s + l.distanceMeters, 0),
    durationSeconds: parseDuration(route.duration) || legs.reduce((s, l) => s + l.durationSeconds, 0),
    legs,
  };
}

/** Directions API (القديم) كاحتياط */
async function directionsLegacy(origin: Coord, pts: Coord[], lang: Lang): Promise<RouteResult> {
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1);

  const params = [
    `origin=${origin.latitude},${origin.longitude}`,
    `destination=${destination.latitude},${destination.longitude}`,
    waypoints.length
      ? `waypoints=${encodeURIComponent(waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|'))}`
      : '',
    'mode=driving',
    `language=${lang}`,
    `key=${GOOGLE_API_KEY}`,
  ]
    .filter(Boolean)
    .join('&');

  const r = await http(`https://maps.googleapis.com/maps/api/directions/json?${params}`, undefined, 15000);
  const data = r.json ?? {};
  if (data.status !== 'OK' || !data.routes?.length) {
    throw new Error(`${data.status ?? `HTTP ${r.status}`}${data.error_message ? `: ${String(data.error_message).slice(0, 160)}` : ''}`);
  }

  const route = data.routes[0];
  let points: Coord[] = [];
  const legs: RouteLeg[] = [];
  let dist = 0;
  let dur = 0;

  for (const leg of route.legs ?? []) {
    const d = leg.distance?.value ?? 0;
    const s = leg.duration?.value ?? 0;
    dist += d;
    dur += s;
    legs.push({ distanceMeters: d, durationSeconds: s });
    for (const step of leg.steps ?? []) {
      if (step.polyline?.points) points = points.concat(decodePolyline(step.polyline.points));
    }
  }
  if (points.length < 2) points = decodePolyline(route.overview_polyline?.points);
  if (points.length < 2) throw new Error('EMPTY_POLYLINE');

  return { points, distanceMeters: dist, durationSeconds: dur, legs };
}

/** origin → stops بالترتيب (آخر نقطة هي الوجهة والباقي نقاط وسيطة) */
export async function getRoute(origin: Coord, stops: Coord[], language: Lang = 'en'): Promise<RouteOutcome> {
  if (!HAS_API_KEY) return { route: null, error: 'MISSING_API_KEY' };
  const pts = stops.filter(isValidCoord).slice(0, 26);
  if (!isValidCoord(origin) || pts.length === 0) return { route: null, error: 'NO_POINTS' };

  const errors: string[] = [];

  try {
    return { route: await routesApi(origin, pts, language), error: null };
  } catch (e) {
    errors.push(`Routes API → ${(e as Error).message}`);
  }

  try {
    return { route: await directionsLegacy(origin, pts, language), error: null };
  } catch (e) {
    errors.push(`Directions API → ${(e as Error).message}`);
  }

  console.warn('Route failed:', errors.join(' | '));
  return { route: null, error: errors.join('\n') };
}

// ───────────── أماكن قريبة ─────────────
async function nearbyNew(center: Coord, category: PlaceCategory, radius: number, lang: Lang): Promise<Place[] | null> {
  const r = await http('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: googHeaders(
      'places.id,places.displayName,places.location,places.formattedAddress,places.shortFormattedAddress,places.rating,places.userRatingCount,places.currentOpeningHours.openNow'
    ),
    body: JSON.stringify({
      includedTypes: [category],
      maxResultCount: 15,
      rankPreference: 'POPULARITY',
      languageCode: lang,
      locationRestriction: {
        circle: { center: { latitude: center.latitude, longitude: center.longitude }, radius },
      },
    }),
  });

  if (!r.ok) {
    console.warn('Nearby (new) failed:', errText(r));
    return null;
  }

  return (r.json?.places ?? [])
    .map((p: any): Place | null => {
      const c = normalizeCoord(p.location?.latitude, p.location?.longitude);
      if (!c || !p.id) return null;
      return {
        id: p.id,
        name: p.displayName?.text ?? '',
        ...c,
        address: p.shortFormattedAddress ?? p.formattedAddress,
        category,
        rating: p.rating,
        userRatingsTotal: p.userRatingCount,
        openNow: p.currentOpeningHours?.openNow,
      };
    })
    .filter(Boolean) as Place[];
}

async function nearbyLegacy(center: Coord, category: PlaceCategory, radius: number, lang: Lang): Promise<Place[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
    `location=${center.latitude},${center.longitude}` +
    `&radius=${radius}&type=${category}&language=${lang}&key=${GOOGLE_API_KEY}`;
  const data = (await http(url)).json ?? {};

  if (data.status !== 'OK') {
    if (data.status !== 'ZERO_RESULTS') console.warn('Nearby (legacy) status:', data.status, data.error_message ?? '');
    return [];
  }

  return (data.results ?? [])
    .map((p: any): Place | null => {
      const c = normalizeCoord(p.geometry?.location?.lat, p.geometry?.location?.lng);
      if (!c || !p.place_id) return null;
      return {
        id: p.place_id,
        name: p.name ?? '',
        ...c,
        address: p.vicinity,
        category,
        rating: p.rating,
        userRatingsTotal: p.user_ratings_total,
        openNow: p.opening_hours?.open_now,
      };
    })
    .filter(Boolean)
    .slice(0, 15) as Place[];
}

export async function searchNearbyPlaces(
  center: Coord,
  category: PlaceCategory,
  radius = 5000,
  language: Lang = 'en'
): Promise<Place[]> {
  try {
    const res = await nearbyNew(center, category, radius, language);
    if (res) return res;
  } catch (e) {
    console.warn('Nearby (new) error:', (e as Error).message);
  }
  try {
    return await nearbyLegacy(center, category, radius, language);
  } catch (e) {
    console.warn('Nearby (legacy) error:', (e as Error).message);
    return [];
  }
}

// ───────────── تفاصيل المكان (تقييمات، صور، ساعات، تواصل) ─────────────
const PRICE: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

async function detailsNew(placeId: string, lang: Lang): Promise<Place | null> {
  const mask =
    'id,displayName,formattedAddress,location,rating,userRatingCount,currentOpeningHours,regularOpeningHours,' +
    'internationalPhoneNumber,nationalPhoneNumber,websiteUri,googleMapsUri,editorialSummary,reviews,photos,priceLevel';

  const r = await http(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`,
    { headers: { 'X-Goog-Api-Key': GOOGLE_API_KEY, 'X-Goog-FieldMask': mask } },
    12000
  );
  if (!r.ok || !r.json) {
    console.warn('Place details (new) failed:', errText(r));
    return null;
  }

  const p = r.json;
  const c = normalizeCoord(p.location?.latitude, p.location?.longitude);
  if (!c) return null;

  const photos: string[] = (p.photos ?? [])
    .slice(0, 8)
    .map((ph: any) => `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`);

  return {
    id: placeId,
    name: p.displayName?.text ?? '',
    ...c,
    address: p.formattedAddress,
    rating: p.rating,
    userRatingsTotal: p.userRatingCount,
    openNow: p.currentOpeningHours?.openNow,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
    website: p.websiteUri,
    mapsUrl: p.googleMapsUri,
    summary: p.editorialSummary?.text,
    priceLevel: p.priceLevel ? PRICE[p.priceLevel] : undefined,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? p.currentOpeningHours?.weekdayDescriptions,
    photos,
    photoUrl: photos[0],
    reviews: (p.reviews ?? []).slice(0, 5).map((rv: any) => ({
      author: rv.authorAttribution?.displayName ?? '',
      rating: rv.rating ?? 0,
      text: rv.text?.text ?? rv.originalText?.text ?? '',
      when: rv.relativePublishTimeDescription ?? '',
    })),
  };
}

async function detailsLegacy(placeId: string, lang: Lang): Promise<Place | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${encodeURIComponent(placeId)}&language=${lang}` +
    `&fields=name,formatted_address,geometry,rating,user_ratings_total,photos,formatted_phone_number,international_phone_number,website,opening_hours,reviews,url,price_level,editorial_summary` +
    `&key=${GOOGLE_API_KEY}`;
  const data = (await http(url)).json ?? {};
  if (data.status !== 'OK') {
    console.warn('Place details (legacy) status:', data.status, data.error_message ?? '');
    return null;
  }

  const r = data.result;
  const c = normalizeCoord(r.geometry?.location?.lat, r.geometry?.location?.lng);
  if (!c) return null;

  const photos: string[] = (r.photos ?? [])
    .slice(0, 8)
    .map(
      (ph: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ph.photo_reference}&key=${GOOGLE_API_KEY}`
    );

  return {
    id: placeId,
    name: r.name,
    ...c,
    address: r.formatted_address,
    rating: r.rating,
    userRatingsTotal: r.user_ratings_total,
    openNow: r.opening_hours?.open_now,
    phone: r.international_phone_number ?? r.formatted_phone_number,
    website: r.website,
    mapsUrl: r.url,
    summary: r.editorial_summary?.overview,
    priceLevel: r.price_level,
    hours: r.opening_hours?.weekday_text,
    photos,
    photoUrl: photos[0],
    reviews: (r.reviews ?? []).slice(0, 5).map((rv: any) => ({
      author: rv.author_name ?? '',
      rating: rv.rating ?? 0,
      text: rv.text ?? '',
      when: rv.relative_time_description ?? '',
    })),
  };
}

export async function getPlaceDetails(placeId: string, language: Lang = 'en'): Promise<Place | null> {
  try {
    const d = await detailsNew(placeId, language);
    if (d) return d;
  } catch (e) {
    console.warn('Place details (new) error:', (e as Error).message);
  }
  try {
    return await detailsLegacy(placeId, language);
  } catch (e) {
    console.warn('Place details (legacy) error:', (e as Error).message);
    return null;
  }
}

// ───────────── روابط تفتح تطبيق Google Maps ─────────────
export function getDirectionsUrl(destination: Coord, origin?: Coord | null, via: Coord[] = []): string {
  const parts = [
    'https://www.google.com/maps/dir/?api=1',
    `destination=${destination.latitude},${destination.longitude}`,
    'travelmode=driving',
  ];
  if (origin) parts.push(`origin=${origin.latitude},${origin.longitude}`);
  const wp = via.slice(0, 9);
  if (wp.length) {
    parts.push(`waypoints=${encodeURIComponent(wp.map((w) => `${w.latitude},${w.longitude}`).join('|'))}`);
  }
  return parts.join('&');
}

/** صفحة المكان نفسها داخل تطبيق Google Maps (تقييمات، صور، ساعات...) */
export function getPlaceUrl(place: { id?: string; name?: string; latitude: number; longitude: number; mapsUrl?: string }): string {
  if (place.mapsUrl) return place.mapsUrl;
  const q = encodeURIComponent(place.name || `${place.latitude},${place.longitude}`);
  return place.id
    ? `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(place.id)}`
    : `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
}
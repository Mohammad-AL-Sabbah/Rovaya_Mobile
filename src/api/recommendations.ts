import { api } from './client';
import { USE_MOCKS, resolveMediaUrl } from './config';
import { Endpoints } from './endpoints';
import { extractList } from './extract';
import type { PhotoKey } from '@/constants/photos';

export type Season = 'all' | 'spring' | 'summer' | 'autumn' | 'winter';

export interface Recommendation {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  season: Season;
  /** مثل Nature / Heritage ... (نص كما يأتي من الـ enum) */
  activityType: string | null;
  /** المناسبة بالعربية */
  occasion: string | null;
  /** المناسبة بالإنجليزية (يكتبها الموظف في لوحة التحكم) */
  occasionEn?: string | null;
  placeName: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  /** للبيانات التجريبية فقط */
  photoKey?: PhotoKey;
  sampleKey?: string;
}

/** العنوان/الوصف حسب لغة الواجهة، مع الرجوع للغة الأخرى إن كان الحقل فارغاً */
export function localizedTitle(r: Recommendation, language: 'ar' | 'en') {
  return (language === 'ar' ? r.titleAr || r.titleEn : r.titleEn || r.titleAr) || r.placeName || '';
}
export function localizedDescription(r: Recommendation, language: 'ar' | 'en') {
  return language === 'ar' ? r.descriptionAr || r.descriptionEn : r.descriptionEn || r.descriptionAr;
}
/** المناسبة حسب لغة الواجهة، مع الرجوع للغة الأخرى إن كان الحقل فارغاً */
export function localizedOccasion(r: Recommendation, language: 'ar' | 'en') {
  const ar = (r.occasion ?? '').trim();
  const en = (r.occasionEn ?? '').trim();
  return language === 'ar' ? ar || en : en || ar;
}

/** صورة محلية احتياطية عندما يكون الرابط فارغاً أو لا يُحمَّل (مثل example.com) */
const PHOTO_BY_ACTIVITY: Record<string, PhotoKey> = {
  nature: 'jericho',
  heritage: 'jerusalem',
  history: 'acre',
  seaside: 'jaffa',
  beach: 'jaffa',
  religious: 'bethlehem',
  faith: 'bethlehem',
  food: 'nablus',
  culture: 'hebron',
};
const PHOTO_ROTATION: PhotoKey[] = ['jerusalem', 'jaffa', 'acre', 'bethlehem', 'nablus', 'hebron', 'jericho'];

export function fallbackPhotoKey(r: Recommendation): PhotoKey {
  return r.photoKey ?? PHOTO_BY_ACTIVITY[(r.activityType ?? '').toLowerCase()] ?? PHOTO_ROTATION[Math.abs(r.id) % PHOTO_ROTATION.length];
}

/** الموسم الحالي (فلسطين): شتاء ديسمبر–فبراير، ربيع مارس–مايو، صيف يونيو–أغسطس، خريف سبتمبر–نوفمبر */
export function currentSeason(date = new Date()): Exclude<Season, 'all'> {
  const m = date.getMonth() + 1;
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

/** قيم enum RecommendationSeason في الـ Backend (تُرسل كنص في المسار) */
const SEASON_QUERY: Record<Exclude<Season, 'all'>, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

const SEASON_FROM_BACKEND: Record<string, Season> = {
  all: 'all', allyear: 'all', '0': 'all',
  spring: 'spring', summer: 'summer', autumn: 'autumn', fall: 'autumn', winter: 'winter',
};

const str = (v: unknown) => (v == null ? '' : String(v));

/** نص نظيف أو null (الباك إند يرسل أحيانًا مسافات أو Tab مثل "\tرحلة عائلية ") */
const textOrNull = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
};

/** يطابق RecommendationResponse الفعلي (titleAr/titleEn/descriptionAr/descriptionEn ...) مع تسامح مع الأسماء البديلة */
export function mapRecommendation(raw: any): Recommendation {
  const place = raw.suggestedPlace ?? null;
  const season = str(raw.season ?? 'all').toLowerCase();

  return {
    id: Number(raw.id),
    titleAr: str(raw.titleAr ?? raw.title ?? ''),
    titleEn: str(raw.titleEn ?? raw.title ?? ''),
    descriptionAr: str(raw.descriptionAr ?? raw.description ?? ''),
    descriptionEn: str(raw.descriptionEn ?? raw.description ?? ''),
    season: SEASON_FROM_BACKEND[season] ?? 'all',
    activityType: raw.activityType != null ? str(raw.activityType) : null,
    occasion: textOrNull(raw.occasion ?? raw.occasionAr),
    occasionEn: textOrNull(raw.occasionEn ?? raw.occasion_en),
    placeName: raw.suggestedPlaceName ?? place?.name ?? null,
    imageUrl: resolveMediaUrl(raw.imageUrl ?? place?.imageUrl ?? null),
    displayOrder: Number(raw.displayOrder ?? 0),
    isActive: raw.isActive !== false,
  };
}

/**
 * ما يُعرض في الصفحة الرئيسية (أول 6):
 *  1) النشطة فقط
 *  2) الأولوية لتوصيات الموسم الحالي وتوصيات "كل المواسم"
 *  3) إن كانت أقل من 6 نكمّل من باقي التوصيات النشطة (حتى لا يبقى القسم فارغاً خارج موسمها)
 *  4) داخل كل مجموعة الترتيب حسب DisplayOrder الذي يحدده المشرف، والباقي في "عرض الكل"
 */
export const HOME_RECOMMENDATIONS_LIMIT = 6;

export function pickForHome(list: Recommendation[], season = currentSeason()): Recommendation[] {
  const byOrder = (a: Recommendation, b: Recommendation) => a.displayOrder - b.displayOrder || b.id - a.id;
  const active = list.filter((r) => r.isActive);
  const inSeason = active.filter((r) => r.season === 'all' || r.season === season).sort(byOrder);
  const others = active.filter((r) => !(r.season === 'all' || r.season === season)).sort(byOrder);
  return [...inSeason, ...others].slice(0, HOME_RECOMMENDATIONS_LIMIT);
}

async function fetchList(path: string): Promise<Recommendation[]> {
  const res = await api.get<any>(path);
  return extractList<any>(res, ['recommendations']).map(mapRecommendation);
}

/** الرئيسية: نجلب كل التوصيات ثم نختار أول 6 (انظر pickForHome) */
export async function fetchHomeRecommendations(): Promise<Recommendation[]> {
  if (USE_MOCKS) return pickForHome(RECOMMENDATIONS_MOCK);

  return pickForHome(await fetchAllRecommendations());
}

/** صفحة "عرض الكل" لاحقاً */
export const fetchAllRecommendations = () => fetchList(Endpoints.recommendations.all);
export const fetchRecommendationsByActivity = (activity: string) =>
  fetchList(Endpoints.recommendations.byActivity(activity));

/* ───────── بيانات تجريبية (نصوصها في ملفات الترجمة تحت home.recommendations.sample) ───────── */
const mock = (
  id: number,
  sampleKey: string,
  season: Season,
  photoKey: PhotoKey,
  displayOrder: number,
  activityType: string
): Recommendation => ({
  id, sampleKey, season, photoKey, displayOrder, activityType,
  titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '',
  occasion: null, occasionEn: null, placeName: null, imageUrl: null, isActive: true,
});

const RECOMMENDATIONS_MOCK: Recommendation[] = [
  mock(1, 'r1', 'all', 'jerusalem', 1, 'heritage'),
  mock(2, 'r2', 'summer', 'jaffa', 2, 'seaside'),
  mock(3, 'r3', 'all', 'acre', 3, 'history'),
  mock(4, 'r4', 'autumn', 'hebron', 4, 'culture'),
  mock(5, 'r5', 'all', 'nablus', 5, 'food'),
  mock(6, 'r6', 'winter', 'bethlehem', 6, 'faith'),
  mock(7, 'r7', 'spring', 'jericho', 7, 'nature'),
];


export const fetchRecommendationsBySeason = (season: string) =>
  fetchList(Endpoints.recommendations.bySeason(season));

/** إعادة تسمية الدالة لتتوافق مع اسم الاستيراد في الشاشة */
export const fetchRecommendations = fetchAllRecommendations;




/** جلب توصية محددة بالتفاصيل */
export async function fetchRecommendationById(id: number): Promise<Recommendation | null> {
  try {
    console.log(`[API] Fetching recommendation ID: ${id}`);

    // الـ Backend يرجع البيانات مباشرة في الـ Root Object
    const res = await api.get<any>(Endpoints.recommendations.byId(id));

    console.log('[API] Response:', res);

    // التحقق من success مباشرة، لأن البيانات ليست داخل res.data
    if (res.success) {
      return mapRecommendation(res); // مرر الـ res كاملاً لأنه يحتوي على البيانات
    }

    console.warn('[API] No data returned or success is false');
    return null;
  } catch (error) {
    console.error('[API] Error fetching recommendation:', error);
    return null;
  }
}
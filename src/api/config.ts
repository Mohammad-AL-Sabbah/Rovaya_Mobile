const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  console.warn('[api] EXPO_PUBLIC_API_URL غير موجود. أضفه في ملف .env ثم أعد تشغيل: npx expo start -c');
}

/** عنوان الـ API الأساسي بدون "/" في النهاية */
export const API_URL = (raw ?? '').replace(/\/+$/, '');

/** أصل الخادم (بدون /api) لبناء روابط الصور المرفوعة مثل /uploads/tourism/xx.jpg */
export const API_ORIGIN = API_URL.replace(/\/api$/i, '');

/** عندما تكون true تُعرض بيانات تجريبية بدل الاتصال بالـ API (للأقسام التي لم تُربط بعد) */
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

/** أقصى مدة انتظار للطلب بالمللي ثانية */
export const REQUEST_TIMEOUT_MS = 20_000;

/** يحوّل "/uploads/x.jpg" إلى رابط كامل، ويترك الروابط الكاملة كما هي */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
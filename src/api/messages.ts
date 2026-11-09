import type { TFunction } from 'i18next';

import { ApiError } from './errors';

type Language = 'ar' | 'en';
type Tone = 'error' | 'info';

interface Matcher {
  test: RegExp;
  key: string;
  tone?: Tone;
  params?: (m: RegExpMatchArray) => Record<string, string>;
}

/**
 * رسائل الـ Backend تأتي بالعربية فقط، فنحوّلها إلى مفاتيح ترجمة.
 * (الأفضل لاحقاً أن يرسل الـ Backend حقل ErrorCode ثابتاً، انظر الملاحظات.)
 */
const MATCHERS: Matcher[] = [
  { test: /^البريد الإلكتروني أو كلمة المرور غير صحيحة/, key: 'invalidCredentials' },
  { test: /^حسابك غير مفعل بعد\. تم إعادة إرسال رابط التفعيل/, key: 'emailNotConfirmedResent', tone: 'info' },
  {
    test: /^حسابك غير مفعل بعد\. يرجى الانتظار (\d+) ثانية/,
    key: 'emailNotConfirmedWait',
    tone: 'info',
    params: (m) => ({ seconds: m[1] }),
  },
  {
    test: /^حسابك محظور بشكل دائم\. السبب: ([\s\S]*)\. يرجى التواصل مع الإدارة\.?$/,
    key: 'blockedPermanent',
    params: (m) => ({ reason: m[1] }),
  },
  {
    test: /^حسابك محظور مؤقتاً\. السبب: ([\s\S]*)\. المدة المتبقية: ([\s\S]*)\.?$/,
    key: 'blockedTemporary',
    params: (m) => ({ reason: m[1], remainingRaw: m[2].replace(/\.$/, '') }),
  },
  { test: /^الحساب معطل مؤقتاً بسبب محاولات دخول خاطئة/, key: 'lockedOut' },
  { test: /^البريد الإلكتروني مسجل مسبقاً/, key: 'emailTaken' },
  { test: /^فشل في إنشاء الحساب/, key: 'registerFailed' }, // يُحسَّن أدناه حسب تفاصيل Identity
  { test: /^البريد الإلكتروني غير مسجل/, key: 'emailNotRegistered' },
  { test: /^كود إعادة التعيين غير صحيح/, key: 'codeInvalid' },
  { test: /^انتهت صلاحية كود إعادة التعيين/, key: 'codeExpired' },
  { test: /^فشل في تغيير كلمة المرور/, key: 'resetFailed' },
  { test: /^حدث خطأ غير متوقع/, key: 'unexpected' },
];

function pluralForm(language: Language, n: number): 'one' | 'two' | 'few' | 'other' {
  if (language === 'ar') {
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n >= 3 && n <= 10) return 'few';
    return 'other';
  }
  return n === 1 ? 'one' : 'other';
}

function unit(t: TFunction, language: Language, name: 'minute' | 'hour' | 'day', n: number) {
  return t(`duration.${name}.${pluralForm(language, n)}`, { n }) as string;
}

/** "5 دقيقة" / "3 ساعة" / "2 يوم و 4 ساعة" ← نص بلغة الواجهة */
function formatRemaining(raw: string, t: TFunction, language: Language): string {
  const text = raw.trim();
  if (/^أقل من دقيقة$/.test(text)) return t('duration.lessThanMinute') as string;

  let m = text.match(/^(\d+) دقيقة$/);
  if (m) return unit(t, language, 'minute', Number(m[1]));

  m = text.match(/^(\d+) ساعة$/);
  if (m) return unit(t, language, 'hour', Number(m[1]));

  m = text.match(/^(\d+) يوم و (\d+) ساعة$/);
  if (m) {
    return t('duration.daysAndHours', {
      days: unit(t, language, 'day', Number(m[1])),
      hours: unit(t, language, 'hour', Number(m[2])),
    }) as string;
  }
  return text;
}

export interface DescribedError {
  text: string;
  tone: Tone;
}

/** يحوّل أي خطأ إلى نص مترجم جاهز للعرض + نوعه (خطأ أو معلومة) */
export function describeError(error: unknown, t: TFunction, language: Language): DescribedError {
  if (!(error instanceof ApiError)) return { text: t('errors.generic') as string, tone: 'error' };

  if (error.kind === 'network') return { text: t('errors.network') as string, tone: 'error' };
  if (error.kind === 'timeout') return { text: t('errors.timeout') as string, tone: 'error' };

  const raw = error.serverMessage?.trim();
  if (raw) {
    for (const matcher of MATCHERS) {
      const m = raw.match(matcher.test);
      if (!m) continue;

      let key = matcher.key;
      const params = matcher.params?.(m) ?? {};
      const detailsText = JSON.stringify(error.details ?? '') + raw;

      // تحسين رسائل Identity (تأتي بالإنجليزية داخل الرسالة أو errors)
      if (key === 'registerFailed' || key === 'resetFailed') {
        if (/password/i.test(detailsText)) key = 'passwordWeak';
        else if (/already taken|duplicate/i.test(detailsText)) key = 'emailTaken';
      }

      if (params.remainingRaw !== undefined) {
        params.remaining = formatRemaining(params.remainingRaw, t, language);
      }

      const text = key === 'unexpected' ? (t('errors.unexpected') as string) : (t(`serverMessages.${key}`, params) as string);
      return { text, tone: matcher.tone ?? 'error' };
    }
  }

  if (error.status && error.status >= 500) return { text: t('errors.server') as string, tone: 'error' };
  if (error.status === 404) return { text: t('errors.notFound') as string, tone: 'error' };
  if (error.status === 400 && !raw) return { text: t('errors.validation') as string, tone: 'error' };

  // رسالة غير معروفة: نعرضها كما هي فقط إذا كانت الواجهة عربية (لغة الـ Backend)
  if (raw && language === 'ar') return { text: raw, tone: 'error' };
  return { text: t('errors.generic') as string, tone: 'error' };
}
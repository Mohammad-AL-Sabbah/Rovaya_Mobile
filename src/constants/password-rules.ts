/**
 * يطابق إعدادات Identity في الـ Backend:
 * RequireDigit / RequireLowercase / RequireUppercase / RequiredLength = 7
 * و RequireNonAlphanumeric (قيمته الافتراضية true في ASP.NET Identity لأنكم لم تعطّلوه).
 * إذا عطّلتم الرمز الخاص في الـ Backend غيّر requireSymbol إلى false هنا فقط.
 */
export const PASSWORD_POLICY = {
  minLength: 7,
  requireDigit: true,
  requireLower: true,
  requireUpper: true,
  requireSymbol: true,
} as const;

export type PasswordRule = 'length' | 'digit' | 'lower' | 'upper' | 'symbol';

export const ACTIVE_RULES: PasswordRule[] = [
  'length',
  ...(PASSWORD_POLICY.requireDigit ? (['digit'] as const) : []),
  ...(PASSWORD_POLICY.requireLower ? (['lower'] as const) : []),
  ...(PASSWORD_POLICY.requireUpper ? (['upper'] as const) : []),
  ...(PASSWORD_POLICY.requireSymbol ? (['symbol'] as const) : []),
];

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(password: string): {
  checks: Record<PasswordRule, boolean>;
  valid: boolean;
  level: StrengthLevel;
} {
  const checks: Record<PasswordRule, boolean> = {
    length: password.length >= PASSWORD_POLICY.minLength,
    digit: /[0-9\u0660-\u0669]/.test(password),
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    symbol: /[^A-Za-z0-9\u0600-\u06FF]/.test(password),
  };

  const passed = ACTIVE_RULES.filter((r) => checks[r]).length;
  const valid = passed === ACTIVE_RULES.length;

  let level: StrengthLevel = 0;
  if (password.length > 0) {
    if (!valid) level = passed / ACTIVE_RULES.length < 0.6 ? 1 : 2;
    else level = password.length >= 11 ? 4 : 3;
  }
  return { checks, valid, level };
}

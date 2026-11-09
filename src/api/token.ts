function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return (globalThis as any).atob(padded);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(base64UrlDecode(part));
  } catch {
    return null;
  }
}

/** هل انتهت صلاحية التوكن؟ إن لم نستطع قراءته نترك القرار للـ Backend (401) */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') return false;
  return exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

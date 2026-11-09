/**
 * يستخرج القائمة من أي شكل رد: مصفوفة مباشرة، أو كائن يحوي مصفوفة
 * مثل { articles: [...] } أو { data: [...] } أو { recommendations: [...] }
 */
export function extractList<T = any>(res: unknown, preferredKeys: string[] = []): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    for (const key of [...preferredKeys, 'data', 'items', 'result', 'results']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    const first = Object.values(obj).find(Array.isArray);
    if (first) return first as T[];
  }
  return [];
}
const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function fromCode(code: number, fallback: string) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

/** &#8221; &#x2013; &amp; ... ← نص عادي */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => fromCode(parseInt(h, 16), m))
    .replace(/&#(\d+);/g, (m, d) => fromCode(parseInt(d, 10), m))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

/** ملخص الخبر: يزيل رموز HTML وعلامة "[]" أو "[…]" التي يضيفها ووردبريس في النهاية */
export function cleanSummary(input: string | null | undefined): string {
  if (!input) return '';
  return decodeEntities(input)
    .replace(/\s*\[\s*(?:…|\.\.\.)?\s*\]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTitle(input: string | null | undefined): string {
  return decodeEntities(input ?? '').replace(/\s+/g, ' ').trim();
}

/** محتوى HTML (Elementor / ووردبريس) ← فقرات نصية نظيفة */
export function htmlToParagraphs(html: string | null | undefined): string[] {
  if (!html) return [];
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|figure|section|tr|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeEntities(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s\u00a0]+/g, ' ').trim())
    .filter(Boolean);
}

export function parseIsoDate(iso: string | null | undefined) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

/** "2023-06-26T14:51:12" ← "26 حزيران 2023" (اسم الشهر يأتي من الترجمة) */
export function formatArticleDate(iso: string | null | undefined, monthName: (index: number) => string): string {
  const p = parseIsoDate(iso);
  return p ? `${p.d} ${monthName(p.m - 1)} ${p.y}` : '';
}
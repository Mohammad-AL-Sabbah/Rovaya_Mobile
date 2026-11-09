import { api } from './client';
import { USE_MOCKS } from './config';
import { Endpoints } from './endpoints';
import { extractList } from './extract';
import { cleanSummary, cleanTitle } from '@/utils/text';

/** الشكل القادم من الـ Backend (مصدره موقع وزارة السياحة والآثار) */
export interface RawArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  imageUrl: string | null;
  publishedDate: string;
  modifiedDate?: string;
  slug?: string;
  sourceLink?: string | null;
  categories: number[];
}

export interface NewsResponse {
  articles: RawArticle[];
  totalCount: number;
  success: boolean;
  message: string | null;
  errors: unknown;
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedDate: string;
  sourceLink: string | null;
  contentHtml: string;
}

/** تصنيف "الأخبار" في موقع الوزارة. التصنيفات الأخرى (مثل 5 للمواقع التراثية و6 لصفحات تجريبية) لا تُعرض كأخبار */
export const NEWS_CATEGORY_ID = 3;

/** العدد الافتراضي المطلوب من الـ Backend (الرئيسية تعرض منها أول 6، وصفحة كل الأخبار تطلب أكثر) */
const NEWS_COUNT = 10;

function normalize(raw: RawArticle): NewsArticle {
  return {
    id: raw.id,
    title: cleanTitle(raw.title),
    summary: cleanSummary(raw.summary),
    imageUrl: raw.imageUrl || null,
    publishedDate: raw.publishedDate,
    sourceLink: raw.sourceLink || null,
    contentHtml: raw.content ?? '',
  };
}

/** يختار الأخبار الصالحة للعرض: تصنيف الأخبار فقط، بعنوان وملخص حقيقيين، الأحدث أولاً */
export function selectNews(raw: RawArticle[]): NewsArticle[] {
  return raw
    .filter((a) => a.categories?.includes(NEWS_CATEGORY_ID))
    .map(normalize)
    .filter((a) => a.title.length >= 5 && a.summary.length >= 20)
    .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
}

const cache = new Map<number, NewsArticle>();
export const getCachedArticle = (id: number) => cache.get(id);

export async function fetchNews(count: number = NEWS_COUNT): Promise<NewsArticle[]> {
  const raw = USE_MOCKS
    ? NEWS_MOCK
    : extractList<RawArticle>(await api.get<NewsResponse>(`${Endpoints.news.latest}?count=${count}`), ['articles']);
  const list = selectNews(raw);
  list.forEach((a) => cache.set(a.id, a));
  return list;
}

/* ───────── بيانات تجريبية: مقتطفات من ردّ الـ Backend الحقيقي ───────── */
const NEWS_MOCK: RawArticle[] = [
  {
    id: 4992,
    title: 'اعلان',
    summary:
      'تعلن وزارة السياحة والآثار عن رغبتها لعقد امتحان المدراء الفنيين لمكاتب السياحة و / او السفر والذي سيعقد بعد منتصف شهر آب القادم لهذا العام 2023. شروط ومتطلبات التقدم للامتحان: 1. يحمل الجنسية الفلسطينية . 2. حاصل على شهادة الثانوية العامة مصدقة حسب الأصول . 3. حاصل على شهادة دبلوم إدارة مكاتب سياحة وسفر []',
    content:
      '<div> تعلن وزارة السياحة والآثار عن رغبتها لعقد امتحان المدراء الفنيين لمكاتب السياحة و / او السفر والذي سيعقد بعد منتصف شهر آب القادم لهذا العام 2023.</div>\n<div></div>\n<div>شروط ومتطلبات التقدم للامتحان:</div>\n<div>1. يحمل الجنسية الفلسطينية .</div>\n<div>2. حاصل على شهادة الثانوية العامة مصدقة حسب الأصول .</div>',
    imageUrl: 'https://tourism.ps/wp-content/uploads/2023/06/adv.jpeg',
    publishedDate: '2023-06-26T14:51:12',
    sourceLink: 'https://tourism.ps/',
    categories: [3],
  },
  {
    id: 4947,
    title: 'وكيل السياحة والآثار يتفقد المنشئات السياحية والاثرية في اريحا',
    summary:
      'تفقد وكيل وزارة السياحة والآثار السيد صالح طوافشة المنشئات والمرافق السياحية والاثرية في ظل حصار الاحتلال الاسرائيلي الذي تتعرض له مدينة أريحا على مدار الفتره الماضية . استهل وكيل الوزارة جولته التفقدية بلقاء محافظ محافظة أريحا والاغوار السيد جهاد ابو العسل في مقر المحافظة حيث تحدث المحافظ عن اثارالحصار على كافة القطاعات بما فيها قطاع []',
    content:
      '<p><img loading="lazy" class="alignleft" src="https://tourism.ps/wp-content/uploads/2023/05/05052023_1-2-300x200.jpeg" alt="" width="476" height="317" /></p>\n<h5 style="text-align: justify;">تفقد وكيل وزارة السياحة والآثار  السيد صالح طوافشة المنشئات والمرافق السياحية والاثرية في ظل حصار الاحتلال الاسرائيلي الذي تتعرض له مدينة أريحا على مدار الفتره الماضية .</h5>\n<h5 style="text-align: justify;">استهل وكيل الوزارة جولته التفقدية بلقاء محافظ محافظة أريحا والاغوار السيد جهاد ابو العسل في مقر المحافظة.</h5>',
    imageUrl: 'https://tourism.ps/wp-content/uploads/2023/05/05052023_1-1.jpeg',
    publishedDate: '2023-05-10T20:47:39',
    sourceLink: 'https://tourism.ps/',
    categories: [3],
  },
  {
    id: 4798,
    title: 'فلسطين تشارك في معرض برلين السياحي الدولي',
    summary:
      'شاركت دولة فلسطين ممثلة بوزارة السياحة والآثار، في معرض بورصة السياحة العالمية ITB Berlin‏ والذي يقام سنويا في العاصمة الألمانية برلين. و تشارك فلسطين في فعاليات هذا المعرض السياحي منذ عام 1996 ويعتبر من أهم المعارض السياحية في العالم ويشارك فيه صناع القرار السياحي وممثلو القطاع السياحي من مختلف دول العالم، ما يعد فرصة حقيقية []',
    content:
      '\t\t<div data-elementor-type="wp-post" data-elementor-id="4798" class="elementor elementor-4798" data-elementor-settings="[]">\n\t\t\t<div class="elementor-widget-container">\n\t\t\t<h5 style="text-align: justify;">شاركت دولة فلسطين ممثلة بوزارة السياحة والآثار، في معرض بورصة السياحة العالمية ITB Berlin‏ والذي يقام سنويا في العاصمة الألمانية برلين.</h5><h5 style="text-align: justify;">و تشارك فلسطين في فعاليات هذا المعرض السياحي منذ عام 1996 ويعتبر من أهم المعارض السياحية في العالم.</h5>\t\t\t</div>\n\t\t</div>',
    imageUrl: 'https://tourism.ps/wp-content/uploads/2023/03/12032023_1.jpeg',
    publishedDate: '2023-03-12T15:15:29',
    sourceLink: 'https://tourism.ps/',
    categories: [3],
  },
  {
    id: 477,
    title: 'السياحة والاثار تطلق العمل بمشروع ترميم موقع عين سلمان الاثري',
    summary:
      'أعلن وكيل وزاره السياحة والاثار السيد صالح طوافشة بان وزارة السياحة والاثار بصدد إطلاق مجموعة من المشاريع التطويرية في عدد من المواقع الأثرية. جاء حيث طوافشة خلال إطلاق العمل في مشروع ترميم موقع عين سلمان الاثري، والذي يعود للعصور الوسطى وهو عبارة عن قلعة ضخمة تتكون من مجموعة من الفراغات والغرف ذات العقود النصف برميلية []',
    content:
      'أعلن وكيل وزاره السياحة والاثار السيد صالح طوافشة بان وزارة السياحة والاثار بصدد إطلاق مجموعة من المشاريع التطويرية في عدد من المواقع الأثرية.\r\n\r\nجاء حيث طوافشة خلال إطلاق العمل في مشروع ترميم موقع عين سلمان الاثري، والذي يعود للعصور الوسطى &#8211; محافظة القدس.\r\n',
    imageUrl: 'https://tourism.ps/wp-content/uploads/2021/08/29092022_3.jpeg',
    publishedDate: '2022-09-29T16:22:20',
    sourceLink: 'https://tourism.ps/',
    categories: [3],
  },
  {
    id: 4375,
    title: 'فلسطين تختتم فعاليات اليوم العالمي للمتاحف',
    summary:
      'تحت شعار قوة المتاحف، احتفلت وزارة السياحة والاثار باليوم العالمي للمتاحف، حيث تم اختيار هذا الشعار لزيادة الوعي بأهمية المتاحف في تنمية المجتمع والتأكيد على ان المتاحف ليست فقط مكانا لحفظ الكنوز التاريخية والاثرية والثقافية بالإضافة لتعزيز دور المتاحف كمركز علمي وثقافي لنشر العلوم والتعريف بالتراث الانساني دولة فلسطين والى جانب 150 دولة من حول []',
    content:
      '<p style="text-align: justify;"><strong>تحت شعار قوة المتاحف، احتفلت وزارة السياحة والاثار باليوم العالمي للمتاحف، حيث تم اختيار هذا الشعار لزيادة الوعي بأهمية المتاحف في تنمية المجتمع.</strong></p>\n<p style="text-align: justify;"><strong>اما في متحف العيزرية والواقع في بلدية العيزرية فقد عقد محاضرة حول المسكوكات البيزنطية ومعرض تراثي مؤقت بعنوان &#8220;ايام زمان&#8221;.</strong></p>',
    imageUrl: 'https://tourism.ps/wp-content/uploads/2022/05/22052022-1.jpeg',
    publishedDate: '2022-05-22T10:58:24',
    sourceLink: 'https://tourism.ps/',
    categories: [3],
  },
];
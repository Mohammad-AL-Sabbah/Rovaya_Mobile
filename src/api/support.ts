import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

async function getStoredToken(): Promise<string | null> {
  const candidateKeys = ['rovaya.accessToken', 'accessToken', 'token', 'userToken', 'rovaya.token'];
  for (const key of candidateKeys) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value && typeof value === 'string' && value.length > 10) return value;
    } catch {
      /* تجاهل */
    }
  }
  return null;
}

/**
 * ✅ بناء الـ base URL بشكل متسق مع بقية المشروع (نفس نمط home.tsx)
 * API_URL قد ينتهي بـ /api أو لا، فنستخرج الـ origin ثم نضيف /api
 */
function getApiBase(): string {
  const origin = API_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return `${origin}/api`;
}

export interface SupportTicket {
  id: number;
  userName: string;
  userPhone: string;
  title: string;
  description: string;
  imageUrls: string[];
  status: number; // 0: Sent, 1: Received, 2: InProgress, 3: Resolved, 4: Rejected
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * ✅ قراءة آمنة: نتحقق من status ونقرأ text قبل parse
 * يمنع خطأ "Unexpected end of input"
 */
async function safeJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error(`HTTP ${response.status}: استجابة فارغة من الخادم`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${response.status}: استجابة غير صالحة (ليست JSON)`);
  }
}

export async function createSupportTicket(
  title: string,
  description: string,
  phoneNumber: string,
  images: any[]
): Promise<SupportTicket> {
  const token = await getStoredToken();
  if (!token) throw new Error('غير مسجل الدخول');

  const formData = new FormData();
  formData.append('Title', title);
  formData.append('Description', description);
  formData.append('PhoneNumber', phoneNumber);

  images.forEach((img: any, index: number) => {
    const fileName = img.uri.split('/').pop() || `image_${index}.jpg`;
    formData.append('Images', {
      uri: img.uri,
      name: fileName,
      type: img.mimeType || 'image/jpeg',
    } as any);
  });

  const response = await fetch(`${getApiBase()}/auth/account/support/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // لا نضع Content-Type يدوياً حتى يضيف المتصفح boundary الخاص بـ FormData
    },
    body: formData as any,
  });

  if (!response.ok) {
    const err = await safeJson(response).catch(() => ({}));
    throw new Error(err?.message || `فشل في إرسال التذكرة (${response.status})`);
  }

  const result = await safeJson(response);
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message || 'فشل في إنشاء التذكرة');
}

export async function getMySupportTickets(): Promise<SupportTicket[]> {
  const token = await getStoredToken();
  if (!token) throw new Error('غير مسجل الدخول');

  const response = await fetch(`${getApiBase()}/auth/account/support/my-tickets`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // ✅ لا نرمي خطأ عند 404/401، بل نرجع قائمة فارغة لتجنب كسر الواجهة
    if (response.status === 401) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
    const err = await safeJson(response).catch(() => ({}));
    throw new Error(err?.message || `تعذر جلب التذاكر (${response.status})`);
  }

  const result = await safeJson(response);
  if (result.success) {
    return Array.isArray(result.data) ? result.data : [];
  }
  throw new Error(result.message || 'فشل في جلب التذاكر');
}
import { API_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  /** يقبل كائن JSON عادي أو FormData */
  body?: unknown;
  /** يُرسل Authorization: Bearer <token> (الافتراضي true). اجعله false لطلبات مثل login. */
  auth?: boolean;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

type ClientOptions = Omit<RequestOptions, 'method' | 'body'>;

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** يضبطه AuthProvider عند تسجيل الدخول/الخروج */
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/** ✅ يعيد التوكن الحالي (يُستخدم في رفع الملفات عبر expo-file-system) */
export const getAccessToken = () => accessToken;

/** يُستدعى عند وصول 401 من طلب محمي (انتهت الجلسة) */
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {}, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        // مع FormData لا نضع Content-Type أبداً، لأن fetch يضيفه مع الـ boundary
        ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    // الـ Backend يرد بـ { success, message, errors }، ونعتبر success:false فشلاً حتى لو كان الرد 200
    if (!response.ok || data?.success === false) {
      if (response.status === 401 && auth) unauthorizedHandler?.();
      throw new ApiError({
        kind: response.status === 401 ? 'unauthorized' : 'http',
        status: response.status,
        serverMessage: typeof data?.message === 'string' ? data.message : undefined,
        details: data?.errors ?? undefined,
      });
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({ kind: timedOut ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, options?: ClientOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ClientOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: ClientOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: ClientOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: ClientOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
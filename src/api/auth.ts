import { api } from './client';
import { Endpoints } from './endpoints';
import { ApiError } from './errors';
import type {
  AuthUser,
  BasicResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  SendCodeRequest,
} from './types';

export async function login(payload: LoginRequest): Promise<{ token: string; user: AuthUser }> {
  const res = await api.post<LoginResponse>(Endpoints.auth.login, payload, { auth: false });

  if (!res?.accessToken) {
    throw new ApiError({ kind: 'http', status: 200, serverMessage: res?.message ?? undefined });
  }

  return {
    token: res.accessToken,
    user: {
      userId: res.userId,
      email: res.email,
      firstName: res.firstName,
      roles: res.roles ?? [],
    },
  };
}

/** إنشاء حساب: ينجح فقط إذا رجع success:true (العميل يحوّل success:false إلى ApiError) */
export function register(payload: RegisterRequest) {
  return api.post<RegisterResponse>(Endpoints.auth.register, payload, { auth: false });
}

/**
 * يطلب رمز إعادة تعيين كلمة المرور (4 أرقام، صالح 5 دقائق).
 * الـ Backend يرد بنجاح سواء كان البريد مسجلاً أم لا (حماية من تخمين الإيميلات).
 */
export function sendResetCode(email: string) {
  const body: SendCodeRequest = { email };
  return api.post<BasicResponse>(Endpoints.auth.sendCode, body, { auth: false });
}

export function resetPassword(payload: ResetPasswordRequest) {
  return api.patch<BasicResponse>(Endpoints.auth.resetPassword, payload, { auth: false });
}


export async function deleteAccount(password: string) {
  try {
    const res = await api.delete<any>('/auth/account/delete-account', { password });
    return res;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
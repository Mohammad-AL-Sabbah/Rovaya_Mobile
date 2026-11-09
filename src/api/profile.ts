import * as FileSystem from 'expo-file-system/legacy'; // إذا كان Expo SDK 53 أو أقدم: غيّرها إلى 'expo-file-system'
import { api, getAccessToken } from './client';
import { API_URL } from './config';
import { Endpoints } from './endpoints';
import { ApiError } from './errors';

export interface ProfileData {
  success: boolean;
  message: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  phoneNumber?: string;
  additionalPhoneNumbers?: string[];
  emergencyNumbers?: string[];
  profileImageUrl?: string;
  createdAt?: string;
  medicalProfile?: {
    id?: number;
    chronicDiseases?: string;
    currentMedications?: string;
    allergies?: string;
    lastUpdated?: string;
  };
}

export interface UploadImageResponse {
  success: boolean;
  message: string;
  imageUrl?: string;
  errors?: any;
}

export interface MedicalProfileData {
  id?: number;
  chronicDiseases?: string;
  currentMedications?: string;
  allergies?: string;
  lastUpdated?: string;
}

/** جلب بيانات البروفايل الكاملة */
export async function fetchProfile(): Promise<ProfileData | null> {
  try {
    const res = await api.get<ProfileData>(Endpoints.profile.get);
    return res.success ? res : null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/** تحديث البيانات الأساسية */
export async function updateBasicProfile(data: {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phoneNumber?: string;
  profileImageUrl?: string;
}) {
  try {
    const res = await api.put(Endpoints.profile.update, data);
    return res;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * رفع صورة البروفايل.
 * يستقبل uri الصورة (نص) أو asset الذي فيه uri من الـ image picker
 * ويرفعها عبر expo-file-system (رفع native أكثر ثباتاً على أندرويد من FormData).
 */
export async function uploadProfileImage(
  source: string | { uri: string }
): Promise<UploadImageResponse> {
  try {
    // يقبل نصاً (uri) أو كائناً فيه uri (مثل asset من الـ image picker)
    const uri = typeof source === 'string' ? source : source?.uri;
    if (!uri || typeof uri !== 'string') {
      throw new Error('Invalid image uri');
    }

    const token = getAccessToken();

    const result = await FileSystem.uploadAsync(
      `${API_URL}${Endpoints.profile.uploadImage}`,
      uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file', // نفس اسم الـ parameter في الباك إند
        mimeType: 'image/jpeg',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    let data: UploadImageResponse | null = null;
    try {
      data = JSON.parse(result.body);
    } catch {
      data = null;
    }

    if (result.status < 200 || result.status >= 300 || !data || data.success === false) {
      throw new ApiError({
        kind: result.status === 401 ? 'unauthorized' : 'http',
        status: result.status,
        serverMessage: data?.message,
        details: data?.errors ?? undefined,
      });
    }

    return data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/** جلب الملف الطبي */
export async function fetchMedicalProfile(): Promise<MedicalProfileData | null> {
  try {
    const res = await api.get<MedicalProfileData>(Endpoints.profile.medical);
    return res;
  } catch (error) {
    console.error('Error fetching medical profile:', error);
    return null;
  }
}

/** حفظ/تحديث الملف الطبي */
export async function saveMedicalProfile(data: {
  chronicDiseases?: string;
  currentMedications?: string;
  allergies?: string;
}) {
  try {
    const res = await api.post(Endpoints.profile.medical, data);
    return res;
  } catch (error) {
    console.error('Error saving medical profile:', error);
    throw error;
  }
}

/** حذف الملف الطبي */
export async function deleteMedicalProfile() {
  try {
    const res = await api.delete(Endpoints.profile.medical);
    return res;
  } catch (error) {
    console.error('Error deleting medical profile:', error);
    throw error;
  }
}

/** جلب أرقام الطوارئ */
export async function fetchEmergencyNumbers(): Promise<string[]> {
  try {
    const res = await api.get<{ numbers?: string[] }>(Endpoints.profile.emergencyNumbers);
    return res.numbers || [];
  } catch (error) {
    console.error('Error fetching emergency numbers:', error);
    return [];
  }
}

/** إضافة رقم طوارئ */
export async function addEmergencyNumber(phoneNumber: string) {
  try {
    const res = await api.post(Endpoints.profile.emergencyNumbers, { phoneNumber });
    return res;
  } catch (error) {
    console.error('Error adding emergency number:', error);
    throw error;
  }
}

/** حذف رقم طوارئ */
export async function removeEmergencyNumber(phoneNumber: string) {
  try {
    const res = await api.delete(`${Endpoints.profile.emergencyNumbers}/${encodeURIComponent(phoneNumber)}`);
    return res;
  } catch (error) {
    console.error('Error removing emergency number:', error);
    throw error;
  }
}

/** إضافة رقم هاتف إضافي */
export async function addAdditionalPhone(phoneNumber: string) {
  try {
    const res = await api.post(Endpoints.profile.additionalPhones, { phoneNumber });
    return res;
  } catch (error) {
    console.error('Error adding additional phone:', error);
    throw error;
  }
}

/** حذف رقم هاتف إضافي */
export async function removeAdditionalPhone(phoneNumber: string) {
  try {
    const res = await api.delete(`${Endpoints.profile.additionalPhones}/${encodeURIComponent(phoneNumber)}`);
    return res;
  } catch (error) {
    console.error('Error removing additional phone:', error);
    throw error;
  }
}
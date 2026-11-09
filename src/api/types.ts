export interface LoginRequest {
  email: string;
  password: string;
}

/** شكل الرد الفعلي من /auth/account/login */
export interface LoginResponse {
  userId: string;
  email: string;
  firstName: string;
  roles: string[];
  accessToken: string;
  success: boolean;
  message: string | null;
  errors: unknown;
}

/** بيانات المستخدم التي نحتفظ بها داخل التطبيق */
export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  roles: string[];
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  country: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string | null;
  userId?: string;
  email?: string;
}

export interface SendCodeRequest {
  email: string;
}

export interface BasicResponse {
  success: boolean;
  message: string | null;
  errors?: unknown;
}

/** الـ Backend يتوقع الحقول بهذه الأسماء بالضبط: email و Code و NewPassword */
export interface ResetPasswordRequest {
  email: string;
  Code: string;
  NewPassword: string;
}

// ──────────────── الدليل السياحي ────────────────

export interface Category {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
}

export interface City {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn?: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  categoryNames: string[];
}

export interface CitySection {
  id: number;
  title: string;
  content: string;
  images?: string[];      // ✅ optional - قد لا توجد صور
  videos?: string[];      // ✅ optional - قد لا توجد فيديوهات
  order: number;
}

export interface TouristPlace {
  id: number;
  name: string;
  nameEn?: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
}

export interface CityDetailsResponse {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  sections: CitySection[];
  places: TouristPlace[];
}

// للرحلات
export interface Trip {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'archived';
  cities: number[];
}

// للملف الطبي
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedicalProfile {
  bloodType: string;
  chronicDiseases: string[];
  medications: string[];
  allergies: string[];
  emergencyContacts: EmergencyContact[];
}



// التوصيات (Recommendations)
export interface Recommendation {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  season: string;
  activityType: string;
  occasion?: string;
  suggestedPlaceId?: number;
  suggestedPlaceName?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface RecommendationListResponse {
  success: boolean;
  message: string;
  recommendations: Recommendation[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// التوصيات (Recommendations)
export interface Recommendation {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  season: string;
  activityType: string;
  occasion?: string;
  suggestedPlaceId?: number;
  suggestedPlaceName?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}




// البروفايل
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
  medicalProfile?: MedicalProfileData;
}

export interface MedicalProfileData {
  id?: number;
  chronicDiseases?: string;
  currentMedications?: string;
  allergies?: string;
  lastUpdated?: string;
}

export interface UploadImageResponse {
  success: boolean;
  message: string;
  imageUrl?: string;
}






export type RecommendationSeason = 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'All';
export type ActivityType = 'Nature' | 'Cultural' | 'Religious' | 'Adventure' | 'All';
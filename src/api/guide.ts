import { api } from './client';
import { Endpoints } from './endpoints';
import type { City, CityDetailsResponse, Category } from './types';

/** جلب جميع التصنيفات (مع دعم اللغة الديناميكية) */
export async function fetchCategories(langCode: string = 'ar'): Promise<Category[]> {
  try {
    const res = await api.get<Category[]>(`${Endpoints.guide.categories}?langCode=${langCode}`);
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/** جلب المدن (مع دعم اللغة الديناميكية والفلترة) */
export async function fetchCities(categoryId?: number, langCode: string = 'ar'): Promise<City[]> {
  try {
    let url = `${Endpoints.guide.cities}?langCode=${langCode}`;
    if (categoryId) {
      url += `&categoryId=${categoryId}`;
    }
    const res = await api.get<City[]>(url);
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}


export async function fetchAllCities(langCode: string = 'ar'): Promise<City[]> {
  try {
    // نستخدم نفس الـ Endpoint لكن بدون تمرير categoryId
    const res = await api.get<City[]>(`${Endpoints.guide.cities}?langCode=${langCode}`);
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error('Error fetching all cities:', error);
    return [];
  }
}



/** جلب تفاصيل مدينة محددة (مع دعم اللغة الديناميكية) */
export async function fetchCityDetails(cityId: number, langCode: string = 'ar'): Promise<CityDetailsResponse | null> {
  try {
    const res = await api.get<CityDetailsResponse>(`${Endpoints.guide.cityDetails(cityId)}?langCode=${langCode}`);
    return res && typeof res === 'object' && !Array.isArray(res) ? res : null;
  } catch (error) {
    console.error('Error fetching city details:', error);
    return null;
  }
}
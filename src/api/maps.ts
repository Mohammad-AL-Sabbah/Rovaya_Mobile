import { API_URL } from './config';

const GOOGLE_API_KEY = 'ضع_مفتاح_API_هنا'; // استبدله بمفتاحك

export interface Place {
  id: number;
  name: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  address?: string;
  type?: 'restaurant' | 'hotel' | 'attraction';
  rating?: number;
  photoUrl?: string;
}

export interface RouteData {
  overview_polyline: string;
  legs: Array<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    start_location: { lat: number; lng: number };
    end_location: { lat: number; lng: number };
  }>;
}

/**
 * الحصول على موقع المستخدم الحالي
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await import('expo-location');
    const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
    
    if (status !== 'granted') {
      const permission = await requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return null;
      }
    }

    const location = await getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * جلب مسار بين نقطتين (Directions API)
 */
export async function getRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<RouteData | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.latitude},${origin.longitude}&` +
      `destination=${destination.latitude},${destination.longitude}&` +
      `mode=driving&` +
      `key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      return data.routes[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}

/**
 * جلب مسار متعدد النقاط (Waypoints)
 */
export async function getMultiPointRoute(
  origin: { latitude: number; longitude: number },
  waypoints: Array<{ latitude: number; longitude: number }>,
  destination: { latitude: number; longitude: number }
): Promise<RouteData | null> {
  try {
    const waypointsStr = waypoints
      .map(wp => `${wp.latitude},${wp.longitude}`)
      .join('|');

    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.latitude},${origin.longitude}&` +
      `destination=${destination.latitude},${destination.longitude}&` +
      `waypoints=${waypointsStr}&` +
      `mode=driving&` +
      `optimize:true&` +
      `key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      return data.routes[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting multi-point route:', error);
    return null;
  }
}

/**
 * البحث عن أماكن قريبة (مطاعم، فنادق، إلخ)
 */
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  type: 'restaurant' | 'lodging' | 'tourist_attraction' = 'restaurant',
  radius: number = 5000
): Promise<Place[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${latitude},${longitude}&` +
      `radius=${radius}&` +
      `type=${type}&` +
      `key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return data.results.map((place: any) => ({
        id: place.place_id,
        name: place.name,
        nameAr: place.name, // يمكن ترجمتها لاحقاً
        nameEn: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.vicinity,
        type: type as any,
        rating: place.rating,
        photoUrl: place.photos?.[0]?.photo_reference 
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
          : undefined,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
}

/**
 * الحصول على تفاصيل مكان محدد
 */
export async function getPlaceDetails(placeId: string): Promise<Place | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `fields=name,formatted_address,geometry,rating,photos,formatted_phone_number,website,opening_hours,reviews&` +
      `key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const result = data.result;
      return {
        id: placeId,
        name: result.name,
        nameAr: result.name,
        nameEn: result.name,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        address: result.formatted_address,
        rating: result.rating,
        photoUrl: result.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${result.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
          : undefined,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * فتح المكان في Google Maps الخارجي
 */
export function openInGoogleMaps(latitude: number, longitude: number, name: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=&travelmode=driving`;
  Linking.openURL(url);
}





/**
 * تحويل اسم المكان إلى إحداثيات (Geocoding)
 */
export async function geocodePlace(placeName: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName + ', Palestine')}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return {
        latitude: data.results[0].geometry.location.lat,
        longitude: data.results[0].geometry.location.lng,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
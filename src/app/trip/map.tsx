import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Brand } from '@/constants/brand';
import {
  getCurrentLocation,
  getMultiPointRoute,
  searchNearbyPlaces,
  getPlaceDetails,
  openInGoogleMaps,
  geocodePlace,
  type Place,
} from '@/api/maps';

const { width, height } = Dimensions.get('window');

export default function TripMapScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isArabic = i18n.language === 'ar';
  const mapRef = useRef<MapView>(null);

  // استقبال بيانات الرحلة من شاشة Planner
  const { tripData } = useLocalSearchParams<{ tripData?: string }>();
  const parsedTrip = tripData ? JSON.parse(tripData) : null;

  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<Place | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);

  // الأماكن الديناميكية المستخرجة من خطة الـ AI
  const [dynamicPlaces, setDynamicPlaces] = useState<Array<{ id: number; name: string; latitude: number; longitude: number }>>([]);

  // الأماكن الافتراضية في حال عدم وجود بيانات AI
  const defaultPlaces = [
    { id: 1, name: 'مغارة شقبة', latitude: 31.9038, longitude: 35.2034 },
    { id: 2, name: 'قصر هشام', latitude: 31.8833, longitude: 35.4500 },
    { id: 3, name: 'دير القرنتل', latitude: 31.8719, longitude: 35.4444 },
    { id: 4, name: 'أريحا القديمة', latitude: 31.8667, longitude: 35.4500 },
  ];

  const tripPlacesToUse = dynamicPlaces.length > 0 ? dynamicPlaces : defaultPlaces;

  useEffect(() => {
    initializeMap();
    if (parsedTrip) {
      extractPlacesFromTrip();
    }
  }, []);

  const extractPlacesFromTrip = async () => {
    const places: any[] = [];
    let idCounter = 1;
    
    for (const day of parsedTrip.days) {
      for (const activity of day.activities) {
        let lat = activity.latitude;
        let lng = activity.longitude;
        
        // إذا لم يرسل الـ AI الإحداثيات، نستخدم Geocoding لجلبها من الاسم
        if (!lat || !lng) {
          const coords = await geocodePlace(activity.place_name);
          if (coords) {
            lat = coords.latitude;
            lng = coords.longitude;
          } else {
            // إحداثيات افتراضية للضفة الغربية كـ Fallback
            lat = 31.9; 
            lng = 35.2; 
          }
        }
        
        places.push({
          id: idCounter++,
          name: activity.place_name,
          latitude: lat,
          longitude: lng,
        });
      }
    }
    setDynamicPlaces(places);
  };

  const initializeMap = async () => {
    setLoading(true);
    
    // 1. الحصول على موقع المستخدم
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
      
      // 2. رسم المسار
      await drawRoute(location);
      
      // 3. جلب الأماكن القريبة (مطاعم)
      const places = await searchNearbyPlaces(location.latitude, location.longitude, 'restaurant', 10000);
      setNearbyPlaces(places);
    } else {
      // إذا فشل تحديد الموقع، نرسم المسار بناءً على نقطة البداية في الخطة
      if (tripPlacesToUse.length > 0) {
        await drawRoute({ latitude: tripPlacesToUse[0].latitude, longitude: tripPlacesToUse[0].longitude });
      }
    }
    
    setLoading(false);
  };

  const drawRoute = async (startLocation: { latitude: number; longitude: number }) => {
    if (tripPlacesToUse.length === 0) return;

    const waypoints = tripPlacesToUse.slice(0, -1); // كل الأماكن ما عدا الأخير
    const destination = tripPlacesToUse[tripPlacesToUse.length - 1];

    const route = await getMultiPointRoute(
      startLocation,
      waypoints,
      destination
    );

    if (route) {
      // فك تشفير الـ Polyline
      const decodedPoints = decodePolyline(route.overview_polyline);
      setRoutePoints(decodedPoints);

      // تحريك الخريطة لتشمل كل المسار
      if (mapRef.current) {
        const allPoints = [startLocation, ...waypoints, destination];
        const region = calculateRegionForPoints(allPoints);
        mapRef.current.animateToRegion(region, 1000);
      }
    }
  };

  // فك تشفير Polyline من Google Directions API
  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const calculateRegionForPoints = (points: Array<{ latitude: number; longitude: number }>): Region => {
    const minLat = Math.min(...points.map(p => p.latitude));
    const maxLat = Math.max(...points.map(p => p.latitude));
    const minLng = Math.min(...points.map(p => p.longitude));
    const maxLng = Math.max(...points.map(p => p.longitude));

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.05),
      longitudeDelta: Math.max(lngDelta, 0.05),
    };
  };

  const handlePlacePress = async (place: Place) => {
    setLoadingPlace(true);
    setSelectedPlace(place);
    setShowPlaceModal(true);

    // جلب تفاصيل إضافية
    const details = await getPlaceDetails(place.id.toString());
    if (details) {
      setPlaceDetails(details);
    }
    setLoadingPlace(false);
  };

  const handleOpenInGoogleMaps = () => {
    if (selectedPlace) {
      openInGoogleMaps(selectedPlace.latitude, selectedPlace.longitude, selectedPlace.name);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 100 }]}>
        <ActivityIndicator size="large" color={Brand.green} />
        <Text style={styles.loadingText}>
          {isArabic ? 'جاري تحميل الخريطة ورسم المسار...' : 'Loading map and drawing route...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* زر العودة في الأعلى */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={Brand.white} />
        </Pressable>
        <Text style={styles.topBarTitle}>{isArabic ? 'خريطة الرحلة' : 'Trip Map'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* الخريطة */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.latitude || tripPlacesToUse[0]?.latitude || 31.9,
          longitude: userLocation?.longitude || tripPlacesToUse[0]?.longitude || 35.2,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
      >
        {/* Marker لموقع المستخدم */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title={isArabic ? 'موقعك الحالي' : 'Your Location'}
            pinColor={Brand.green}
          />
        )}

        {/* Markers للأماكن من الخطة */}
        {tripPlacesToUse.map((place, index) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={`${index + 1}. ${place.name}`}
            description={isArabic ? 'محطة في رحلتك' : 'Trip stop'}
          >
            <View style={styles.tripMarker}>
              <Text style={styles.tripMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Markers للمطاعم والفنادق القريبة */}
        {nearbyPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.address || ''}
            onPress={() => handlePlacePress(place)}
          >
            <View style={[styles.nearbyMarker, { backgroundColor: place.type === 'restaurant' ? '#FF6B6B' : '#4ECDC4' }]}>
              <Ionicons
                name={place.type === 'restaurant' ? 'restaurant-outline' : 'bed-outline'}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </Marker>
        ))}

        {/* خط المسار */}
        {routePoints.length > 0 && (
          <Polyline
            coordinates={routePoints}
            strokeColor={Brand.green}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={initializeMap}
        style={styles.recenterButton}
      >
        <Ionicons name="navigate" size={24} color={Brand.white} />
      </Pressable>

      {/* Modal تفاصيل المكان */}
      <Modal
        visible={showPlaceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlaceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingPlace ? (
              <ActivityIndicator size="large" color={Brand.green} />
            ) : placeDetails ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {placeDetails.photoUrl && (
                  <View style={styles.placeImageContainer}>
                    <MapView
                      style={styles.placeImage}
                      initialRegion={{
                        latitude: placeDetails.latitude,
                        longitude: placeDetails.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker
                        coordinate={{ latitude: placeDetails.latitude, longitude: placeDetails.longitude }}
                      />
                    </MapView>
                  </View>
                )}

                <Text style={styles.placeName}>{placeDetails.name}</Text>
                
                {placeDetails.address && (
                  <View style={styles.placeRow}>
                    <Ionicons name="location-outline" size={18} color={Brand.muted} />
                    <Text style={styles.placeText}>{placeDetails.address}</Text>
                  </View>
                )}

                {placeDetails.rating && (
                  <View style={styles.placeRow}>
                    <Ionicons name="star" size={18} color="#FFD700" />
                    <Text style={styles.placeText}>{placeDetails.rating} / 5</Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <Pressable
                    onPress={() => setShowPlaceModal(false)}
                    style={[styles.modalButton, styles.modalButtonCancel]}
                  >
                    <Text style={styles.modalButtonText}>
                      {isArabic ? 'إغلاق' : 'Close'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleOpenInGoogleMaps}
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                  >
                    <Ionicons name="navigate" size={18} color={Brand.white} />
                    <Text style={styles.modalButtonTextPrimary}>
                      {isArabic ? 'افتح في الخرائط' : 'Open in Maps'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.errorText}>
                {isArabic ? 'تعذر تحميل التفاصيل' : 'Could not load details'}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.paper,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Brand.muted,
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: Brand.white,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  tripMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.white,
  },
  tripMarkerText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '900',
  },
  nearbyMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.white,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    padding: 24,
  },
  placeImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeName: {
    fontSize: 22,
    fontWeight: '900',
    color: Brand.greenText,
    marginBottom: 16,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  placeText: {
    fontSize: 15,
    color: Brand.body,
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonCancel: {
    backgroundColor: Brand.mint,
  },
  modalButtonText: {
    color: Brand.green,
    fontSize: 15,
    fontWeight: '800',
  },
  modalButtonPrimary: {
    backgroundColor: Brand.green,
  },
  modalButtonTextPrimary: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    textAlign: 'center',
    color: Brand.muted,
    fontSize: 15,
    paddingVertical: 40,
  },
});
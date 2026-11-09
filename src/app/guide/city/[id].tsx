import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { resolveMediaUrl } from '@/api/config';
import { fetchCityDetails } from '@/api/guide';
import { useAsync } from '@/hooks/use-async';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  green: '#103D30',
  greenDark: '#092B22',
  gold: '#C99A45',
  paper: '#FAFAF7',
  white: '#FFFFFF',
  ink: '#18372D',
  body: '#586A61',
  muted: '#89958E',
  line: '#E8EAE4',
};

const CITY_FALLBACK = require('@/assets/images/welcome/jerusalem.jpg');
const PLACE_FALLBACK = require('@/assets/images/welcome/acre.jpg');

type GalleryItem = { uri: string; key: string };

export default function CityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const lang = isArabic ? 'ar' : 'en';

  const { data: city, loading, error, reload } = useAsync(
    () => fetchCityDetails(Number(id), lang),
    `city-details-${id}`,
    [id, lang],
  );

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const galleryRef = useRef<FlatList<GalleryItem>>(null);

  const imageSource = (url?: string | null) =>
    url ? resolveMediaUrl(url) || url : CITY_FALLBACK;

  const openGallery = (urls: string[], index = 0) => {
    const valid = urls.filter(Boolean).map((uri, i) => ({ uri, key: `${i}-${uri}` }));
    if (!valid.length) return;
    setGalleryImages(valid);
    setActiveImage(Math.max(0, Math.min(index, valid.length - 1)));
    setGalleryVisible(true);
  };

  const openVideo = async (url: string) => {
    try {
      await Linking.openURL(resolveMediaUrl(url) || url);
    } catch (e) {
      console.warn('Could not open video:', e);
    }
  };

  // دالة مساعدة للترجمة مع fallback
  const getTranslation = (key: string, fallbackAr: string, fallbackEn: string) => {
    const translated = t(key);
    if (translated === key) {
      return isArabic ? fallbackAr : fallbackEn;
    }
    return translated;
  };

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.stateMessage}>
          {isArabic ? 'جاري تحميل تفاصيل المدينة...' : 'Loading destination...'}
        </Text>
      </View>
    );
  }

  if (error || !city) {
    return (
      <View style={styles.stateScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
        <View style={styles.errorMark}>
          <Ionicons name="map-outline" size={34} color={COLORS.green} />
        </View>
        <Text style={styles.errorTitle}>
          {isArabic ? 'تعذر تحميل تفاصيل المدينة' : 'Unable to load destination'}
        </Text>
        <Text style={styles.stateMessage}>
          {isArabic ? 'تحقق من اتصال الإنترنت وحاول مجدداً' : 'Check your connection and try again.'}
        </Text>
        <Pressable onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryLabel}>
            {isArabic ? 'إعادة المحاولة' : 'Try again'}
          </Text>
          <Ionicons name="refresh" size={17} color={COLORS.white} />
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.goBack}>{isArabic ? 'العودة' : 'Go back'}</Text>
        </Pressable>
      </View>
    );
  }

  const cityName = isArabic ? city.name : city.nameEn || city.name;
  const cityDescription = isArabic ? city.description : city.descriptionEn || city.description;
  const sections = [...(city.sections || [])].sort((a, b) => a.order - b.order);
  const places = city.places || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 22) + 28 }}
      >
        {/* Full-bleed editorial cover */}
        <View style={[styles.cover, { height: 440 + insets.top }]}>
          <Image
            source={imageSource(city.imageUrl)}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={450}
          />
          <LinearGradient
            colors={['rgba(5,22,17,0.42)', 'rgba(5,22,17,0.04)', 'rgba(5,22,17,0.82)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.coverTop, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={COLORS.white}
              />
            </Pressable>
            <Text style={styles.coverBrand}>ROVAYA</Text>
          </View>
          <View style={[styles.coverText, { alignItems: 'center' }]}>
            <Text style={styles.coverKicker}>
              {isArabic ? 'فلسطين · اكتشف المكان' : 'PALESTINE · DISCOVER THE PLACE'}
            </Text>
            <Text style={[styles.coverTitle, { textAlign: 'center' }]}>
              {cityName}
            </Text>
            <View style={[styles.coverRule, { alignSelf: 'center' }]} />
            <Text style={[styles.coverCaption, { textAlign: 'center' }]}>
              {isArabic
                ? 'لكل مدينة حكاية، ولكل زاوية ذاكرة.'
                : 'Every city has a story. Every corner holds a memory.'}
            </Text>
          </View>
        </View>

        <View style={styles.article}>
          {/* Introduction */}
          <View style={styles.introBlock}>
            <View style={[styles.eyebrowRow, { flexDirection: 'row' }]}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrow}>
                {isArabic ? 'عن المدينة' : 'THE DESTINATION'}
              </Text>
              <View style={styles.eyebrowLine} />
            </View>
            <Text style={[styles.introTitle, { textAlign: 'center' }]}>
              {getTranslation('guide.cityOverview', 'تعرّف على المدينة', 'Get to know the city')}
            </Text>
            {!!cityDescription && (
              <Text
                style={[
                  styles.introBody,
                  { textAlign: isArabic ? 'right' : 'left' },
                ]}
              >
                {cityDescription}
              </Text>
            )}
          </View>

          {/* City stories */}
          {sections.length > 0 && (
            <View style={styles.storiesBlock}>
              <View style={styles.sectionLead}>
                <Text style={[styles.sectionOverline, { textAlign: 'center' }]}>
                  {isArabic ? 'اكتشف أكثر' : 'GO DEEPER'}
                </Text>
                <Text style={[styles.sectionHeading, { textAlign: 'center' }]}>
                  {getTranslation('guide.citySections', 'حكايات المدينة', 'Stories of the city')}
                </Text>
              </View>

              {sections.map((section, index) => {
                const title = isArabic ? section.title : section.titleEn || section.title;
                const content = isArabic ? section.content : section.contentEn || section.content;
                const photos = (section.images || []).filter(Boolean);
                const videos = (section.videos || []).filter(Boolean);
                const hasSinglePhoto = photos.length === 1;

                return (
                  <View key={section.id} style={styles.story}>
                    <View style={[styles.storyMeta, { flexDirection: 'row' }]}>
                      <Text style={styles.storyNumber}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                      <View style={styles.storyMetaLine} />
                      <Text style={styles.storyMetaLabel}>
                        {isArabic ? 'حكاية من المكان' : 'A LOCAL STORY'}
                      </Text>
                    </View>
                    <Text style={[styles.storyTitle, { textAlign: 'center' }]}>
                      {title}
                    </Text>
                    {!!content && (
                      <Text
                        style={[
                          styles.storyBody,
                          { textAlign: isArabic ? 'right' : 'left' },
                        ]}
                      >
                        {content}
                      </Text>
                    )}

                    {photos.length > 0 && (
                      <View style={styles.photoStrip}>
                        {hasSinglePhoto ? (
                          <View style={styles.singlePhotoContainer}>
                            <Pressable
                              onPress={() => openGallery(photos, 0)}
                              style={({ pressed }) => [
                                styles.singlePhotoWrap,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Image
                                source={imageSource(photos[0])}
                                style={styles.singlePhoto}
                                contentFit="cover"
                                transition={300}
                              />
                              <View style={styles.photoExpand}>
                                <Ionicons
                                  name="expand-outline"
                                  size={20}
                                  color={COLORS.white}
                                />
                              </View>
                            </Pressable>
                          </View>
                        ) : (
                          <>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.photoStripContent}
                            >
                              {photos.map((url, photoIndex) => (
                                <Pressable
                                  key={`${section.id}-${photoIndex}`}
                                  onPress={() => openGallery(photos, photoIndex)}
                                  style={({ pressed }) => [
                                    styles.storyPhotoWrap,
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <Image
                                    source={imageSource(url)}
                                    style={styles.storyPhoto}
                                    contentFit="cover"
                                    transition={300}
                                  />
                                  <View style={styles.photoExpand}>
                                    <Ionicons
                                      name="expand-outline"
                                      size={16}
                                      color={COLORS.white}
                                    />
                                  </View>
                                </Pressable>
                              ))}
                            </ScrollView>
                            <Text style={[styles.swipeNote, { textAlign: 'center' }]}>
                              {isArabic
                                ? 'اسحب لمشاهدة بقية الصور'
                                : 'Swipe to see more photos'}
                            </Text>
                          </>
                        )}
                      </View>
                    )}

                    {videos.length > 0 && (
                      <View style={styles.videoGroup}>
                        {videos.map((url, videoIndex) => (
                          <Pressable
                            key={`${section.id}-video-${videoIndex}`}
                            onPress={() => openVideo(url)}
                            style={({ pressed }) => [
                              styles.videoRow,
                              { flexDirection: 'row' },
                              pressed && styles.pressed,
                            ]}
                          >
                            <View style={styles.videoPlay}>
                              <Ionicons name="play" size={17} color={COLORS.white} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.videoRowTitle, { textAlign: 'left' }]}>
                                {isArabic
                                  ? `شاهد الفيديو ${videoIndex + 1}`
                                  : `Watch video ${videoIndex + 1}`}
                              </Text>
                              <Text style={[styles.videoRowSub, { textAlign: 'left' }]}>
                                {isArabic ? 'مشاهدة من قلب المكان' : 'Experience the place'}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={COLORS.muted}
                            />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {index !== sections.length - 1 && <View style={styles.storyDivider} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Places */}
          {places.length > 0 && (
            <View style={styles.placesBlock}>
              <View style={styles.sectionLead}>
                <Text style={[styles.sectionOverline, { textAlign: 'center' }]}>
                  {isArabic ? 'لا تفوّت زيارتها' : 'WORTH THE VISIT'}
                </Text>
                <Text style={[styles.sectionHeading, { textAlign: 'center' }]}>
                  {getTranslation(
                    'guide.touristPlaces',
                    'أماكن تستحق الاكتشاف',
                    'Places to discover'
                  )}
                </Text>
              </View>
              {places.map((place, index) => {
                const name = isArabic ? place.name : place.nameEn || place.name;
                const description = isArabic
                  ? place.description
                  : place.descriptionEn || place.description;
                return (
                  <Pressable
                    key={place.id}
                    onPress={() => place.imageUrl && openGallery([place.imageUrl], 0)}
                    style={({ pressed }) => [styles.placeFeature, pressed && styles.pressed]}
                  >
                    <View style={styles.placeImageFrame}>
                      <Image
                        source={
                          place.imageUrl ? imageSource(place.imageUrl) : PLACE_FALLBACK
                        }
                        style={styles.placeFeatureImage}
                        contentFit="cover"
                        transition={350}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.25)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.placeIndex}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                      {place.imageUrl ? (
                        <View style={styles.placeExpand}>
                          <Ionicons
                            name="expand-outline"
                            size={16}
                            color={COLORS.white}
                          />
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.placeTextBlock, { alignItems: 'center' }]}>
                      <Text style={[styles.placeFeatureTitle, { textAlign: 'center' }]}>
                        {name}
                      </Text>
                      {!!description && (
                        <Text
                          style={[
                            styles.placeFeatureDescription,
                            { textAlign: isArabic ? 'right' : 'left' },
                          ]}
                          numberOfLines={3}
                        >
                          {description}
                        </Text>
                      )}
                      <View style={[styles.placeLink, { flexDirection: 'row' }]}>
                        <Text style={styles.placeLinkText}>
                          {isArabic ? 'اكتشف المكان' : 'EXPLORE PLACE'}
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={COLORS.gold}
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.endNote}>
            <View style={styles.endNoteRule} />
            <Text style={styles.endNoteBrand}>ROVAYA</Text>
            <Text style={styles.endNoteText}>
              {isArabic
                ? `اكتشف المزيد من فلسطين، وابدأ حكايتك في ${cityName}.`
                : `Discover more of Palestine. Start your story in ${cityName}.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal
        visible={galleryVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setGalleryVisible(false)}
      >
        <View style={styles.viewer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={[styles.viewerTop, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => setGalleryVisible(false)} style={styles.viewerClose}>
              <Ionicons name="close" size={27} color={COLORS.white} />
            </Pressable>
            <Text style={styles.viewerCount}>
              {galleryImages.length ? `${activeImage + 1} / ${galleryImages.length}` : ''}
            </Text>
            <View style={{ width: 42 }} />
          </View>
          <FlatList
            ref={galleryRef}
            key={galleryVisible ? galleryImages.map((x) => x.key).join('|') : 'closed'}
            data={galleryImages}
            horizontal
            pagingEnabled
            initialScrollIndex={activeImage}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) =>
              setTimeout(
                () => galleryRef.current?.scrollToIndex({ index, animated: false }),
                80
              )
            }
            onMomentumScrollEnd={(event) =>
              setActiveImage(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))
            }
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <View style={styles.viewerPage}>
                <Image
                  source={imageSource(item.uri)}
                  style={styles.viewerImage}
                  contentFit="contain"
                />
              </View>
            )}
          />
          <View style={[styles.viewerBottom, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.viewerDots}>
              {galleryImages.map((item, index) => (
                <View
                  key={item.key}
                  style={[styles.viewerDot, index === activeImage && styles.viewerDotActive]}
                />
              ))}
            </View>
            <Text style={styles.viewerHint}>
              {isArabic ? 'اسحب للتنقل بين الصور' : 'Swipe to browse photos'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  stateScreen: {
    flex: 1,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  stateMessage: { color: COLORS.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  errorMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.green,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  retryLabel: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  goBack: { color: COLORS.green, fontWeight: '700', marginTop: 7 },

  cover: { width: '100%', backgroundColor: COLORS.greenDark, justifyContent: 'space-between' },
  coverTop: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.23)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBrand: { color: COLORS.white, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  coverText: {
    position: 'absolute',
    bottom: 42,
    left: 25,
    right: 25,
    gap: 10,
    alignItems: 'center',
  },
  coverKicker: { color: '#E6C47E', fontSize: 10, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  coverTitle: {
    color: COLORS.white,
    fontSize: 43,
    fontWeight: '900',
    lineHeight: 54,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    textAlign: 'center',
  },
  coverRule: { width: 54, height: 3, backgroundColor: COLORS.gold, marginTop: 2 },
  coverCaption: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 21,
    maxWidth: '90%',
    textAlign: 'center',
  },

  article: { paddingHorizontal: 23 },
  introBlock: { paddingTop: 37, paddingBottom: 39, alignItems: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  eyebrowLine: { width: 25, height: 2, backgroundColor: COLORS.gold },
  eyebrow: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  introTitle: { color: COLORS.ink, fontSize: 25, fontWeight: '900', marginBottom: 15, textAlign: 'center' },
  introBody: { color: COLORS.body, fontSize: 15, lineHeight: 29, fontWeight: '400' },

  storiesBlock: { paddingTop: 4 },
  sectionLead: { marginBottom: 26, gap: 7, alignItems: 'center' },
  sectionOverline: { color: COLORS.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  sectionHeading: { color: COLORS.ink, fontSize: 27, fontWeight: '900', lineHeight: 36, textAlign: 'center' },
  story: { paddingBottom: 29 },
  storyMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  storyNumber: { color: COLORS.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  storyMetaLine: { width: 25, height: 1, backgroundColor: '#D7C49E' },
  storyMetaLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  storyTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '900', lineHeight: 31, marginBottom: 12, textAlign: 'center' },
  storyBody: { color: COLORS.body, fontSize: 14, lineHeight: 27 },
  
  photoStrip: { marginTop: 20, marginHorizontal: -23 },
  
  singlePhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 23,
    paddingVertical: 10,
  },
  singlePhotoWrap: {
    width: Math.min(SCREEN_WIDTH * 0.75, 500),
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E6EAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  singlePhoto: { width: '100%', height: '100%' },
  
  photoStripContent: { paddingHorizontal: 23, gap: 11 },
  storyPhotoWrap: {
    width: SCREEN_WIDTH * 0.72,
    height: 205,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E6EAE5',
  },
  storyPhoto: { width: '100%', height: '100%' },
  
  photoExpand: {
    position: 'absolute',
    right: 11,
    bottom: 11,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeNote: { color: COLORS.muted, fontSize: 10, marginTop: 9, paddingHorizontal: 23, textAlign: 'center' },
  
  videoGroup: { marginTop: 17, borderTopWidth: 1, borderTopColor: COLORS.line },
  videoRow: {
    minHeight: 72,
    alignItems: 'center',
    gap: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexDirection: 'row',
  },
  videoPlay: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoRowTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  videoRowSub: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: 'left' },
  storyDivider: { height: 1, backgroundColor: COLORS.line, marginTop: 27 },

  placesBlock: { paddingTop: 15 },
  placeFeature: { marginBottom: 31 },
  placeImageFrame: {
    height: 225,
    width: '100%',
    backgroundColor: '#E6EAE5',
    overflow: 'hidden',
    position: 'relative',
  },
  placeFeatureImage: { width: '100%', height: '100%' },
  placeIndex: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  placeExpand: {
    position: 'absolute',
    right: 13,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTextBlock: { paddingTop: 15, gap: 8, alignItems: 'center' },
  placeFeatureTitle: { color: COLORS.ink, fontSize: 21, fontWeight: '900', lineHeight: 29, textAlign: 'center' },
  placeFeatureDescription: { color: COLORS.body, fontSize: 13, lineHeight: 23 },
  placeLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  placeLinkText: { color: COLORS.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },

  endNote: { alignItems: 'center', paddingTop: 20, paddingBottom: 12, gap: 12 },
  endNoteRule: { width: 42, height: 2, backgroundColor: COLORS.gold, marginBottom: 4 },
  endNoteBrand: { color: COLORS.green, fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  endNoteText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 270,
  },
  pressed: { opacity: 0.82 },

  viewer: { flex: 1, backgroundColor: '#000000' },
  viewerTop: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCount: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  viewerPage: { width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: '100%' },
  viewerBottom: { alignItems: 'center', gap: 12, paddingTop: 12 },
  viewerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
    paddingHorizontal: 25,
  },
  viewerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#555555' },
  viewerDotActive: { width: 17, backgroundColor: COLORS.gold },
  viewerHint: { color: '#9B9B9B', fontSize: 11, paddingBottom: 4 },
});
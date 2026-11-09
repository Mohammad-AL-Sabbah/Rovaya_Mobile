import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchNews, getCachedArticle, type NewsArticle } from '@/api';
import { useTabBarSpace } from '@/components/floating-tab-bar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SURFACE } from '@/components/tab-screen';
import { Brand } from '@/constants/brand';
import { useAsync } from '@/hooks/use-async';
import { useLanguage } from '@/hooks/use-language';
import { formatArticleDate, htmlToParagraphs } from '@/utils/text';

const HERO_H = 270;
const OVERLAP = 30;

export default function NewsDetailsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const space = useTabBarSpace();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const articleId = Number(id);

  // من الذاكرة إن فُتح الخبر من الرئيسية، وإلا نجلب القائمة (مثلاً عند فتح رابط مباشر)
  const cached = getCachedArticle(articleId);
  const { data: list, loading } = useAsync(async () => (cached ? [] : fetchNews()));
  const article: NewsArticle | undefined = cached ?? list?.find((a) => a.id === articleId);

  const paragraphs = useMemo(() => (article ? htmlToParagraphs(article.contentHtml) : []), [article]);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/home'));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space }}>
        <View style={{ height: HERO_H, backgroundColor: Brand.deep }}>
          {article?.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#1A7155', '#0B3A2B']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient pointerEvents="none" colors={['rgba(5,35,27,0.65)', 'rgba(5,35,27,0)']} style={[styles.scrim, { top: 0, height: 150 }]} />
          <LinearGradient pointerEvents="none" colors={['rgba(5,35,27,0)', 'rgba(5,35,27,0.6)']} style={[styles.scrim, { bottom: 0, height: '50%' }]} />

          <View style={[styles.header, { top: insets.top + 10 }]}>
            <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={Brand.white} />
            </Pressable>
            <LanguageSwitcher variant="glass" />
          </View>
        </View>

        <View style={styles.sheet}>
          {loading && !article && <Text style={styles.muted}>…</Text>}

          {!loading && !article && (
            <View style={styles.notFound}>
              <Ionicons name="newspaper-outline" size={30} color={Brand.green} />
              <Text style={styles.muted}>{t('news.notFound')}</Text>
            </View>
          )}

          {!!article && (
            <>
              <View style={styles.metaRow}>
                <View style={styles.sourcePill}>
                  <Ionicons name="checkmark-circle" size={15} color="#8A5A14" />
                  <Text style={styles.sourceText}>{t('home.news.source')}</Text>
                </View>
                <Text style={styles.date}>{formatArticleDate(article.publishedDate, (i) => t(`date.months.${i}`))}</Text>
              </View>

              <Text style={styles.title}>{article.title}</Text>

              <View style={styles.body}>
                {(paragraphs.length ? paragraphs : [article.summary]).map((p, i) => (
                  <Text key={i} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>

              {!!article.sourceLink && (
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(article.sourceLink!)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.original, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="open-outline" size={19} color={Brand.green} />
                  <Text style={styles.originalText}>{t('news.openOriginal')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  scrim: { position: 'absolute', left: 0, right: 0 },
  header: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },

  sheet: {
    marginTop: -OVERLAP,
    gap: 16,
    padding: 22,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: SURFACE,
    minHeight: 400,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 13, backgroundColor: '#FFF4D9' },
  sourceText: { color: '#8A5A14', fontSize: 12, fontWeight: '800' },
  date: { color: Brand.muted, fontSize: 13, fontWeight: '700' },
  title: { color: Brand.greenText, fontSize: 24, lineHeight: 35, fontWeight: '800' },
  body: { gap: 14 },
  paragraph: { color: Brand.body, fontSize: 16, lineHeight: 28 },
  original: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: Brand.green, marginTop: 6 },
  originalText: { color: Brand.green, fontSize: 15.5, fontWeight: '800' },
  muted: { color: Brand.muted, fontSize: 15, textAlign: 'center' },
  notFound: { alignItems: 'center', gap: 10, paddingVertical: 40 },
});
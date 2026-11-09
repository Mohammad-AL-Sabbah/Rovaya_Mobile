
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Brand } from '@/constants/brand';

interface Country {
  name: string;
  code: string;
  flag: string;
  phoneCode: string;
}

interface CountryPickerProps {
  value: string;
  onSelect: (country: string) => void;
  error?: string;
  label?: string;
}

const COUNTRIES_API =
  'https://countries.dev/countries?fields=name,alpha2Code,flag,callingCodes&sort=name';

export function CountryPicker({
  value,
  onSelect,
  error,
  label,
}: CountryPickerProps) {
  const [visible, setVisible] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchCountries = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const response = await fetch(COUNTRIES_API, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Countries API returned HTTP ${response.status}`,
          );
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid countries API response');
        }

        const formatted: Country[] = data
          .filter(
            (item: any) =>
              typeof item?.name === 'string' &&
              typeof item?.alpha2Code === 'string',
          )
          .map((item: any) => {
            const callingCodes: string[] = Array.isArray(
              item.callingCodes,
            )
              ? item.callingCodes
              : [];

            const firstCode = callingCodes.find(
              (code) => typeof code === 'string' && code.trim() !== '',
            );

            return {
              name: item.name,
              code: item.alpha2Code.toUpperCase(),
              flag:
                typeof item.flag === 'string' && item.flag.length > 0
                  ? item.flag
                  : '🏳️',
              phoneCode: firstCode ? `+${firstCode.replace(/^\+/, '')}` : '',
            };
          })
          .filter(
            (country: Country) =>
              country.name.length > 0 && country.code.length === 2,
          )
          .sort((a: Country, b: Country) =>
            a.name.localeCompare(b.name),
          );

        if (formatted.length === 0) {
          throw new Error('No valid countries were returned');
        }

        if (controller.signal.aborted) return;

        setCountries(formatted);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error('Failed to load countries:', err);
        setLoadError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCountries();

    return () => {
      controller.abort();
    };
  }, [retryKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) return countries;

    return countries.filter(
      (country) =>
        country.name.toLocaleLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.phoneCode.includes(query),
    );
  }, [search, countries]);

  const selectedCountry = countries.find(
    (country) => country.name === value,
  );

  const closeModal = () => {
    setVisible(false);
    setSearch('');
  };

  const retryLoading = () => {
    setRetryKey((previous) => previous + 1);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        style={[styles.picker, error && styles.pickerError]}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={label || 'Select country'}
      >
        {selectedCountry ? (
          <View style={styles.selectedRow}>
            <Text style={styles.flag}>{selectedCountry.flag}</Text>

            <Text style={styles.selectedText} numberOfLines={1}>
              {selectedCountry.name}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>اختر الدولة</Text>
        )}

        <Ionicons
          name="chevron-down"
          size={20}
          color={Brand.muted}
        />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر الدولة</Text>

              <Pressable onPress={closeModal} hitSlop={10}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Brand.green}
                />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons
                name="search"
                size={18}
                color={Brand.muted}
              />

              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن دولة..."
                placeholderTextColor={Brand.muted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />

              {search.length > 0 && (
                <Pressable
                  onPress={() => setSearch('')}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Brand.muted}
                  />
                </Pressable>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator
                  size="large"
                  color={Brand.green}
                />
                <Text style={styles.loadingText}>
                  جاري تحميل الدول...
                </Text>
              </View>
            ) : loadError ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={48}
                  color={Brand.muted}
                />

                <Text style={styles.emptyText}>
                  تعذر تحميل الدول
                </Text>

                <Text style={styles.emptySubtext}>
                  تحقق من اتصال الإنترنت وحاول مرة أخرى
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retryLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh"
                    size={18}
                    color={Brand.white}
                  />
                  <Text style={styles.retryButtonText}>
                    إعادة المحاولة
                  </Text>
                </TouchableOpacity>
              </View>
            ) : countries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  لا توجد بيانات للدول
                </Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = item.name === value;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        isSelected && styles.countryItemSelected,
                      ]}
                      onPress={() => {
                        onSelect(item.name);
                        closeModal();
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.countryFlag}>
                        {item.flag}
                      </Text>

                      <View style={styles.countryInfo}>
                        <Text
                          style={[
                            styles.countryName,
                            isSelected && styles.countryNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        {item.phoneCode ? (
                          <Text style={styles.phoneCode}>
                            {item.phoneCode}
                          </Text>
                        ) : null}
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={22}
                          color={Brand.green}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      لا توجد نتائج
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },

  label: {
    color: Brand.greenText,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.mint,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  pickerError: {
    borderColor: Brand.error,
  },

  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  flag: {
    fontSize: 22,
  },

  selectedText: {
    color: Brand.body,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  placeholder: {
    color: Brand.muted,
    fontSize: 15,
  },

  errorText: {
    color: Brand.error,
    fontSize: 12.5,
    marginTop: 4,
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
    maxHeight: '85%',
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.greenText,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.mint,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: Brand.body,
  },

  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: Brand.muted,
    fontSize: 14,
  },

  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    gap: 12,
  },

  countryItemSelected: {
    backgroundColor: Brand.mint,
  },

  countryFlag: {
    fontSize: 26,
  },

  countryInfo: {
    flex: 1,
  },

  countryName: {
    fontSize: 15,
    color: Brand.body,
    fontWeight: '600',
  },

  countryNameSelected: {
    color: Brand.green,
    fontWeight: '800',
  },

  phoneCode: {
    fontSize: 12,
    color: Brand.muted,
    marginTop: 2,
  },

  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },

  emptyText: {
    color: Brand.muted,
    fontSize: 15,
    marginBottom: 4,
    textAlign: 'center',
  },

  emptySubtext: {
    color: Brand.muted,
    fontSize: 13,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.green,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryButtonText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AppTabs() {
  return (
    <View style={styles.container}>
      <Pressable style={styles.tabButton} onPress={() => {}}>
        <Ionicons name="home-outline" size={22} color="#007AFF" />
        <Text style={[styles.tabLabel, styles.activeLabel]}>الرئيسية</Text>
      </Pressable>

      <Pressable style={styles.tabButton} onPress={() => {}}>
        <Ionicons name="compass-outline" size={22} color="#8E8E93" />
        <Text style={styles.tabLabel}>استكشف</Text>
      </Pressable>

      <Pressable style={styles.tabButton} onPress={() => {}}>
        <Ionicons name="person-outline" size={22} color="#8E8E93" />
        <Text style={styles.tabLabel}>حسابي</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 5,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  activeLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from './types';

const TOKEN_KEY = 'rovaya.accessToken';
const USER_KEY = 'rovaya.user';

/** التوكن يُحفظ في التخزين الآمن (Keychain / Keystore) وليس AsyncStorage */
export async function saveSession(token: string, user: AuthUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: AuthUser } | null> {
  const [token, userJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) as AuthUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'conatacoch-session-token';

export const saveSessionToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getSessionToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const clearSessionToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

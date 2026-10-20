const TOKEN_KEY = 'conatacoch-session-token';

export const saveSessionToken = async (token) => window.localStorage.setItem(TOKEN_KEY, token);
export const getSessionToken = async () => window.localStorage.getItem(TOKEN_KEY);
export const clearSessionToken = async () => window.localStorage.removeItem(TOKEN_KEY);

const TOKEN_KEY = 'token';
const USER_KEY = 'usuario';

function storageHasToken(storage) {
  return Boolean(storage.getItem(TOKEN_KEY));
}

export function getAuthStorage() {
  if (storageHasToken(localStorage)) return localStorage;
  if (storageHasToken(sessionStorage)) return sessionStorage;
  return null;
}

export function getStoredAuthToken() {
  return getAuthStorage()?.getItem(TOKEN_KEY) || null;
}

export function getStoredAuthUser() {
  return getAuthStorage()?.getItem(USER_KEY) || null;
}

export function isStoredSessionPersistent() {
  return storageHasToken(localStorage);
}

export function storeAuthSession(token, user, { persistLocal = true } = {}) {
  clearStoredAuthSession();
  const storage = persistLocal ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuthSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }
}

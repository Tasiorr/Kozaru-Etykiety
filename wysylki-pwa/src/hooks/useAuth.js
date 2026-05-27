import { useState, useEffect, useCallback } from 'react';
import { CLIENT_ID, SCOPES } from '../config';

const TOKEN_KEY = 'gauth_token';
const EXPIRY_KEY = 'gauth_expiry';

function loadStoredToken() {
  const t = sessionStorage.getItem(TOKEN_KEY);
  const exp = parseInt(sessionStorage.getItem(EXPIRY_KEY) || '0', 10);
  return t && Date.now() < exp ? t : null;
}

export function useAuth() {
  const [token, setToken] = useState(loadStoredToken);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    setToken(null);
  }, []);

  const login = useCallback(() => {
    setLoading(true);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        setLoading(false);
        if (resp.access_token) {
          const expiry = Date.now() + (resp.expires_in - 60) * 1000;
          sessionStorage.setItem(TOKEN_KEY, resp.access_token);
          sessionStorage.setItem(EXPIRY_KEY, String(expiry));
          setToken(resp.access_token);
        }
      },
    });
    client.requestAccessToken();
  }, []);

  // Wyloguj automatycznie gdy token wygaśnie
  useEffect(() => {
    if (!token) return;
    const expiry = parseInt(sessionStorage.getItem(EXPIRY_KEY) || '0', 10);
    const remaining = expiry - Date.now();
    if (remaining <= 0) { logout(); return; }
    const timer = setTimeout(logout, remaining);
    return () => clearTimeout(timer);
  }, [token, logout]);

  return { token, login, logout, loading };
}

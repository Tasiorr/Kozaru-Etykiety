import { useState, useEffect, useCallback, useRef } from 'react';
import { CLIENT_ID, SCOPES } from '../config';

const CLIENT_SECRET     = import.meta.env.VITE_CLIENT_SECRET || '';
const ACCESS_TOKEN_KEY  = 'gauth_token';
const REFRESH_TOKEN_KEY = 'gauth_refresh';
const EXPIRY_KEY        = 'gauth_expiry';
const HINT_KEY          = 'gauth_hint';
const PKCE_KEY          = 'gauth_pkce';

function loadStoredToken() {
  const t   = localStorage.getItem(ACCESS_TOKEN_KEY);
  const exp = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  return t && Date.now() < exp ? t : null;
}

function saveAccess(accessToken, expiresIn) {
  const expiry = Date.now() + ((expiresIn || 3600) - 60) * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
}

// PKCE helpers
function randomBase64(len = 64) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function redirectUri() {
  return window.location.origin + window.location.pathname;
}

async function startOAuthFlow() {
  const verifier  = randomBase64(64);
  const challenge = await pkceChallenge(verifier);
  sessionStorage.setItem(PKCE_KEY, verifier);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',             CLIENT_ID);
  url.searchParams.set('redirect_uri',          redirectUri());
  url.searchParams.set('response_type',         'code');
  url.searchParams.set('scope',                 SCOPES);
  url.searchParams.set('access_type',           'offline');
  url.searchParams.set('prompt',                'consent');
  url.searchParams.set('code_challenge',        challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  const hint = localStorage.getItem(HINT_KEY);
  if (hint) url.searchParams.set('login_hint', hint);

  console.log('[OAuth] redirect_uri =', redirectUri());
  window.location.href = url.toString();
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem(PKCE_KEY) || '';
  sessionStorage.removeItem(PKCE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  redirectUri(),
      grant_type:    'authorization_code',
      code_verifier: verifier,
    }),
  });
  return res.ok ? res.json() : null;
}

async function refreshWithToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  return res.ok ? res.json() : null;
}

async function fetchHint(accessToken) {
  try {
    const r = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (r.ok) {
      const d = await r.json();
      if (d.email) localStorage.setItem(HINT_KEY, d.email);
    }
  } catch (_) {}
}

export function useAuth() {
  const [token,   setToken]   = useState(loadStoredToken);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const applyData = useCallback((data) => {
    if (!data?.access_token) return false;
    saveAccess(data.access_token, data.expires_in);
    if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    setToken(data.access_token);
    setLoading(false);
    fetchHint(data.access_token);
    return true;
  }, []);

  // Cichy refresh z refresh tokena – bez żadnego okna, czysty fetch
  const silentRefresh = useCallback(async () => {
    if (busy.current) return;
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) return;
    busy.current = true;
    try {
      const data = await refreshWithToken(rt);
      if (!applyData(data)) {
        // refresh token wygasł lub cofnięty → wymuś ponowne logowanie
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        setToken(null);
      }
    } finally {
      busy.current = false;
    }
  }, [applyData]);

  // Na starcie: obsłuż powrót z Google OAuth redirect (?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(true);
      exchangeCode(code).then(applyData);
      return;
    }

    // Brak kodu: jeśli access token wygasł ale jest refresh token → odśwież cicho
    if (!loadStoredToken() && localStorage.getItem(REFRESH_TOKEN_KEY)) {
      setLoading(true);
      silentRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: odśwież 5 min przed wygaśnięciem (gdy tab aktywny)
  useEffect(() => {
    if (!token) return;
    const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
    const delay  = Math.max(expiry - 5 * 60 * 1000 - Date.now(), 0);
    const timer  = setTimeout(silentRefresh, delay);
    return () => clearTimeout(timer);
  }, [token, silentRefresh]);

  // Odśwież gdy app wraca na pierwszy plan (timery zamrożone w tle – iPhone/Safari)
  useEffect(() => {
    function onForeground() {
      if (document.hidden) return;
      const expiry    = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
      const remaining = expiry - Date.now();
      if (remaining < 5 * 60 * 1000) silentRefresh();
    }
    document.addEventListener('visibilitychange', onForeground);
    window.addEventListener('focus', onForeground);
    return () => {
      document.removeEventListener('visibilitychange', onForeground);
      window.removeEventListener('focus', onForeground);
    };
  }, [silentRefresh]);

  const login = useCallback(() => {
    startOAuthFlow();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, login, logout, loading, sessionExpired: false };
}

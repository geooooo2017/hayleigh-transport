/**
 * Browser-only Microsoft Graph upload (personal or work OneDrive) using OAuth 2.0 auth code + PKCE.
 * Register a SPA app in Azure Portal, add redirect URI `{origin}/onedrive-callback`, API perm: Files.ReadWrite.
 * Set `VITE_MS_CLIENT_ID` in `.env`.
 */

const AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH = "https://graph.microsoft.com/v1.0";

export const MS_TOKEN_STORAGE_KEY = "ht_ms_graph_tokens_v1";
export const MS_PKCE_VERIFIER_KEY = "ht_ms_pkce_verifier_v1";
export const MS_OAUTH_STATE_KEY = "ht_ms_oauth_state_v1";

export type StoredGraphTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};

function getClientId(): string | undefined {
  const v = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function isMicrosoftOneDriveConfigured(): boolean {
  return Boolean(getClientId());
}

function randomString(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[arr[i]! % chars.length];
  return s;
}

async function sha256Base64Url(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function oneDriveRedirectUri(): string {
  return `${window.location.origin}/onedrive-callback`;
}

export async function beginMicrosoftSignIn(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error("VITE_MS_CLIENT_ID is not set");
  const verifier = randomString(64);
  sessionStorage.setItem(MS_PKCE_VERIFIER_KEY, verifier);
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(32);
  sessionStorage.setItem(MS_OAUTH_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: oneDriveRedirectUri(),
    response_mode: "query",
    scope: "Files.ReadWrite offline_access User.Read openid profile",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredGraphTokens> {
  const clientId = getClientId();
  if (!clientId) throw new Error("VITE_MS_CLIENT_ID is not set");
  const verifier = sessionStorage.getItem(MS_PKCE_VERIFIER_KEY);
  if (!verifier) throw new Error("Sign-in session expired — try Connect again");
  sessionStorage.removeItem(MS_PKCE_VERIFIER_KEY);
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: oneDriveRedirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(json.error_description || json.error || `Token error ${res.status}`));
  }
  const access = json.access_token as string;
  const refresh = json.refresh_token as string | undefined;
  const expiresIn = Number(json.expires_in) || 3600;
  return {
    access_token: access,
    refresh_token: refresh,
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
  };
}

export function readStoredGraphTokens(): StoredGraphTokens | null {
  try {
    const raw = localStorage.getItem(MS_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredGraphTokens;
    if (!p?.access_token) return null;
    return p;
  } catch {
    return null;
  }
}

export function writeStoredGraphTokens(t: StoredGraphTokens): void {
  localStorage.setItem(MS_TOKEN_STORAGE_KEY, JSON.stringify(t));
}

export function clearStoredGraphTokens(): void {
  localStorage.removeItem(MS_TOKEN_STORAGE_KEY);
}

export async function refreshGraphTokens(tokens: StoredGraphTokens): Promise<StoredGraphTokens> {
  if (tokens.expires_at > Date.now() + 30_000) return tokens;
  const clientId = getClientId();
  if (!clientId || !tokens.refresh_token) {
    throw new Error("Microsoft session expired — connect OneDrive again");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    scope: "Files.ReadWrite offline_access User.Read openid profile",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(json.error_description || json.error || `Refresh failed ${res.status}`));
  }
  const access = json.access_token as string;
  const refresh = (json.refresh_token as string | undefined) ?? tokens.refresh_token;
  const expiresIn = Number(json.expires_in) || 3600;
  const next: StoredGraphTokens = {
    access_token: access,
    refresh_token: refresh,
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
  };
  writeStoredGraphTokens(next);
  return next;
}

/** Upload a file to path under drive root, e.g. `HayleighTransportBackup/2026-04-12T12-00-00Z/file.pdf`. */
export async function uploadBlobToOneDrivePath(accessToken: string, pathUnderRoot: string, blob: Blob): Promise<void> {
  const segments = pathUnderRoot.split("/").filter(Boolean).map((s) => encodeURIComponent(s));
  const pathEncoded = segments.join("/");
  const url = `${GRAPH}/me/drive/root:/${pathEncoded}:/content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/pdf",
    },
    body: blob,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt.slice(0, 280) || res.statusText);
  }
}

export function verifyOAuthState(received: string | null): boolean {
  const expected = sessionStorage.getItem(MS_OAUTH_STATE_KEY);
  sessionStorage.removeItem(MS_OAUTH_STATE_KEY);
  return Boolean(expected && received && expected === received);
}

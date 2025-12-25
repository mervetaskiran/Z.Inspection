/// <reference types="vite/client" />

/**
 * API URL resolution strategy:
 * - DEV: use relative paths (Vite proxy handles forwarding to backend).
 * - PROD: prefer VITE_API_URL, fallback to same-origin.
 */

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, '');

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const API_BASE_URL = (() => {
  // If VITE_API_URL is provided, always use it (dev or prod).
  // This makes local dev deterministic and avoids relying on proxy configuration.
  if (rawApiUrl) {
    const normalized = normalizeBaseUrl(rawApiUrl);
    if (!isHttpUrl(normalized)) {
      throw new Error(
        `❌ VITE_API_URL geçersiz: "${rawApiUrl}". "http://..." veya "https://..." ile başlamalı.`
      );
    }
    return normalized;
  }

  if (import.meta.env.DEV) {
    // In dev, if no explicit base URL is set, rely on Vite proxy/same-origin.
    return '';
  }

  // Production fallback: same origin (useful when frontend is served by backend)
  return '';
})();

export const api = (path: string) => {
  const p = normalizePath(path);
  return `${API_BASE_URL}${p}`;
};

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(api(path), init);
}


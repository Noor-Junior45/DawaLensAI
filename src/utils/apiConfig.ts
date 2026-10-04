import { Capacitor } from '@capacitor/core';

/**
 * Configuration for connecting Vercel frontend or native Capacitor Android app with the Render backend server.
 */

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

export const RENDER_BACKEND_URL = 
  (metaEnv?.VITE_BACKEND_URL) 
    ? String(metaEnv.VITE_BACKEND_URL).replace(/\/+$/, '') 
    : "https://dawasnapai.onrender.com";

/**
 * Resolves API URL.
 * In native Capacitor (Android APK), relative '/api' paths fail because there is no local
 * web server running on https://localhost. On native platforms, requests are automatically routed
 * to the deployed backend server (RENDER_BACKEND_URL).
 * On web, clean relative paths are used so Vite dev proxy or Vercel rewrites work as intended.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    const isNative = Capacitor.isNativePlatform();
    const isCapacitorOrigin = window.location.protocol === 'capacitor:' || 
      (window.location.hostname === 'localhost' && typeof (window as any).Capacitor !== 'undefined');
    if (isNative || isCapacitorOrigin) {
      return `${RENDER_BACKEND_URL}${cleanPath}`;
    }
  }
  return cleanPath;
}

export function getDirectRenderUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${RENDER_BACKEND_URL}${cleanPath}`;
}

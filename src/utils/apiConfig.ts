/**
 * Configuration for connecting Vercel frontend with the Render backend server.
 */

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

export const RENDER_BACKEND_URL = 
  (metaEnv?.VITE_BACKEND_URL) 
    ? String(metaEnv.VITE_BACKEND_URL).replace(/\/+$/, '') 
    : "https://dawalensai.onrender.com";

/**
 * Resolves API URL.
 * Defaults to relative path (which Vercel proxies to Render via vercel.json rewrites),
 * and provides direct fallback to Render URL.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath;
}

export function getDirectRenderUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${RENDER_BACKEND_URL}${cleanPath}`;
}

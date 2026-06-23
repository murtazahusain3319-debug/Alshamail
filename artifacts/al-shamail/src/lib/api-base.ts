const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;

/**
 * API root without trailing slash.
 * - Local dev: `/api` (Vite proxy → localhost API)
 * - Production: direct Render URL so session cookies stay on one origin
 *   (Vercel `/api` rewrites do not forward cross-site session cookies).
 */
export const API_BASE =
  envBase?.replace(/\/$/, "") ||
  (import.meta.env.DEV ? "/api" : "https://alshamail.onrender.com/api");

import { Redis } from "@upstash/redis";

// Lightweight read-through cache on the existing Upstash Redis. Used to memoize
// AI food analysis (by description) and Open Food Facts lookups (by barcode/
// query) — cutting AI cost + latency and making repeat barcode scans instant.
// No-ops cleanly when Upstash env vars aren't configured.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60 * 60 * 24 * 30): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    /* cache is best-effort — never block the request */
  }
}

// Stable cache key from arbitrary text (lowercased, whitespace-collapsed).
export function cacheKey(prefix: string, raw: string): string {
  const norm = raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
  return `cache:${prefix}:${norm}`;
}

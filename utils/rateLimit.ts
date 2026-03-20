/**
 * In-memory sliding-window rate limiter for API routes.
 * Works on Vercel serverless (per-instance) and locally.
 * For distributed rate limiting, replace with Redis/Upstash.
 */

type RateLimitEntry = {
  tokens: number;
  lastRefill: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory bloat
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > windowMs * 2) {
      store.delete(key);
    }
  }
}

export type RateLimitConfig = {
  /** Max requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
};

/**
 * Check if a request is rate limited.
 * Returns { success: true, remaining } or { success: false, retryAfter }.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig
): { success: true; remaining: number } | { success: false; retryAfter: number } {
  const now = Date.now();
  cleanup(config.windowMs);

  const entry = store.get(key);

  if (!entry) {
    store.set(key, { tokens: config.limit - 1, lastRefill: now });
    return { success: true, remaining: config.limit - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refillRate = config.limit / config.windowMs;
  const tokensToAdd = elapsed * refillRate;
  entry.tokens = Math.min(config.limit, entry.tokens + tokensToAdd);
  entry.lastRefill = now;

  if (entry.tokens < 1) {
    const retryAfter = Math.ceil((1 - entry.tokens) / refillRate / 1000);
    return { success: false, retryAfter };
  }

  entry.tokens -= 1;
  return { success: true, remaining: Math.floor(entry.tokens) };
}

/**
 * Extract a client identifier from request headers.
 * Uses X-Forwarded-For (Vercel), then X-Real-IP, then fallback.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

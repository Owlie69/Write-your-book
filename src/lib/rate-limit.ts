// Simple in-memory rate limiter for API endpoints
// Uses a sliding window approach

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Convenience: get client IP from request
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// CSRF token generation and validation
// Tokens are stored server-side in memory, mapped to session/IP
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

export function generateCsrfToken(sessionKey: string): string {
  const token = crypto.randomUUID();
  csrfTokens.set(sessionKey, {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return token;
}

export function validateCsrfToken(
  sessionKey: string,
  token: string
): boolean {
  const entry = csrfTokens.get(sessionKey);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    csrfTokens.delete(sessionKey);
    return false;
  }
  return entry.token === token;
}

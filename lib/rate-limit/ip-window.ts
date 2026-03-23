/**
 * Rate limit פשוט בזיכרון (למופע Node בודד).
 * בפריסה מרובת מופעים או serverless — ההגנה חלקית; לשלב 2: Redis / Upstash.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

const PRUNE_THRESHOLD = 2000;
const PRUNE_AGE_MULT = 2;

export interface IpWindowOptions {
  windowMs: number;
  max: number;
}

export type IpWindowResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkIpWindowRateLimit(key: string, opts: IpWindowOptions): IpWindowResult {
  const now = Date.now();
  const { windowMs, max } = opts;

  if (buckets.size > PRUNE_THRESHOLD) {
    const cutoff = now - windowMs * PRUNE_AGE_MULT;
    for (const [k, v] of buckets) {
      if (v.windowStart < cutoff) {
        buckets.delete(k);
      }
    }
  }

  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (b.count >= max) {
    const retryAfterMs = windowMs - (now - b.windowStart);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  buckets.set(key, { ...b, count: b.count + 1 });
  return { ok: true };
}

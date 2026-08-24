import db from "./db";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Fixed-window, Postgres-backed rate limiter (no Redis, per the approved
 * architecture's infra-agnostic / no-Redis-in-MVP constraint). Expired hits
 * for the given bucket are pruned on each check, so the table stays bounded
 * without needing a scheduled job.
 */
export async function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  return db.transaction(async (trx) => {
    await trx("rate_limit_hits").where({ bucket_key: key }).andWhere("created_at", "<", windowStart).delete();

    const hits = await trx("rate_limit_hits")
      .where({ bucket_key: key })
      .orderBy("created_at", "asc")
      .select<{ created_at: Date }[]>("created_at");

    if (hits.length >= limit) {
      const oldest = hits[0].created_at;
      const retryAfterMs = Math.max(0, oldest.getTime() + windowMs - Date.now());
      return { allowed: false, retryAfterMs };
    }

    await trx("rate_limit_hits").insert({ bucket_key: key });
    return { allowed: true, retryAfterMs: 0 };
  });
}

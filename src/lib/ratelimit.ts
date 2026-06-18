import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting is backed by Upstash Redis so it works across Vercel's
// stateless serverless/edge instances. If the env vars aren't set (e.g. local
// dev before credentials are added), the limiters are null and callers no-op.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// General page traffic — generous, just blocks abusive bursts.
export const pageLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "10 s"),
      prefix: "rl:page",
      analytics: false,
    })
  : null;

// API routes — tighter, protects the Claude/Stripe/Overpass endpoints.
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      prefix: "rl:api",
      analytics: false,
    })
  : null;

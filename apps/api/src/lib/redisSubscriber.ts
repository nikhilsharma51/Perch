import Redis from "ioredis";
import "dotenv/config";

/**
 * Dedicated Redis subscriber connection for pub/sub operations.
 *
 * IMPORTANT: This is a separate connection from the main `redis` client (in redis.ts).
 * A Redis subscriber connection is blocked in subscribe mode — it cannot execute
 * normal commands like SET, GET, or DEL. For pub/sub, we need a dedicated connection
 * that can listen to channels without interfering with the app's locking and caching operations.
 *
 * Both connections use the same REDIS_URL, so they connect to the same Redis instance,
 * but are independent client instances. This is the correct pattern: one connection
 * per responsibility.
 */
export const redisSubscriber = new Redis(process.env.REDIS_URL!);

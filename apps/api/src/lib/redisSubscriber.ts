import Redis from "ioredis";
import "dotenv/config";


export const redisSubscriber = new Redis(process.env.REDIS_URL!);

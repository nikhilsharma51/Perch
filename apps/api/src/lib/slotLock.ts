import {redis} from "./redis";

export async function acquireSlotLock(spaceId: string, startTime: Date): Promise<string | null> {
  const key = `lock:slot:${spaceId}:${startTime.toISOString()}`
  const lockId = crypto.randomUUID()
  // SET key lockId NX PX 8000
  // NX = only set if not exists
  // PX 8000 = expire after 8 seconds
  const result = await redis.set(key, lockId, 'PX', 8000, 'NX')
  return result === 'OK' ? lockId : null
}

export async function releaseSlotLock(spaceId: string, startTime: Date, lockId: string): Promise<void> {
  const key = `lock:slot:${spaceId}:${startTime.toISOString()}`
  // This must be atomic — use a Lua script
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await redis.eval(script, 1, key, lockId)
}
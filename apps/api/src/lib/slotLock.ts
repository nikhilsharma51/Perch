import {redis} from "./redis";

// Acquire a lock for a slot. Returns the lockId if acquired, null if slot is being held by another request.
export async function acquireSlotLock(spaceId: string, startTime: Date): Promise<string | null> {
  const key = `lock:slot:${spaceId}:${startTime.toISOString()}`
  const lockId = crypto.randomUUID()
  // SET key lockId NX PX 8000
  // NX = only set if not exists
  // PX 8000 = expire after 8 seconds
  const result = await redis.set(key, lockId, 'NX', 'PX', 8000)
  return result === 'OK' ? lockId : null
}

// Release a lock — only if the lockId matches (prevents releasing someone else's lock)
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
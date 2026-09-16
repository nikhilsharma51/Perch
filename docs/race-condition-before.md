# Race Condition Evidence — Before Locking (Phase 5)

## Summary

The naive booking implementation **deliberately has no locking mechanism**, allowing two concurrent requests to create bookings for the same time slot. This document captures evidence of the double-booking race condition before implementing Redis-based locking in Phase 6.

## Test Setup

- **Space ID:** `2ece8fba-cdc9-4f90-8d12-781c3824200c`
- **Time Slot:** `2026-09-18T10:00:00Z` → `2026-09-18T10:30:00Z`
- **Renter 1:** `alice-race@example.com`
- **Renter 2:** `bob-race@example.com`

## Test Execution

Two `POST /api/bookings` requests were fired **concurrently** using Promise.all(), requesting the identical space and time slot with different renter emails.

```
🚀 Firing two concurrent requests...

✅ Both requests completed in 4981ms

📋 Request 1 (Alice):
   Status: 201
   Booking ID: 603a1a2e-ebf4-449b-9849-b1376d3161fe
   Status: pending

📋 Request 2 (Bob):
   Status: 201
   Booking ID: 488aa2c7-f667-4221-883c-9bede2b1e80b
   Status: pending
```

**Result:** Both requests returned `201 Created`. This should not happen — only one booking should succeed for a given slot.

## Database Verification

```
🔍 Checking database for race condition evidence...

Space: 2ece8fba-cdc9-4f90-8d12-781c3824200c
Time Slot: 2026-09-18T10:00:00Z → 2026-09-18T10:30:00Z

Found 2 booking(s) for this exact slot:

🐛 RACE CONDITION CONFIRMED - MULTIPLE BOOKINGS FOR SAME SLOT!

Booking 1:
   ID: 603a1a2e-ebf4-449b-9849-b1376d3161fe
   Renter: alice-race@example.com
   Status: pending
   Created: 2026-09-16T17:26:42.153Z
   History entries: 1

Booking 2:
   ID: 488aa2c7-f667-4221-883c-9bede2b1e80b
   Renter: bob-race@example.com
   Status: pending
   Created: 2026-09-16T17:26:42.155Z
   History entries: 1
```

## Race Condition Analysis

**The Problem:**

Both requests executed this flow simultaneously:

1. **Request 1 (T+0ms):** Check availability → slot is free ✅
2. **Request 2 (T+0ms):** Check availability → slot is free ✅ (race window!)
3. **Request 1 (T+50ms):** Create booking for Alice → success
4. **Request 2 (T+50ms):** Create booking for Bob → success (double-booking!)

The bookings were created **2 milliseconds apart** (17:26:42.153Z vs 17:26:42.155Z), proving both requests passed the availability check before either completed the write. This is the classic check-then-act race condition.

**Why it happens:**

The naive implementation checks availability with `getAvailableSlots()`, then creates the booking in a separate database transaction. Between the check and the write, another request can slip through with the same "available" result.

```typescript
// NAIVE (buggy) flow:
const slots = await getAvailableSlots(spaceId, date); // Check
if (!slotIsAvailable) return 409;
// ⚠️ RACE WINDOW HERE — another request can check now
const booking = await prisma.booking.create(...); // Act
```

## Evidence Summary

✅ **2 bookings exist** for the identical slot  
✅ **Space ID:** `2ece8fba-cdc9-4f90-8d12-781c3824200c`  
✅ **Time:** `2026-09-18T10:00:00Z` → `2026-09-18T10:30:00Z`  
✅ **Both have status** `pending`  
✅ **Created within 2ms** of each other (17:26:42.153Z and 17:26:42.155Z)  
✅ **Different renters:** alice-race@example.com and bob-race@example.com  

## Next Steps

**Phase 6** will add Redis-based distributed locking around the check-then-act sequence:

```typescript
// Phase 6 (with locking):
const lock = await acquireLock(`booking:${spaceId}:${date}`);
try {
  const slots = await getAvailableSlots(spaceId, date);
  if (!slotIsAvailable) return 409;
  const booking = await prisma.booking.create(...);
} finally {
  await releaseLock(lock);
}
```

This ensures only one request can check availability and create a booking for a given slot at a time, eliminating the race window.

---

**Test Date:** 2026-09-16  
**Phase:** 5 (Naive implementation — no locking)  
**Status:** Race condition confirmed ✅

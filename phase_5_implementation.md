## Phase 5 — Availability computation and naive booking
### Goal: renters can query open slots, and bookings can be created — without any locking, deliberately

This is the phase where you build the booking flow in its naive, broken form on purpose. You will prove the double-booking race condition exists before fixing it.

### What to build, in order

**1. The state machine (pure function, no database)**

In `apps/api/src/lib/stateMachine.ts`, write two functions using the `VALID_TRANSITIONS` map from `packages/shared`:

```typescript
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid transition: ${from} → ${to}`)
    ;(err as any).status = 409
    throw err
  }
}
```

Write unit tests for this function **now**, before connecting it to anything:
```bash
cd apps/api
npm install -D vitest
```

Create `apps/api/src/lib/stateMachine.test.ts` and test:
- Every legal transition passes
- Every illegal transition throws with a 409 status
- Terminal states (`completed`, `cancelled`, `no_show`) reject all transitions
- At least 12 test cases total

Run `npx vitest`. All tests must pass before you write a single booking route.

**2. Availability computation function**

In `apps/api/src/lib/availability.ts`:

```typescript
export async function getAvailableSlots(spaceId: string, date: Date): Promise<Slot[]>
```

Logic:
1. Fetch the space's open-hours rule for that day of the week
2. Generate all 30-minute slots within those hours (e.g., 09:00–09:30, 09:30–10:00, ...)
3. Fetch all existing bookings for that space on that date with status NOT IN `['cancelled', 'no_show']`
4. Filter out any generated slot whose time range overlaps with an existing booking
5. Return the remaining slots

The overlap check: a slot `[slotStart, slotEnd)` is taken if any booking exists where `booking.startTime < slotEnd AND booking.endTime > slotStart`. This is the standard interval-overlap query — implement it carefully.

This function is also pure enough to unit test. Write two tests: one with no existing bookings (all slots available), one with some bookings (correct slots removed).

**3. Availability API route**

`GET /api/spaces/:spaceId/availability?date=2026-09-10`

This route is **public** — no auth required. A renter browsing a studio hasn't logged in yet. Call the availability function, return the slots.

**4. Booking creation route (naive)**

`POST /api/bookings` (public, or auth-optional for guest checkout):

```
body: { spaceId, startTime, endTime, renterEmail }
```

Do **not** add locking here. The naive version:
1. Check if slot is still available (re-run the availability query)
2. Create a `Booking` with `status: 'pending'`
3. Write a `BookingStatusHistory` row for the `pending` creation
4. Return the booking

**5. Booking status transition route**

`POST /api/bookings/:bookingId/transition` (auth required, role-based):

```
body: { toStatus: 'checked_in' }
```

Flow:
1. Fetch the booking (verify it belongs to a space the requesting user's org owns)
2. Call `assertTransition(booking.status, toStatus)` — throws 409 if illegal
3. Update the booking's status in a transaction that also writes a `BookingStatusHistory` row
4. Return the updated booking

Permissions per transition:
- `pending → cancelled` — renter (their own booking) or staff
- `confirmed → checked_in` — staff only
- `confirmed → cancelled` — staff only (renter-side cancellation will go through a different route in Phase 8, with refund logic)
- `checked_in → completed` — staff only or system
- `confirmed → no_show` — system only (worker, Phase 9)

**6. Reproduce the race condition**

Before adding any lock, deliberately prove the bug exists. Open two terminal windows and fire two concurrent booking requests to the same slot:

```bash
# Terminal 1
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"spaceId":"...","startTime":"2026-09-10T18:00:00Z","endTime":"2026-09-10T18:30:00Z","renterEmail":"alex@test.com"}'

# Terminal 2 — fire at the same time
curl -X POST http://localhost:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"spaceId":"...","startTime":"2026-09-10T18:00:00Z","endTime":"2026-09-10T18:30:00Z","renterEmail":"sam@test.com"}'
```

Check the database — you should see two `pending` bookings for the same slot. Screenshot or save this output. It's the "before" for your README's race-condition write-up.

### Verification gate

- All state machine unit tests pass
- A slot that is already booked does not appear in `/availability` results
- Two bookings for the same slot can be created simultaneously (you have proven the bug)
- An illegal transition (e.g., `completed → confirmed`) returns a 409
- Every booking creation writes a corresponding `BookingStatusHistory` row

### Landmines

- **Don't skip the unit tests on `stateMachine.ts`** — this is the business logic everything else depends on. A bug here means bookings reach wrong states silently, and that's extremely hard to debug weeks later when the state machine is buried under layers of routes and frontend code
- **`BookingStatusHistory` must be written in a transaction with the status update** — if the status update succeeds but the history write fails, you lose the audit trail. Use `prisma.$transaction([...])` everywhere a status changes
- **The availability query's overlap check** — a common mistake is `booking.startTime >= slotStart AND booking.endTime <= slotEnd` (contained-within check), which misses bookings that partially overlap the slot. The correct check is `startTime < slotEnd AND endTime > slotStart` (any overlap)
- **Public availability route** — do not put `requireAuth` on this route. A renter checking availability before signing up or completing checkout must be able to call it. Protecting it creates friction at the worst moment

### What this unlocks

Redis locking (Phase 6) — the lock is only meaningful if you've proven the naked booking creates a race condition. Phase 6's entire value comes from this phase's evidence.

---
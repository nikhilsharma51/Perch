# Perch

A studio and resource booking platform — built for podcast studios, photography studios, and gaming cafés to manage bookable spaces, and for renters to browse availability and book a slot without double-booking it.

This is a full-stack portfolio project. The goal isn't just "a booking app" — it's a vehicle for building and demonstrating the infrastructure patterns that actually show up in production systems: multi-tenancy, distributed locking, background job processing, real-time updates, and role-based access control.

> **Status: Phase 8 of 13 complete.** This README is a running log — I'm updating it as I go, not writing it retroactively at the end. Sections below marked `(pending)` are scaffolded but not real yet.

---

## Tech stack

- **Frontend:** Next.js (`apps/web`)
- **Backend API:** Express (`apps/api`)
- **Worker:** Node background worker for reminders / no-show handling (`apps/worker`) — scaffolded, not yet implemented
- **Database:** Postgres via Prisma
- **Cache / locking:** Redis (locking not yet wired in — see Phase 6 below)
- **Shared types:** `@perch/shared` — Zod schemas + inferred TypeScript types, shared across `web` and `api`
- **Auth:** JWT-based, `bcrypt` for password hashing
- **Payments:** Stripe *(pending — Phase 8)*
- **Monorepo:** pnpm workspaces

---

## Progress log

### Phase 1 — Database foundation ✅
Set up Prisma at the monorepo root (not inside `apps/api`) so the worker can share the same schema and client. Wrote the full schema up front rather than a "start simple" version — every relation the later phases need is already in the migration. Added the `Booking(spaceId, startTime)` composite index early, since every availability query hits this table.

### Phase 2 — Shared types package ✅
Built out `packages/shared` with one Zod schema file per domain (`auth`, `organization`, `space`, `booking`, `staff`) rather than one giant schema file. Exported the booking state machine's `BOOKING_STATUSES` and `VALID_TRANSITIONS` from here too, so the frontend can eventually gate which action buttons show without needing a round-trip to the API just to ask "can I cancel this?".

### Phase 3 — Express API: auth foundation ✅
Signup/login with JWT, `requireAuth` middleware, a reusable Zod-based `validate()` middleware for every route body, and a centralized error handler. Deliberately did **not** apply `express.json()` globally — mounted it at the router level instead, because Stripe webhook signature verification (Phase 8) needs the raw request body, and this is much easier to get right now than to retrofit later.

### Phase 4 — Organizations, multi-tenancy, spaces ✅
Every space belongs to an organization; every user's access to that org is a row in `OrgMembership` with a role (`owner` / `staff`). Added `requireOrgAccess` and `requireOwnerRole` middleware, and made org creation + owner-membership creation a single Prisma transaction so it's never possible to end up with an orphaned org. Verified explicitly that one org's owner gets a 403 trying to touch another org's spaces — this is the boundary the rest of the app leans on, so it got tested by hand before moving on.

### Phase 5 — Availability + naive booking (and proving the bug) ✅
This phase exists specifically to build the booking flow **wrong on purpose**, so the race condition it has is a proven, reproducible fact and not just a theoretical concern for later.

What's in as of this update:
- `stateMachine.ts` — pure `canTransition` / `assertTransition` functions, backed by 12+ unit tests covering every legal/illegal transition and all terminal states
- `getAvailableSlots()` — generates 30-min slots from a space's open hours and filters out any slot that overlaps an existing non-cancelled booking, using a proper interval-overlap check (`start < slotEnd AND end > slotStart`), not the naive "contained within" check that quietly misses partial overlaps
- `GET /api/spaces/:spaceId/availability` — public, no auth, so a renter can browse before signing up
- `POST /api/bookings` — creates a `pending` booking + `BookingStatusHistory` row in one transaction. **Deliberately has no locking.**
- `POST /api/bookings/:bookingId/transition` — auth + role-based, enforces the full permission matrix (renter can cancel their own pending booking; only staff can check someone in; `no_show` is reserved for the system/worker)

**The race condition, reproduced:** fired two concurrent `POST /api/bookings` requests for the identical space/time slot with different renter emails. Both succeeded. The database ended up with two `pending` bookings for the same slot — a real, demonstrated double-booking bug, not a hypothetical one. Evidence saved for the writeup that'll go here once Phase 6 fixes it.

*(This section will get the "before" output and a short explanation dropped in as the actual race-condition writeup — right now this is the placeholder.)*

---

## What's next

- **Phase 6 — Redis distributed lock** *(✅)*: wrap booking creation in a lock keyed on `spaceId + slot`, so the exact bug proven above becomes structurally impossible. This is the fix that everything from here on depends on.
- **Phase 7 — Real-time availability (SSE)** *(✅)*
- **Phase 8 — Stripe payments** *(✅)*
- **Phase 9 — Background worker: reminders + no-show detection** *(pending)*
- **Phase 10 — Docker Compose** *(pending)*
- **Phase 11 — Frontend wiring (owner dashboard + renter booking flow)** *(pending)*
- **Phase 12 — Testing (unit, integration, one Playwright E2E happy path)** *(pending)*
- **Phase 13 — Deployment (Vercel + Railway)** *(pending)*

Full phase-by-phase build plan lives in `BUILD_ROADMAP.md` in this repo.

---

## Running locally

*(This section is still incomplete — Docker Compose isn't wired up until Phase 10, so for now the setup is manual.)*

```bash
# install deps from repo root
pnpm install

# generate Prisma client / run migrations (root-level prisma/)
npx prisma migrate dev

# start the API
cd apps/api
npx tsx src/server.ts
```

`apps/web` and `apps/worker` aren't part of the runnable path yet — the frontend hasn't been wired to the API (Phase 11), and the worker is scaffolded but empty (Phase 9).

---

## Architecture

*(Diagram pending — I will drop in the service graph once Docker Compose (Phase 10) makes the actual service boundaries real, plus an ASCII request-flow diagram for the booking path.)*

---

## Why this project exists

I came from a MERN background and made a deliberate move into building the kind of full-stack infrastructure that shows up in real engineering roles rather than just CRUD apps — multi-tenant access control, a state machine with an actual test suite, a race condition proven before it's fixed, and (soon) a real distributed lock. The interesting part of this project isn't the calendar UI — it's everything underneath it.

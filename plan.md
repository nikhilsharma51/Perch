# Perch — Multi-Tenant Studio & Resource Booking Platform
### A full-stack learning project, planned like a real product

---

## 0. How to read this document

You said you're coming back to web dev after time off and haven't planned a project at this depth before. So this doc is written the way a senior engineer would actually plan a real product before writing code — but every technical term is introduced the first time it's used, in plain language, before we get formal about it.

Read it top to bottom once. Then treat it as a living doc — you'll update the timeline and schema as you actually build, because no plan survives contact with real code untouched. That's normal, not a failure of planning.

---

## 1. What is this project, actually? (No jargon yet)

Imagine three different business owners:

- **Priya** runs a podcast studio with two recording rooms.
- **Marcus** runs a photography studio with one large space and a smaller headshot room.
- **A gaming café owner** rents out 6 high-end gaming rigs by the hour.

Today, all three of them are probably managing bookings with a shared Google Calendar, a WhatsApp group, or a paper diary. It's slow, it's error-prone, and two customers can accidentally get told "yes" for the same 6:00–6:30 PM slot.

**Perch is one platform that all three of them can sign up on independently.** Each of them gets their own private "organization" inside the app — their own spaces, their own prices, their own staff, their own booking calendar. They don't see each other's data at all, even though they're all using the same running application. This is the **multi-tenant** idea: one piece of software, many separate businesses using it, each walled off from the others.

### The two kinds of people who use this app

**1. The Studio Owner (and their staff)**
- Signs up, creates their organization ("Priya's Podcast Studio").
- Adds their spaces ("Room A", "Room B") with hourly pricing, capacity, photos, and open hours.
- Invites staff members who can check people in and manage the calendar, but can't change pricing or billing.
- Watches bookings come in on a live calendar.
- Checks renters in when they arrive, marks no-shows, and can cancel/refund bookings.

**2. The Renter (the customer)**
- Browses a studio's public page, sees available spaces.
- Picks a space, sees a live calendar of open 30-minute slots for the next few days.
- Picks a slot, pays a small deposit to lock it in.
- Shows up, gets checked in by staff.
- After the session, the booking is marked complete automatically (or by staff).
- If they cancel early enough, they get their deposit back automatically. If they cancel last-minute, the studio's cancellation policy decides what happens.

### The moment that makes this a *real* engineering problem, not a CRUD toy

Here's the scenario that separates a portfolio-padding CRUD app from something that actually teaches you distributed-systems thinking:

> Two renters — Alex and Sam — are both looking at Room A's calendar for **6:00–6:30 PM today**. It's the last open slot. Both click "Book This Slot" within the same second.

Without any special handling, here's what happens on a normal database: both requests read "slot is available," both requests write "slot is booked," and now you have **two confirmed bookings for one room at the same time.** This is a classic **race condition** — the outcome depends on timing, and timing is never guaranteed in a system with multiple requests hitting a server at once.

This project is deliberately structured so **you will hit this bug for real**, on your own machine, before we fix it with Redis. That's intentional — it's the fastest way to actually understand *why* the fix exists, instead of copy-pasting a locking pattern you don't trust.

### The full story of one booking, start to finish

1. Sam opens Priya's studio page, sees Room A's calendar (updating live — if someone else books a slot while Sam is looking, it visibly disappears from the calendar without Sam refreshing the page).
2. Sam clicks the 6:00–6:30 PM slot. The system briefly "holds" that slot just for Sam (this is where the Redis lock happens, invisibly, in under a second).
3. Sam is asked to pay a small deposit (say ₹200) to confirm. This goes through a real payment provider (Stripe).
4. Payment succeeds → booking flips from `pending` to `confirmed`. Sam gets an email/notification. A reminder is scheduled for a few hours before the session.
5. Sam shows up. Priya (or her staff) taps "Check In" → booking flips to `checked-in`.
6. After the session ends, the booking auto-flips (or staff manually flips) to `completed`.
7. **Alternate path:** Sam cancels 2 days early → full refund, booking flips to `cancelled`. If Sam cancels 1 hour before the slot, the studio's policy (e.g., "no refunds within 24h") kicks in and Sam gets no refund, or a partial one — configurable by the studio owner.
8. **Alternate path:** Sam never shows up and never cancels → staff marks the booking `no-show` after a grace period.

Every one of those status changes is enforced by the server, not the UI — a renter can't just edit a URL and mark their own booking `completed` to dodge a no-show flag. That server-side enforcement is what we mean later by "state machine."

That's the whole product, in plain language. Everything below is *how* we build it, and *in what order*, so that each technical concept (Docker, Redis, SSE, Stripe, state machines) gets introduced exactly when the project naturally needs it — not all at once on day one.

---

## 2. Why this project is a good fundamentals refresher

You're not building this to look impressive on a resume line — you're building it because each piece forces you to actually *use* a concept instead of reading about it:

| Concept | Why this project forces real understanding |
|---|---|
| Relational data modeling | Multi-tenancy + staff roles + bookings is a genuinely non-trivial schema, not a single `todos` table |
| Server-side state machines | "Can a booking go from `completed` back to `pending`?" — you'll have to actually define and defend these rules |
| Race conditions & distributed locks | You will *cause* a double-booking bug yourself, then fix it — this is the single best way to internalize why Redis locking exists |
| Real-time systems | SSE teaches you the request/response model isn't the only model — servers can push |
| Third-party integration under failure | Stripe webhooks *will* arrive twice sometimes, arrive late, or fail — idempotency is a real production concern, not academic |
| Containerization | You'll add Docker exactly when you have enough moving parts (DB + cache + worker) that "just run it on my machine" stops being simple |

---

## 3. Tech stack (and why each piece, specifically)

| Layer | Choice | Why this one |
|---|---|---|
| Frontend | **Next.js 14/15 (App Router) + TypeScript** | You already know React/Next — this project is the vehicle for backend/systems fundamentals, not for learning a new frontend framework from zero |
| Styling/UI kit | **Tailwind CSS + shadcn/ui** as a base, customized | Fast to build with, but we will *not* leave it looking like generic shadcn — see Section 8 on design |
| Backend API | **Node.js + Express + TypeScript** | Deliberately *not* burying business logic in Next.js API routes. A separate API service is closer to how real multi-service backends work, and matches the Docker Compose architecture you already described |
| ORM | **Prisma** | Type-safe queries, painless migrations, and it generates an ER diagram of your schema for free — useful while you're still learning to reason about relations |
| Database | **PostgreSQL** | Relational integrity matters here (foreign keys between orgs/spaces/bookings), and Postgres is the industry default for this kind of data |
| Cache / Lock / Queue backbone | **Redis** | Three real jobs, not decoration: distributed locking (Section 6), pub/sub for live updates (Section 7), and a job queue for reminders (Section 9) |
| Background jobs | **BullMQ** (Redis-backed queue) running in its own worker process | Reminders need to fire at a scheduled future time — that's a job queue's job, not a `setTimeout` |
| Real-time | **Server-Sent Events (SSE)**, not WebSockets | SSE is simpler and is the *correct* tool here — this is one-directional server→client push (slot availability changes), not bidirectional chat |
| Payments | **Stripe** (PaymentIntents + Webhooks + Refunds, test mode) | Industry standard, excellent docs, and its webhook retry behavior is exactly what teaches idempotency |
| Auth | **Custom email/password + JWT first**, with Auth.js/NextAuth as an optional later swap | Since you're rebuilding fundamentals, implement hashing (bcrypt) and JWT issuing/verification yourself once, so you understand what NextAuth is doing for you if you adopt it later |
| Containerization | **Docker + Docker Compose** | Introduced once the app has enough independent services (web, api, worker, db, redis) that running them all manually becomes annoying — see the timeline for exactly when |
| Validation | **Zod**, shared between frontend and backend via a shared types package | One schema, enforced on both ends, no drift |
| Testing | **Vitest** (unit) + **Supertest** (API integration) + **Playwright** (a handful of critical end-to-end flows) | Not exhaustive coverage — targeted tests on the state machine and the locking logic, since those are where bugs actually hide |
| Deployment | **Vercel** (frontend) + **Railway or Render** (API, Postgres, Redis, worker) | Free/cheap tiers, and Railway/Render both support Docker Compose-like multi-service deploys directly |

---

## 4. High-level architecture

```
                         ┌────────────────────┐
                         │   Renter / Owner    │
                         │   (Browser)          │
                         └─────────┬────────────┘
                                   │ HTTPS
                                   ▼
                    ┌───────────────────────────┐
                    │   Next.js Frontend          │
                    │   (App Router, TS)          │
                    │   - Public studio pages      │
                    │   - Owner dashboard          │
                    │   - SSE client (live slots)  │
                    └─────────────┬─────────────┘
                                  │ REST + SSE
                                  ▼
                    ┌───────────────────────────┐
                    │   Node/Express API          │
                    │   - Auth (JWT)               │
                    │   - Booking state machine    │
                    │   - Redis lock acquire/release│
                    │   - Stripe webhook handler   │
                    │   - SSE broadcast endpoint    │
                    └───┬───────────────┬─────────┘
                        │               │
              ┌─────────▼───┐   ┌───────▼────────┐
              │  PostgreSQL  │   │     Redis        │
              │  (source of  │   │ - Slot locks      │
              │   truth)     │   │ - Pub/Sub (SSE)   │
              └─────────────┘   │ - BullMQ job queue │
                                 └───────┬───────────┘
                                         │
                                 ┌───────▼───────────┐
                                 │  Worker process     │
                                 │  (BullMQ consumer)  │
                                 │  - Sends reminders   │
                                 │  - Auto no-show sweep│
                                 └────────────────────┘

                    ┌───────────────────────────┐
                    │   Stripe (external)         │
                    │   - PaymentIntents           │
                    │   - Webhooks → API            │
                    └───────────────────────────┘
```

**The one rule that matters most:** Postgres is the only source of truth for "is this booking real." Redis never stores a booking — it only stores a *temporary lock* ("someone is in the middle of booking this slot, wait") and a *pub/sub message* ("a booking just changed, tell connected clients"). If Redis died right now, no booking data would be lost — you'd just lose live-update pushes and momentarily risk a race condition. That distinction (source of truth vs. coordination layer) is one of the most useful mental models you'll take out of this project.

---

## 5. Data model

### Entities and relationships (plain-language first)

- An **Organization** is a studio business (Priya's Podcast Studio). It has one owner and any number of staff.
- A **User** can be a studio owner, staff member, or renter — the *same* user record, but their relationship to an organization determines their role.
- **OrgMembership** is the join table that says "this user belongs to this org with this role" (`owner` / `staff`).
- A **Space** belongs to one Organization (Room A, Room B).
- **AvailabilityRules** define a space's normal open hours per day of week (e.g., Room A is open 9 AM–9 PM every day).
- A **Booking** is the core object: one renter, one space, one time window, one status.
- **BookingStatusHistory** is an audit trail — every status change is logged with who changed it and when, so disputes ("I never marked that a no-show") are answerable.
- A **Payment** record tracks the Stripe PaymentIntent/refund tied to a booking.
- A **ReminderJob** tracks scheduled notifications tied to a booking.

### Schema (Prisma-style, simplified)

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())

  members   OrgMembership[]
  spaces    Space[]
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())

  memberships  OrgMembership[]
  bookings     Booking[]        @relation("RenterBookings")
}

model OrgMembership {
  id        String   @id @default(uuid())
  orgId     String
  userId    String
  role      Role     // owner | staff

  org       Organization @relation(fields: [orgId], references: [id])
  user      User         @relation(fields: [userId], references: [id])

  @@unique([orgId, userId])
}

enum Role {
  owner
  staff
}

model Space {
  id          String   @id @default(uuid())
  orgId       String
  name        String
  type        String   // podcast | photography | gaming
  hourlyRate  Int      // in smallest currency unit (paise/cents)
  depositRate Int      // deposit amount required to confirm
  capacity    Int
  imageUrl    String?
  createdAt   DateTime @default(now())

  org         Organization @relation(fields: [orgId], references: [id])
  bookings    Booking[]
}

model Booking {
  id           String        @id @default(uuid())
  spaceId      String
  renterUserId String
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(pending)
  amount       Int
  depositPaid  Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  space        Space @relation(fields: [spaceId], references: [id])
  renter       User  @relation("RenterBookings", fields: [renterUserId], references: [id])

  history      BookingStatusHistory[]
  payments     Payment[]

  @@index([spaceId, startTime])
}

enum BookingStatus {
  pending
  confirmed
  checked_in
  completed
  cancelled
  no_show
}

model BookingStatusHistory {
  id         String   @id @default(uuid())
  bookingId  String
  fromStatus BookingStatus?
  toStatus   BookingStatus
  changedBy  String   // userId or "system"
  changedAt  DateTime @default(now())

  booking    Booking @relation(fields: [bookingId], references: [id])
}

model Payment {
  id                String   @id @default(uuid())
  bookingId         String
  stripePaymentId   String   @unique
  amount            Int
  type              String   // deposit | refund
  status            String   // succeeded | failed | pending
  createdAt         DateTime @default(now())

  booking           Booking @relation(fields: [bookingId], references: [id])
}
```

**Slot representation decision:** rather than pre-generating rows for every possible 30-minute slot (which bloats the table and needs constant regeneration), availability is *computed on the fly*: take a space's `AvailabilityRules`, subtract out any existing `Booking` rows that overlap a given day, and what's left is "open." This is simpler to reason about and is the more common real-world pattern. Bookings are the only thing actually stored.

---

## 6. The state machine (server-enforced, not UI-enforced)

```
        ┌─────────┐   payment success    ┌───────────┐
        │ pending │────────────────────▶│ confirmed  │
        └────┬────┘                      └─────┬──────┘
             │ timeout / renter cancel          │
             ▼                                  │ staff checks renter in
        ┌───────────┐                           ▼
        │ cancelled │◀──── renter cancels ┌─────────────┐
        └───────────┘   (within policy)   │ checked_in  │
                                           └──────┬───────┘
                                                  │ session ends
                                                  ▼
                                           ┌────────────┐
                                           │ completed  │
                                           └────────────┘

        confirmed ──(grace period passes, never checked in)──▶ no_show
```

Rules to hard-code on the **server**, never trusted from the client:

- Only these exact transitions are legal. Every other combination (e.g., `completed → confirmed`) is rejected with a 409 error, and logged.
- `pending → confirmed` only fires from the Stripe webhook handler, never from a client-side "I paid" call — you never trust the client to tell you payment succeeded.
- Cancellation refund logic branches on **how much time is left before `startTime`**, using the org's configured cancellation-window policy (e.g., ≥24h → full refund, <24h → no refund). This branch lives entirely server-side.
- `confirmed → no_show` is only ever triggered by the background worker's sweep job (Section 9), never manually forced by a client request outside the staff dashboard's authenticated check-in endpoint.
- Every transition writes a `BookingStatusHistory` row — this is your audit trail and also your debugging tool when something looks wrong later.

Build this as a small, isolated function early — e.g. `canTransition(current, next): boolean` plus `applyTransition(...)` — and unit test it directly. This is the single highest-value piece of code to get right and to actually test, because every other feature depends on it behaving correctly.

---

## 7. Where Redis actually earns its place

Redis shows up for three distinct, real jobs — not just "because the spec said so."

### 7a. Distributed lock on booking (the race condition fix)

**The problem, concretely:** two API requests (Alex booking, Sam booking) both check "is 6:00–6:30 PM free?" at nearly the same instant, both see "yes," and both proceed to create a booking.

**The fix — a lock, using Redis `SET ... NX ... PX`:**

```
key = lock:slot:{spaceId}:{startTimeISO}

SET key <requestId> NX PX 8000
```

- `NX` = only set this key if it doesn't already exist. If Sam's request got there first, Alex's `SET` fails immediately — Alex's request knows someone else is mid-booking and can retry briefly or fail with "just booked, pick another slot."
- `PX 8000` = the lock auto-expires after 8 seconds. This is critical: if the server crashes mid-booking, you don't want a slot locked forever.
- The `<requestId>` value matters when *releasing* the lock — you should only delete the lock if the value matches the ID that set it (otherwise Alex's slow request could accidentally release a lock that now belongs to a completely different, later request). This is a small Lua script or a compare-and-delete pattern — a good implementation detail to actually implement yourself rather than pull from a library, since it's the crux of what makes the lock *safe*.

For a single Redis instance (which is all you need for a portfolio project), this `SET NX PX` pattern is sufficient. The full **Redlock** algorithm (acquiring the lock across multiple independent Redis nodes with quorum) exists for when a single Redis instance itself could be a single point of failure in production at scale — worth reading about and mentioning you understand *why* it exists, but you don't need to implement multi-node Redlock here. Document that distinction explicitly in your README; it shows you understand the trade-off rather than not knowing it exists.

### 7b. Pub/Sub, feeding the live availability feed

When a booking is created/cancelled, the API publishes a small message (`{"spaceId": "...", "date": "..."}`) to a Redis channel. Every API instance holding open SSE connections for that space is subscribed to that channel and pushes an update to its connected browsers. (With one API instance this feels like overkill, but it's what makes the design correct if you ever ran two API instances behind a load balancer — worth building it this way for the learning value.)

### 7c. Job queue backbone for the worker (BullMQ)

BullMQ stores scheduled jobs ("send a reminder at 5:30 PM for the 6:00 PM booking") in Redis and a separate worker process picks them up when they're due. This is Section 9.

---

## 8. Real-time updates (SSE)

- Endpoint: `GET /api/spaces/:id/availability/stream`
- The browser opens a long-lived HTTP connection via `EventSource`. The server keeps it open and writes small `data: {...}\n\n` messages whenever that space's availability changes (from Redis pub/sub, Section 7b).
- On the frontend, the calendar component listens for these events and re-renders just the affected slot, without a page refresh or polling.
- **Why SSE and not WebSockets:** you only need server→client push here (availability changed), never client→server messages over the same connection. SSE is simpler to implement, works over plain HTTP, and auto-reconnects in the browser by default. Save WebSockets for a future project that actually needs bidirectional communication (e.g., chat).

---

## 9. Payments (Stripe) and why the failure cases matter more than the happy path

- On booking creation (`pending`), the API creates a Stripe **PaymentIntent** for the deposit amount and returns its `client_secret` to the frontend, which uses Stripe's hosted payment UI to collect card details. Your server never touches raw card numbers — this is the correct and required pattern.
- Stripe calls your **webhook endpoint** (`POST /api/webhooks/stripe`) when the payment actually succeeds or fails — this is the *only* trusted signal to move `pending → confirmed`.
- **Idempotency is the real lesson here.** Stripe explicitly retries webhook deliveries if your endpoint doesn't respond fast enough or returns an error — meaning the *same* `payment_intent.succeeded` event can legitimately arrive twice. If your handler blindly does "mark this booking confirmed and send a confirmation email" every time it receives that event, a retried webhook sends the customer two confirmation emails and potentially double-processes state. Fix: before processing, check whether you've already recorded a `Payment` row with that Stripe event/payment ID; if so, return `200 OK` immediately and do nothing else. This is a five-line check that represents a genuinely important production concept.
- Refunds: triggered by your own cancellation endpoint (not a webhook), calling Stripe's Refund API conditionally based on the cancellation-window policy from Section 6. The refund's *result* also arrives via webhook (`charge.refunded`) — update your `Payment` record from that event, not from the initial API call's response, since the initial call only confirms the refund was *requested*, not necessarily completed.
- Use Stripe **test mode** and their documented test card numbers throughout — no real money, real webhook behavior.

---

## 10. Background worker (reminders + no-show sweep)

A separate Node process (its own `worker` container in Docker Compose) that:

1. Consumes a BullMQ queue populated when a booking is confirmed — schedules a delayed job for e.g. "2 hours before `startTime`," which sends a reminder notification (console log or a real email via something like Resend — your call on fidelity).
2. Runs a recurring sweep job (every few minutes) that finds `confirmed` bookings whose `startTime` plus a grace period (e.g., 15 minutes) has passed with no check-in, and transitions them to `no_show` through the same `applyTransition` function from Section 6 — reused, not duplicated.

This worker is what makes the Docker Compose file actually meaningful — it's a genuinely separate long-running process from your API, which is exactly the kind of service Compose is designed to orchestrate alongside the DB and cache.

---

## 11. Docker — when it actually enters the picture

You do **not** start this project with Docker. Docker is introduced once you have enough independently-moving pieces that running everything manually by hand becomes the actual pain it's meant to solve — see Phase 4 in the timeline. Before that, run Postgres and Redis locally (or via a single lightweight `docker run` each, which isn't the same as orchestrating the full stack) so you're not fighting infrastructure while you're still nailing down your schema and API.

Final `docker-compose.yml` shape (introduced at Phase 4, expanded at Phase 6):

```yaml
services:
  web:
    build: ./apps/web
    ports: ["3000:3000"]
    depends_on: [api]

  api:
    build: ./apps/api
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/Perch
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]

  worker:
    build: ./apps/worker
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/Perch
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: Perch
    volumes: ["pgdata:/var/lib/postgresql/data"]
    ports: ["5432:5432"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

volumes:
  pgdata:
```

`depends_on` here only controls *start order*, not "wait until Postgres is actually ready to accept connections" — a real thing you'll hit and have to solve (a wait-for-it script or retry logic in your API's DB connection code). Expect this and don't be thrown by it; it's a normal Docker Compose gotcha, not a mistake in your setup.

---

## 12. UI/UX plan

### Design research process (do this before writing UI code, not after)

1. **Mobbin** — search "booking" and "calendar" flows. You're specifically looking at: how do real apps show a time-slot grid, how do they show a slot that just became unavailable, how do they structure the payment-confirmation step. Screenshot 8–10 flows you actually like.
2. **Godly** — browse for studio/creative-brand landing page aesthetics. This is for the *public marketing page* of a studio (the page a renter lands on before they even see the booking calendar) — bold typography, strong imagery, personality. This page should not look like an admin dashboard.
3. **IBM Carbon Design System** (open source, carbondesignsystem.com) — this is your reference for the *owner/staff dashboard side* of the app: data tables, form layouts, status tags/badges, date pickers. Carbon is built for exactly this kind of dense, functional, enterprise-facing UI, and studying a real production design system (not just a component library) is valuable on its own.

The split matters: **the marketing/booking side should feel like Godly** (expressive, brand-driven) and **the owner dashboard should feel like Carbon** (dense, clear, functional). Trying to make one visual language do both jobs is how these apps end up looking generic — deliberately treat them as two different design problems.

### Core screens

| Screen | Audience | Design language |
|---|---|---|
| Studio public/marketing page | Anyone | Godly-inspired |
| Space booking calendar (live slots) | Renter | Godly-inspired, but calendar UX patterns from Mobbin |
| Booking confirmation + payment | Renter | Clean, minimal, trust-focused |
| Booking status page ("Your booking") | Renter | Minimal |
| Owner dashboard home (today's bookings) | Owner/Staff | Carbon-inspired |
| Space & pricing management | Owner | Carbon-inspired |
| Staff management / roles | Owner | Carbon-inspired |
| Check-in view (today's schedule, tap to check in) | Staff | Carbon-inspired, optimized for fast taps |

### Component base

Tailwind CSS + shadcn/ui gives you accessible, unstyled-enough primitives (dialogs, dropdowns, date pickers) so you're not reinventing accessibility from scratch — but the visual identity (color, type, spacing rhythm, the calendar grid itself) should come from your Mobbin/Godly/Carbon research, not from shadcn's defaults left untouched. If two portfolio projects both use default shadcn styling, they look like the same app — avoid that.

---

## 13. Repository structure

```
Perch/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/           # Express + TS backend
│   └── worker/        # BullMQ reminder/no-show worker
├── packages/
│   └── shared/         # Zod schemas + shared TS types used by web + api
├── infra/
│   └── docker-compose.yml
├── prisma/
│   └── schema.prisma
└── README.md
```

A monorepo (even a simple one, using npm/pnpm workspaces — you don't need Turborepo/Nx for this scale) keeps your Zod validation schemas shared between frontend and backend instead of duplicated and drifting.

---

## 14. Timeline (12 weeks, adjustable pace)

This assumes part-time hours around other commitments. Each phase names what you'll actually be able to *demo* at the end of it — that's your real progress marker, not lines of code.

### Phase 0 — Fundamentals refresher & setup (Week 1)
- Refresh: TypeScript basics, Next.js App Router data fetching, Express routing/middleware, Postgres basics (joins, indexes), Prisma basics.
- Do the design research (Section 12) and produce rough wireframes (even in Excalidraw/Figma) for the 8 core screens.
- Scaffold the monorepo, set up Prisma with local Postgres (no Docker yet), get a single "hello world" API route talking to the DB.
- **Demo:** empty app that runs, connects to a real database, deploys nothing yet.

### Phase 1 — Core domain, no auth yet (Week 2)
- Build Organization, Space CRUD with a single hardcoded org (skip multi-tenancy and auth complexity for now — get the shapes right first).
- Basic owner-side UI: create/edit a space.
- **Demo:** you can create a studio, add spaces with pricing, see them listed.

### Phase 2 — Auth & real multi-tenancy (Week 3)
- Implement email/password signup/login, bcrypt hashing, JWT issuing + middleware to verify it.
- Add `OrgMembership`, role checks (`owner` vs `staff`), and scope every query by the authenticated user's org.
- **Demo:** two different signed-up owners each see only their own spaces.

### Phase 3 — Naive booking flow (Week 4)
- Renter-facing calendar UI (computed availability, no locking yet).
- Booking creation endpoint, straight to `pending`, no payment yet.
- **Deliberately try to break it:** open two browser tabs, book the same slot as fast as you can in both. Watch it double-book. This is the point — confirm you've actually hit the bug before fixing it.
- **Demo:** a working but *unsafe* booking flow, and a documented, reproduced bug.

### Phase 4 — State machine + Dockerize (Week 5)
- Build and unit-test `canTransition`/`applyTransition` (Section 6) and wire it into the booking endpoints.
- Add `BookingStatusHistory`.
- Write the initial `docker-compose.yml` (web, api, db) and move off manually-run Postgres. This is the natural point to introduce Docker — you now have a real schema and a real app depending on the DB being consistently configured.
- **Demo:** whole app boots with `docker compose up`, booking statuses enforce legal transitions only.

### Phase 5 — Redis distributed lock (Week 6)
- Add Redis to Compose.
- Implement the `SET NX PX` lock around booking creation (Section 7a).
- Re-run your Phase 3 double-booking reproduction — confirm it's now fixed, and that the loser of the race gets a clean "just booked" error instead of a silent double-booking.
- **Demo:** the exact bug from Phase 3, now provably fixed, with a short write-up of before/after for your README.

### Phase 6 — Real-time SSE (Week 7)
- Redis pub/sub on booking status changes, SSE endpoint, frontend `EventSource` wiring.
- **Demo:** two browser windows side by side — book in one, watch the slot disappear live in the other, no refresh.

### Phase 7 — Stripe payments (Week 8)
- PaymentIntent creation, Stripe Elements on the frontend, webhook handler with idempotency (Section 9), cancellation-window refund logic.
- Test using Stripe CLI to simulate webhook retries/failures on purpose.
- **Demo:** a booking that requires a real (test-mode) card payment to confirm, and a refund flow that respects the cancellation policy.

### Phase 8 — Worker: reminders + no-show sweep (Week 9)
- BullMQ queue + worker container in Compose.
- Scheduled reminder job on booking confirmation.
- Recurring no-show sweep job.
- **Demo:** confirm a booking, watch a reminder job get scheduled (visible in logs or a BullMQ dashboard like Bull Board); manually backdate a test booking and watch the sweep mark it `no_show`.

### Phase 9 — UI/UX pass (Week 10)
- Apply the Godly-inspired treatment to marketing/booking screens and the Carbon-inspired treatment to the dashboard, using your Phase 0 research and wireframes.
- Loading states, empty states, error states, mobile responsiveness pass.
- **Demo:** the app looks like a real product, not a wireframe with Tailwind defaults.

### Phase 10 — Testing & hardening (Week 11)
- Unit tests: state machine, lock acquire/release logic.
- Integration tests: booking API happy path + the double-booking race (can you write an automated test that fires two concurrent requests and asserts only one wins?).
- A handful of Playwright E2E tests for the critical renter flow.
- Basic rate limiting on booking creation and auth endpoints.
- **Demo:** a test suite you'd actually trust before deploying.

### Phase 11 — Deployment & polish (Week 12)
- Deploy web to Vercel, api/worker/db/redis to Railway or Render.
- Environment variable audit, production Stripe webhook secret, CORS lockdown.
- Write the README: architecture diagram, the double-booking story with before/after, how to run locally, what you'd do differently at scale (multi-node Redlock, read replicas, etc.).
- Record a 2–3 minute demo video/GIF walking through the double-booking fix and the live SSE update — this is your single best portfolio artifact from this whole project.
- **Demo:** a live URL, a real README, a short video that tells the "I found and fixed a real race condition" story — this is the story that actually lands in interviews.

---

## 15. Definition of done (what "finished" means here)

- [ ] Two organizations can independently manage spaces/staff/bookings with no data leaking between them.
- [ ] A booking cannot reach an illegal status transition through any API call, verified by tests.
- [ ] The double-booking race condition is reproducibly fixed and documented with before/after evidence.
- [ ] Availability updates live in a second browser tab without a refresh.
- [ ] A booking requires successful payment to become `confirmed`, and a duplicated webhook event does not double-process it.
- [ ] Cancellation refund amount correctly depends on how close to the slot start time the cancellation happens.
- [ ] A confirmed booking with no check-in is automatically marked `no_show` after its grace period.
- [ ] The entire stack runs via `docker compose up` on a clean machine.
- [ ] Deployed and reachable at a public URL, with a README that explains the architecture and the race-condition story.

---

## 16. Stretch goals (only after Section 15 is fully done)

- Multi-node Redlock instead of single-instance locking, with a short write-up on why/when it matters.
- Waitlist: if a slot is fully booked, let a renter join a waitlist and get notified (another good BullMQ + SSE use case) if it opens up.
- Staff-specific calendars if a space needs a specific staff member assigned (e.g., a specific photographer).
- Recurring bookings (weekly podcast recording slot).
- Analytics dashboard for owners (utilization rate per space, revenue over time).

---

*Start with Phase 0. Don't skip straight to Docker or Redis because they're the "interesting" parts — the double-booking bug only means something if you've actually built the naive version first and watched it fail.*
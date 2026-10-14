<div align="center">

# Perch

**A studio and resource booking platform built for creators and studios.**

Perch lets podcast studios, photography studios, and gaming cafés manage bookable spaces and prevent double-booking. Renters browse availability and book a slot without conflicts. Built to demonstrate multi-tenancy, distributed locking, real-time updates, and role-based access control—the infrastructure patterns that show up in production systems.

[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Express%20%7C%20Prisma%20%7C%20Postgres%20%7C%20Redis-61DAFB)](#tech-stack)
[![Status](https://img.shields.io/badge/status-Phase%2010-blue)](#progress-log)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The problem

Studios, podcast spaces, and gaming cafés have no standard way to let renters book available slots. Spreadsheets and manual coordination lead to double-bookings. Manual invoicing is time-consuming. No real-time availability means renters call or email to check if a slot is free.

Perch solves this with a single platform: studios publish their spaces and open hours, renters see real-time availability, book instantly, and get confirmation. Studios manage staff, view upcoming bookings, and never double-book again.

## What it does

| Feature | For | Purpose |
| --- | --- | --- |
| **Multi-tenant dashboards** | Studios/owners | Manage spaces, staff, and bookings; view real-time calendar; set hourly rates and deposits |
| **Real-time availability** | Renters | See which slots are free right now; no double-booking thanks to Redis distributed locks |
| **Public booking flow** | Renters | Browse studios, view spaces, select a time, pay a deposit via Stripe, get instant confirmation |
| **Role-based access** | Studios | Owner manages the space; staff check people in and manage the day |
| **Refund logic** | Studios | Flexible cancellation policy: free cancellation up to 24 hours before, automatic refunds via Stripe |
| **Public studio pages** | Everyone | Each studio gets a public landing page showing available spaces (no login required) |

## Tech stack

| Layer | Technology | Role |
| --- | --- | --- |
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS | Owner dashboard, renter booking flow, public studio pages |
| **API** | Express, TypeScript, Prisma ORM | REST API with auth middleware, role-based access control, Stripe webhooks |
| **Database** | PostgreSQL via Prisma | Orgs, users, spaces, bookings, staff, SSE subscriptions |
| **Locking** | Redis | Distributed lock on `(spaceId, slot)` to prevent double-booking at database level |
| **Real-time** | Server-Sent Events (SSE) | Renter calendar updates when availability changes; no polling |
| **Payments** | Stripe | Deposit collection, refund processing, webhook handling |
| **Hosting** | Vercel (frontend), Railway (backend) | Production deployment |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Frontend                            │
│     ┌──────────────────────────────────────────────┐         │
│     │ Next.js App (Vercel)                         │         │
│     ├──────────────────────────────────────────────┤         │
│     │ /dashboard    → owner: spaces, staff, bookings         │
│     │ /studios      → renter: browse and book               │
│     │ /auth         → signup, login                         │
│     │ /bookings/:id → renter: view booking status           │
│     └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                          Backend                             │
│     ┌──────────────────────────────────────────────┐         │
│     │ Express API (Railway)                        │         │
│     ├──────────────────────────────────────────────┤         │
│     │ POST /api/auth/{signup,login}                │         │
│     │ POST /api/organizations                      │         │
│     │ GET  /api/organizations/:orgId/spaces        │         │
│     │ POST /api/bookings (with Redis lock)         │         │
│     │ GET  /api/spaces/:id/availability (SSE)      │         │
│     │ POST /api/webhooks/stripe                    │         │
│     └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
      ↓ Prisma ORM              ↓ Redis lock              ↓ Stripe
   ┌──────────────┐          ┌─────────┐          ┌──────────────┐
   │ PostgreSQL   │          │ Redis   │          │ Stripe API   │
   │ (Railway)    │          │(Railway)│          │              │
   └──────────────┘          └─────────┘          └──────────────┘
```

## Why this project exists

This is a portfolio project. The goal isn't "a booking app"—it's a vehicle for building and demonstrating the infrastructure patterns that show up in real engineering roles:

- **Multi-tenancy**: Every space belongs to an org; every user's access is a row in `OrgMembership` with a role. The `requireOrgAccess` middleware enforces the boundary; a staff member in one org cannot touch another org's spaces.
- **Distributed locking**: Phase 6 proved the race condition (two users booking the same slot simultaneously). Phase 6 also fixed it with a Redis lock on `spaceId + slot`. Every booking attempt acquires the lock before checking availability, ensuring atomicity.
- **Real-time updates**: SSE stream on `/api/spaces/:id/availability/stream` pushes new availability to the browser as soon as a booking is confirmed. No refresh button required.
- **State machine with tests**: `BOOKING_STATUSES` and `VALID_TRANSITIONS` are exported from shared types and tested—not just hardcoded in the API. The frontend can gate which buttons show without calling the API.
- **Role-based access control**: Owners can invite staff, set roles, and staff members see only what their role permits. A staff member opening the spaces page gets a 403 error.
- **Refund logic**: Stripe webhook processes refunds; cancellation eligibility is a 24-hour window before start time. Both the API and frontend enforce this consistently.

## Progress log

### Completed

- **Phase 1** — Database foundation: Prisma schema, migrations, all tables
- **Phase 2** — Shared types: Zod schemas, inferred types, state machine exported to frontend
- **Phase 3** — Auth foundation: Signup, login, JWT middleware, `requireAuth`
- **Phase 4** — Multi-tenancy: Orgs, memberships, roles, `requireOrgAccess` + `requireOwnerRole` middleware
- **Phase 5** — Availability + naive booking: Proven the race condition with concurrent requests
- **Phase 6** — Redis distributed lock: Fixed the race condition; booking creation is now atomic
- **Phase 7** — Real-time availability (SSE): Renter calendar updates instantly when availability changes
- **Phase 8** — Stripe payments: Deposit collection, refund processing, webhook handling
- **Phase 9** — Background worker (skipped): Intentionally deferred; reminders/no-show detection not prioritized
- **Phase 10** — Frontend error handling, loading states, form validation:
  - Error handling foundation: `ApiError` class, error classification helpers, `ErrorBanner` and `PermissionDenied` components
  - Loading states: Reusable `Skeleton` component, `EmptyState` component for all lists
  - Form validation: Client-side Zod validation, `FieldError` component, field-specific inline errors
  - Dashboard home, spaces, staff, bookings, booking drawer all updated with error UI
  - Settings page added (organization name/slug edit)
  - Logo integrated into navigation and studio pages

### Current state

- All backend phases complete; API fully functional
- Frontend dashboard complete (home, spaces, staff, bookings, calendar, settings)
- Public renter booking flow complete (studios list, space details, checkout with Stripe, confirmation with .ics download, booking status page with cancel)
- Error handling and loading states integrated across dashboard and public pages
- 14 routes registered, all TypeScript clean, builds successfully

## Running locally

You need three services: PostgreSQL, Redis, and the application code.

```bash
# 1. Install dependencies from repo root
pnpm install

# 2. Set up database
cd prisma
npx prisma migrate dev
npx prisma studio  # optional: browse tables at localhost:5555

# 3. Start the API server
cd apps/api
npm run dev  # runs on http://localhost:4000

# 4. In another terminal, start the frontend
cd apps/web
npm run dev  # runs on http://localhost:3000
```

Then:
- Open http://localhost:3000
- Sign up with any email/password
- Create an organization
- Add spaces and set open hours
- Go to http://localhost:3000/studios to browse and book as a renter

## File structure

```
perch/
├── apps/
│   ├── api/                    # Express server
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints: auth, orgs, spaces, bookings, webhooks
│   │   │   ├── middleware/    # authMiddleware, requireOrgAccess, requireOwnerRole, validate
│   │   │   └── lib/           # Prisma client, currency helpers, utilities
│   │   └── package.json
│   │
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # App Router pages
│   │   │   ├── (dashboard)    # Protected owner dashboard
│   │   │   ├── (auth)         # Login/signup pages
│   │   │   ├── studios        # Public renter booking flow
│   │   │   ├── bookings       # Public booking status page
│   │   │   └── page.tsx       # Landing page
│   │   │
│   │   ├── components/         # Reusable React components
│   │   │   ├── ui/            # Base components: Button, Dialog, Toast, ErrorBanner, etc.
│   │   │   ├── dashboard/     # Dashboard-specific: Header, Sidebar, SpaceForm, etc.
│   │   │   └── hero/          # Landing page: Nav, CTA sections, etc.
│   │   │
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts         # Typed API client
│   │   │   ├── currency.ts    # Display/storage unit conversion
│   │   │   └── utils.ts       # Tailwind class merge, general helpers
│   │   │
│   │   ├── hooks/             # React hooks
│   │   │   ├── useApiError.ts # Error handling hook
│   │   │   └── useSlotStream.ts # SSE subscription hook
│   │   │
│   │   ├── context/           # React Context
│   │   │   └── AuthContext.tsx # Auth state, user, login/logout/signup
│   │   │
│   │   ├── tailwind.config.ts # Design tokens
│   │   └── globals.css        # Global styles
│   │
│   └── worker/                 # Background worker (scaffolded, not implemented)
│
├── packages/
│   └── shared/                 # Shared types and validation
│       └── src/
│           ├── schemas/       # Zod schemas: auth, org, space, booking, staff
│           └── types/         # Booking state machine constants
│
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/                     # Static assets
│   ├── logo.png               # Perch logo
│   └── images/
│
├── BUILD_ROADMAP.md           # Backend implementation phases 1–9
├── FRONTEND_ROADMAP.md        # Frontend implementation phases F1–F10
├── UI_DESIGN.md               # Design tokens, color palette, typography
├── PROMPT.md                  # Current work assignment
└── README.md                  # This file
```

## Patterns and conventions

### API Client
Every API call goes through `lib/api.ts`. No raw `fetch()`:
```ts
// ✅ Good
const response = await api.spaces.list(orgId)

// ❌ Bad
const response = await fetch(`/api/organizations/${orgId}/spaces`)
```

### Error Handling
Use the `useApiError` hook to handle read/mutation errors:
```ts
const { handleError } = useApiError()

try {
  await api.spaces.create(orgId, data)
} catch (err) {
  handleError(err, { setFieldErrors, setPageError })
}
```

Errors are classified as network, validation, forbidden, server, or unknown. Each type renders appropriately (banner, inline fields, toast).

### Loading States
Every fetch has a skeleton that matches the loaded content's shape:
```tsx
{isLoading && (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
)}
```

### Form Validation
Client-side validation happens before the request:
```ts
const result = createSpaceSchema.safeParse({
  name: formData.name,
  hourlyRate: toStorage(parseFloat(formData.hourlyRate)),
  // ...
})

if (!result.success) {
  setFieldErrors(result.error.flatten().fieldErrors)
  return  // Don't send request
}
```

Server-side errors from the API are merged into the same `fieldErrors` state and displayed inline, never as toasts.

### Currency
All amounts in the API are stored in smallest units (paise, cents):
```ts
// Frontend: user enters "₹100.00"
const displayAmount = 100.00
const storageAmount = toStorage(displayAmount)  // 10000

// Database: stores as 10000
// API returns: 10000
// Frontend: displays as toDisplay(10000) = "₹100.00"
```

## Lessons learned

1. **Prove race conditions before fixing them.** Phase 5 intentionally built booking without locking. Two concurrent requests to the same slot both succeeded—a real, reproducible bug. Phase 6 then fixed it. This is more convincing than theory.

2. **State machines are a boundary.** `VALID_TRANSITIONS` in `shared` means the frontend knows which buttons to show before asking the server. Less chatter, clearer rules, and the state machine lives in one place.

3. **Distributed locks are not optional.** Redis locking on `(spaceId, slot)` is the difference between a system that works and a system with a subtle bug nobody can reproduce. It's essential.

4. **Real-time updates change the UX.** SSE is simpler than WebSocket for this use case—one direction, no state, just "here's what changed." Renters see availability update instantly.

5. **Role-based access is a middleware concern.** A single `requireOwnerRole` middleware handles the enforcement; the business logic (who can do what) stays in one place.

6. **Stripe webhooks are not optional.** Without webhook handling, deposits collect but refunds never happen. Always listen for Stripe events and process them durably.

## Roadmap (future)

| Phase | Milestone | Purpose |
| --- | --- | --- |
| 11 | Background worker setup | Reminders, no-show detection, recurring availability (scaffolded) |
| 12 | E2E testing | Playwright happy-path tests: signup → create space → book slot → cancel |
| 13 | Deployment pipeline | GitHub Actions CI/CD, Vercel + Railway, monitoring |

## License

Released under the [MIT License](LICENSE).

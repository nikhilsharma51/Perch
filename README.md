<div align="center">

# Perch

**A booking platform for creative spaces.**

Discover and book podcast studios, photography studios, and gaming cafés, while operators manage spaces, staff, and reservations from one dashboard.

Built with **Next.js, Express, PostgreSQL, Prisma, and Redis**, Perch focuses on reliable booking workflows, real-time availability, and access control across organizations.

![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Express%20%7C%20PostgreSQL%20%7C%20Redis-2563eb)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

</div>

---

## Overview

Booking a studio often involves messages, spreadsheets, and manual coordination. That makes availability difficult to track and creates opportunities for overlapping reservations.

Perch provides a centralized booking workflow: operators publish spaces and manage bookings, while renters browse available spaces, select a slot, and manage their reservations.

## Key features

- **Organization-based workspaces** — manage spaces, team members, and bookings within an organization.
- **Real-time availability** — stream availability changes to the calendar using Server-Sent Events (SSE).
- **Concurrency-safe booking** — use Redis distributed locks to coordinate competing booking requests for the same slot.
- **Role-based access control** — separate owner and staff permissions, with organization-level access checks.
- **Booking lifecycle** — enforce valid status transitions through shared types and validation.
- **Payments and cancellations** — Stripe deposit collection, webhook handling, and cancellation/refund workflows.
- **Resilient UI states** — reusable loading, empty, validation, and API error states.

## Technical highlights

### Preventing double-bookings

A naive availability check can fail when two requests attempt to reserve the same slot at nearly the same time. Perch uses a Redis lock keyed by the space and slot to coordinate booking attempts before checking availability and creating a booking.

### Real-time availability

The API exposes an SSE stream for a space's availability. The client listens for updates and refreshes the relevant availability data without repeatedly polling the server.

### Organization-level authorization

Spaces and bookings belong to an organization. Membership records define each user's role, while API middleware checks organization access and owner-only actions. This keeps authorization enforcement on the server rather than relying on UI visibility alone.

### Shared booking rules

Booking statuses and allowed transitions are defined in shared code so the frontend and backend can use consistent lifecycle rules.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| API | Node.js, Express, TypeScript |
| Database and ORM | PostgreSQL, Prisma |
| Concurrency and events | Redis, Server-Sent Events (SSE) |
| Validation | Zod |
| Payments | Stripe |
| Monorepo | pnpm workspaces |

## Architecture

```text
Browser
  |
  v
Next.js frontend
  |
  | HTTP / SSE
  v
Express API
  |             |             |
  v             v             v
PostgreSQL     Redis         Stripe
(Prisma)       (locks)       (payments/webhooks)
```

## Run locally

### Prerequisites

- Node.js
- pnpm
- PostgreSQL
- Redis
- Stripe credentials for payment-related flows

### Setup

1. Clone the repository and install dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Configure the environment variables required by the API and frontend. Add database, Redis, authentication, and Stripe values as applicable to your local setup.

3. Apply database migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Start the API and frontend in separate terminals, using the scripts configured in each app:

   ```bash
   cd apps/api
   npm run dev
   ```

   ```bash
   cd apps/web
   npm run dev
   ```

5. Open the frontend, create an account and organization, then add spaces and configure their availability.

> Environment variable names and required values depend on the repository's current configuration. Do not commit secrets to version control.

## Project structure

```text
perch/
├── apps/
│   ├── api/                 # Express API
│   │   └── src/
│   │       ├── routes/      # API endpoints
│   │       ├── middleware/  # Authentication and authorization
│   │       └── lib/         # Shared server utilities
│   ├── web/                 # Next.js application
│   │   ├── app/             # Pages and route groups
│   │   ├── components/      # UI and dashboard components
│   │   ├── hooks/           # Client-side hooks
│   │   ├── context/         # Authentication state
│   │   └── lib/             # API client and utilities
│   └── worker/              # Background-worker scaffold
├── packages/
│   └── shared/              # Shared schemas and booking types
├── prisma/                  # Database schema and migrations
└── public/                  # Static assets
```

## Engineering decisions

- **Redis locks for competing booking requests:** address a race condition that a simple availability check cannot prevent on its own.
- **SSE for availability updates:** use a one-way event stream for server-to-client updates without introducing a bidirectional WebSocket connection.
- **Server-side authorization:** enforce organization membership and roles in API middleware.
- **Shared validation and lifecycle rules:** reduce inconsistencies between client-side forms and server-side business logic.

## Roadmap

- End-to-end tests for signup, space creation, booking, and cancellation.
- Background jobs for reminders and no-show detection.
- CI/CD and production monitoring.

## License

Released under the [MIT License](LICENSE).

/**
 * Booking State Machine
 * 
 * Pure functions for managing booking state transitions.
 * No database access - just business logic.
 */

import { VALID_TRANSITIONS } from '@perch/shared';

// BookingStatus type from Prisma schema
type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

/**
 * Check if a transition from one status to another is valid
 * 
 * @param from - Current booking status
 * @param to - Desired booking status
 * @returns true if transition is allowed, false otherwise
 */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Assert that a transition is valid, throwing an error if not
 * 
 * @param from - Current booking status
 * @param to - Desired booking status
 * @throws Error with status 409 if transition is invalid
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid transition: ${from} → ${to}`);
    (err as any).status = 409;
    throw err;
  }
}

/**
 * Booking state machine types and transition rules
 * 
 * This defines the valid state transitions for bookings.
 * Used by both frontend (to conditionally show buttons) and backend (to enforce transitions).
 */

export const BOOKING_STATUSES = [
  'pending',
  'confirmed', 
  'checked_in',
  'completed',
  'cancelled',
  'no_show'
] as const;

// Note: BookingStatus type is already exported from schemas/booking.ts
// We use it here for the VALID_TRANSITIONS map
type BookingStatus = typeof BOOKING_STATUSES[number];

/**
 * Valid state transitions for bookings
 * 
 * Maps from current status to allowed next statuses.
 * Terminal states (completed, cancelled, no_show) have empty arrays.
 */
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed'],
  completed:  [],  // Terminal state
  cancelled:  [],  // Terminal state
  no_show:    [],  // Terminal state
};

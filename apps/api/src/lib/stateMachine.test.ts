/**
 * State Machine Tests
 * 
 * Comprehensive test suite for booking state transitions.
 * Tests all valid transitions, all invalid transitions, and terminal states.
 */

import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from './stateMachine';

describe('Booking State Machine', () => {
  describe('canTransition', () => {
    // Test all VALID transitions from the VALID_TRANSITIONS map
    
    it('allows pending → confirmed', () => {
      expect(canTransition('pending', 'confirmed')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(canTransition('pending', 'cancelled')).toBe(true);
    });

    it('allows confirmed → checked_in', () => {
      expect(canTransition('confirmed', 'checked_in')).toBe(true);
    });

    it('allows confirmed → cancelled', () => {
      expect(canTransition('confirmed', 'cancelled')).toBe(true);
    });

    it('allows confirmed → no_show', () => {
      expect(canTransition('confirmed', 'no_show')).toBe(true);
    });

    it('allows checked_in → completed', () => {
      expect(canTransition('checked_in', 'completed')).toBe(true);
    });

    // Test INVALID transitions (examples of common mistakes)

    it('rejects pending → checked_in (skipping confirmed)', () => {
      expect(canTransition('pending', 'checked_in')).toBe(false);
    });

    it('rejects pending → completed (skipping intermediate states)', () => {
      expect(canTransition('pending', 'completed')).toBe(false);
    });

    it('rejects confirmed → completed (skipping checked_in)', () => {
      expect(canTransition('confirmed', 'completed')).toBe(false);
    });

    it('rejects checked_in → cancelled (past the point of no return)', () => {
      expect(canTransition('checked_in', 'cancelled')).toBe(false);
    });

    // Test terminal states - they should reject ALL transitions

    it('rejects completed → confirmed (terminal state)', () => {
      expect(canTransition('completed', 'confirmed')).toBe(false);
    });

    it('rejects completed → pending (terminal state)', () => {
      expect(canTransition('completed', 'pending')).toBe(false);
    });

    it('rejects cancelled → confirmed (terminal state)', () => {
      expect(canTransition('cancelled', 'confirmed')).toBe(false);
    });

    it('rejects cancelled → pending (terminal state)', () => {
      expect(canTransition('cancelled', 'pending')).toBe(false);
    });

    it('rejects no_show → confirmed (terminal state)', () => {
      expect(canTransition('no_show', 'confirmed')).toBe(false);
    });

    it('rejects no_show → pending (terminal state)', () => {
      expect(canTransition('no_show', 'pending')).toBe(false);
    });
  });

  describe('assertTransition', () => {
    // Test that VALID transitions do NOT throw

    it('does not throw for pending → confirmed', () => {
      expect(() => assertTransition('pending', 'confirmed')).not.toThrow();
    });

    it('does not throw for confirmed → checked_in', () => {
      expect(() => assertTransition('confirmed', 'checked_in')).not.toThrow();
    });

    it('does not throw for checked_in → completed', () => {
      expect(() => assertTransition('checked_in', 'completed')).not.toThrow();
    });

    // Test that INVALID transitions throw with 409 status

    it('throws with status 409 for invalid transition: completed → confirmed', () => {
      try {
        assertTransition('completed', 'confirmed');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid transition');
        expect(error.message).toContain('completed');
        expect(error.message).toContain('confirmed');
        expect(error.status).toBe(409);
      }
    });

    it('throws with status 409 for invalid transition: pending → checked_in', () => {
      try {
        assertTransition('pending', 'checked_in');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid transition');
        expect(error.status).toBe(409);
      }
    });

    it('throws with status 409 for invalid transition: cancelled → confirmed', () => {
      try {
        assertTransition('cancelled', 'confirmed');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid transition');
        expect(error.status).toBe(409);
      }
    });

    it('throws with status 409 for terminal state: no_show → pending', () => {
      try {
        assertTransition('no_show', 'pending');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Invalid transition');
        expect(error.status).toBe(409);
      }
    });
  });

  describe('Terminal states', () => {
    const terminalStates: Array<'completed' | 'cancelled' | 'no_show'> = [
      'completed',
      'cancelled', 
      'no_show'
    ];

    const allStates: Array<'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'> = [
      'pending',
      'confirmed',
      'checked_in',
      'completed',
      'cancelled',
      'no_show'
    ];

    terminalStates.forEach(terminalState => {
      describe(`${terminalState} terminal state`, () => {
        allStates.forEach(targetState => {
          it(`rejects ${terminalState} → ${targetState}`, () => {
            expect(canTransition(terminalState, targetState)).toBe(false);
            
            // Also verify assertTransition throws
            try {
              assertTransition(terminalState, targetState);
              expect.fail('Should have thrown an error');
            } catch (error: any) {
              expect(error.status).toBe(409);
            }
          });
        });
      });
    });
  });
});

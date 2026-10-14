import { ApiError } from './api'

export type ErrorType = 'network' | 'validation' | 'forbidden' | 'server' | 'unknown'

/**
 * Classify an error into one of the main categories for UI handling.
 */
export function classifyError(err: unknown): ErrorType {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return 'network'
    if (err.status === 400) return 'validation'
    if (err.status === 403) return 'forbidden'
    if (err.status >= 500) return 'server'
    return 'unknown'
  }
  return 'unknown'
}

/**
 * Extract field errors from an error, if present.
 * Returns an empty object if no field errors exist.
 */
export function getFieldErrors(err: unknown): Record<string, string[]> {
  if (err instanceof ApiError && err.fieldErrors) {
    return err.fieldErrors
  }
  return {}
}

/**
 * Get a human-readable error message for display.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'An unexpected error occurred'
}

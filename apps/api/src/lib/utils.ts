/**
 * Utility functions for request handling
 */

/**
 * Safely extract a string value from request params or query
 * Express types these as string | string[], we need just string
 */
export function getStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract a string and throw if missing
 */
export function requireStringParam(value: string | string[] | undefined, name: string): string {
  const result = getStringParam(value);
  if (!result) throw new Error(`${name} is required`);
  return result;
}

/**
 * Currency conversion helpers for ₹ (Indian Rupees)
 * 
 * The API/DB stores currency amounts in the smallest unit (paise/cents):
 * - 100 paise = 1 rupee
 * - API stores: 500000 paise
 * - Display as: ₹5000
 * 
 * Use toDisplay() when showing API data to users
 * Use toStorage() when sending user input to the API
 */

/**
 * Convert from storage unit (paise) to display unit (rupees)
 * @param paise Amount in paise/cents
 * @returns Amount in rupees as a number
 */
export function toDisplay(paise: number): number {
  return paise / 100
}

/**
 * Convert from display unit (rupees) to storage unit (paise)
 * @param rupees Amount in rupees
 * @returns Amount in paise/cents as an integer
 */
export function toStorage(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Format currency for display with ₹ symbol and tabular figures
 * @param paise Amount in paise/cents (as stored in API)
 * @returns Formatted string like "₹5000"
 */
export function formatCurrency(paise: number): string {
  const rupees = toDisplay(paise)
  // Use toLocaleString for proper number formatting
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

/**
 * Parse user input (rupees) to storage format (paise)
 * Validates that the input is a valid non-negative number
 * @param input User input as string or number
 * @returns Amount in paise/cents as integer, or null if invalid
 */
export function parseCurrency(input: string | number): number | null {
  try {
    const num = typeof input === 'string' ? parseFloat(input) : input
    
    // Validate it's a number and non-negative
    if (isNaN(num) || num < 0) {
      return null
    }
    
    return toStorage(num)
  } catch {
    return null
  }
}

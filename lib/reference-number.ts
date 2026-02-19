import crypto from 'crypto'

/**
 * Generates a unique reference number using cryptographically secure randomness.
 * Format: REQ-YYYYMMDD-XXXXXX (6 hex chars = ~16 million possibilities per day)
 */
export function generateReferenceNumber(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `REQ-${date}-${random}`
}

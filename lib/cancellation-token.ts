import crypto from 'crypto'

/**
 * Generates a secure, random cancellation token for appointment cancellation links.
 * Uses 32 bytes of randomness (256 bits of entropy) encoded as hexadecimal.
 * @returns A 64-character hexadecimal string
 */
export function generateCancellationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

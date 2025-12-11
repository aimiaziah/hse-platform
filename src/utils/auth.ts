// PIN Generation and Hashing Utilities
import crypto from 'crypto';

/**
 * Generate a secure random 4-digit PIN
 * @returns A 4-digit PIN string (e.g., "1234")
 */
export function generateSecurePIN(): string {
  // Generate a random number between 1000 and 9999
  const min = 1000;
  const max = 9999;
  const pin = Math.floor(Math.random() * (max - min + 1)) + min;
  return pin.toString();
}

/**
 * Hash a PIN using SHA-256
 * Note: For production, consider using bcrypt with salt rounds
 * @param pin - The PIN to hash (4-digit string)
 * @returns Hashed PIN string
 */
export function hashPIN(pin: string): string {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }

  // Use SHA-256 for hashing
  // Note: For production systems, consider using bcrypt with salt rounds
  // This is a simple hash for demonstration purposes
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify a PIN against a hash
 * @param pin - The PIN to verify
 * @param hash - The hashed PIN to compare against
 * @returns true if the PIN matches the hash
 */
export function verifyPIN(pin: string, hash: string): boolean {
  if (!pin || !hash) {
    return false;
  }
  const pinHash = hashPIN(pin);
  return crypto.timingSafeEqual(Buffer.from(pinHash), Buffer.from(hash));
}

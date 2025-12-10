// src/utils/auth.ts - Authentication utilities
const isSequential = (pin: string): boolean => {
  const digits = pin.split('').map(Number);
  for (let i = 1; i < digits.length; i += 1) {
    if (digits[i] !== digits[i - 1] + 1 && digits[i] !== digits[i - 1] - 1) {
      return false;
    }
  }
  return true;
};

const hasRepeatedDigits = (pin: string): boolean => {
  const digits = pin.split('');
  const uniqueDigits = new Set(digits);
  return uniqueDigits.size < 3; // At least 3 different digits
};

const isCommonPIN = (pin: string): boolean => {
  const commonPINs = [
    '0000',
    '1111',
    '2222',
    '3333',
    '4444',
    '5555',
    '6666',
    '7777',
    '8888',
    '9999',
    '1234',
    '4321',
    '0123',
  ];
  return commonPINs.includes(pin);
};

export const generateSecurePIN = (): string => {
  // Generate a 4-digit PIN that's not sequential or repeated
  let pin: string;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (
    // Avoid sequential numbers
    isSequential(pin) ||
    // Avoid repeated digits
    hasRepeatedDigits(pin) ||
    // Avoid common PINs
    isCommonPIN(pin)
  );
  return pin;
};

export const hashPIN = (pin: string): string => {
  // Simple hash for demo - in production, use bcrypt or similar
  let hash = 0;
  for (let i = 0; i < pin.length; i += 1) {
    const char = pin.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = (hash * 32) - hash + char;
    // eslint-disable-next-line no-bitwise
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
};

export const validatePIN = (pin: string): { isValid: boolean; message?: string } => {
  if (!pin) {
    return { isValid: false, message: 'PIN is required' };
  }

  if (pin.length !== 4) {
    return { isValid: false, message: 'PIN must be exactly 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, message: 'PIN must contain only numbers' };
  }

  if (isCommonPIN(pin)) {
    return { isValid: false, message: 'PIN is too common, please choose a different one' };
  }

  return { isValid: true };
};

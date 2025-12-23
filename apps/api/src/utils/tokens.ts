import crypto from 'crypto';

/**
 * Generate a secure random token for email verification or password reset
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate expiry date for tokens
 */
export function getTokenExpiry(hoursFromNow: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hoursFromNow);
    return expiry;
}

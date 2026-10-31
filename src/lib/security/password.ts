import crypto from 'crypto';

// ==============================================================================
// CELEBRA — Cryptographic Password Hashing & Timing-Safe Verification
// ASVS Level 2: Modern Salted Hashing (Scrypt) & Constant-Time Comparison
// ==============================================================================

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
  maxmem: 32 * 1024 * 1024,
};

/**
 * Hashes a plaintext password with a unique, cryptographically random salt.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt,
      });
    });
  });
}

/**
 * Synchronous hash version for deterministic tests and seed scripts.
 */
export function hashPasswordSync(password: string, salt: string): string {
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return derivedKey.toString('hex');
}

/**
 * Verifies a plaintext password against a stored hash using timing-safe comparison.
 * Defends against side-channel timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, storedSalt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const storedBuffer = Buffer.from(storedHash, 'hex');
        if (storedBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(storedBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}


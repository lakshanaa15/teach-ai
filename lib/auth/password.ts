import crypto from 'crypto'

/**
 * Cryptographic Password Utilities for TeachAI.
 *
 * Uses Node.js native crypto scrypt with random salt for secure password hashing
 * and constant-time verification. Zero external dependency issues.
 */

const KEY_LENGTH = 64
const SALT_LENGTH = 16

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [salt, key] = storedHash.split(':')
      if (!salt || !key) return resolve(false)

      const keyBuffer = Buffer.from(key, 'hex')
      crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
        if (err) return resolve(false)
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey))
      })
    } catch {
      resolve(false)
    }
  })
}

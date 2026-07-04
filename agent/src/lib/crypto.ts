/**
 * Node.js Crypto utilities for decrypting letters.
 * Matches browser Web Crypto AES-GCM-256 encryption.
 */

import crypto from 'crypto';

/**
 * Decrypts a letter encrypted in the browser via Web Crypto AES-GCM.
 * Browser Web Crypto appends the 16-byte GCM Auth Tag to the end of the ciphertext.
 */
export function decryptAESGCM(ciphertextHex: string, ivHex: string, keyHex: string): string {
  const rawCiphertext = Buffer.from(ciphertextHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');

  // Extract authentication tag (last 16 bytes of browser output)
  const tagLength = 16;
  if (rawCiphertext.length < tagLength) {
    throw new Error('Ciphertext too short to contain auth tag');
  }

  const tag = rawCiphertext.subarray(rawCiphertext.length - tagLength);
  const encrypted = rawCiphertext.subarray(0, rawCiphertext.length - tagLength);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Browser-native Web Crypto API wrappers (AES-GCM-256)
 *
 * Provides client-side encryption and decryption for letters.
 * Storing letters encrypted in the database protects user privacy.
 * The decryption key is sent to the server in an escrow envelope,
 * allowing the release cron to decrypt and email it only when the release date passes.
 */

/** Helper: Convert a buffer to a hex string */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Helper: Convert a hex string to a Uint8Array */
function hexToBuffer(hex: string): Uint8Array {
  const len = hex.length / 2;
  const view = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return view;
}

/** Generate a random 256-bit symmetric key (hex encoded) */
export async function generateEncryptionKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bufferToHex(exported);
}

interface EncryptedPayload {
  ciphertext: string;
  iv: string; // hex-encoded initialization vector
}

/** Encrypt plain text using a hex-encoded AES-GCM key */
export async function encryptText(text: string, keyHex: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Generate a random 12-byte IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const rawKey = hexToBuffer(keyHex);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    cryptoKey,
    data as any
  );

  return {
    ciphertext: bufferToHex(encrypted),
    iv: bufferToHex(iv.buffer),
  };
}

/** Decrypt cipher text using a hex-encoded AES-GCM key and IV */
export async function decryptText(ciphertext: string, ivHex: string, keyHex: string): Promise<string> {
  const rawKey = hexToBuffer(keyHex);
  const iv = hexToBuffer(ivHex);
  const data = hexToBuffer(ciphertext);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey as any,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    cryptoKey,
    data as any
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

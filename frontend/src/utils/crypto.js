// ── Web Crypto API Utilities for Client-Side Encryption ──────────

const ENCRYPTION_PREFIX = "ENC:";
const IV_LENGTH = 12;
const ITERATIONS = 210000;
const HASH_ALGO = "SHA-256";

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0xffff; // 65535, safe limit for JS engine arguments stack
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Utility to convert Base64 string to ArrayBuffer
 */
function base64ToBuffer(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a deterministic cryptographic salt based on user ID.
 * This ensures the same password derives the same key across devices.
 * @returns {string} Base64 encoded salt
 */
export function getDeterministicSalt(userId = "local") {
  const enc = new TextEncoder();
  const saltString = `StonesDiary_${userId}_SaltV1`;
  return bufferToBase64(enc.encode(saltString).buffer);
}

/**
 * Derives an AES-GCM key from a password and salt using PBKDF2.
 * @param {string} password 
 * @param {string} saltBase64 
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, saltBase64) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = base64ToBuffer(saltBase64);

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives a secure password verification hash using PBKDF2.
 * @param {string} password
 * @param {string} saltBase64
 * @returns {Promise<string>} Hex encoded hash
 */
export async function deriveHash(password, saltBase64) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const salt = base64ToBuffer(saltBase64);

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(bits));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypts a string and returns a prefixed base64 payload.
 * Format: ENC:iv_base64:ciphertext_base64
 */
export async function encryptString(text, key) {
  if (!text) return text;
  
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  return `${ENCRYPTION_PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
}

/**
 * Decrypts an encrypted payload back into a string.
 */
export async function decryptString(encryptedPayload, key) {
  if (!encryptedPayload || !encryptedPayload.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedPayload; // Not encrypted
  }

  const parts = encryptedPayload.slice(ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted payload format");

  const iv = base64ToBuffer(parts[0]);
  const ciphertext = base64ToBuffer(parts[1]);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Encrypts a JSON object.
 */
export async function encryptObject(obj, key) {
  const jsonStr = JSON.stringify(obj);
  const encryptedStr = await encryptString(jsonStr, key);
  return { __encrypted: true, payload: encryptedStr };
}

/**
 * Decrypts a JSON object.
 */
export async function decryptObject(obj, key) {
  if (!obj || obj.__encrypted !== true || !obj.payload) {
    return obj; // Not encrypted
  }
  const decryptedStr = await decryptString(obj.payload, key);
  return JSON.parse(decryptedStr);
}

/**
 * Helper to check if a value is an encrypted object payload.
 */
export function isEncryptedObject(obj) {
  return obj && typeof obj === 'object' && obj.__encrypted === true;
}

/**
 * Helper to check if a string is encrypted.
 */
export function isEncryptedString(str) {
  return typeof str === 'string' && str.startsWith(ENCRYPTION_PREFIX);
}

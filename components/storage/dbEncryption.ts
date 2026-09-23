import * as SecureStore from "expo-secure-store";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { Platform } from "react-native";

const SECURE_STORE_KEY = "ecp-database-encryption-key-v1";

/**
 * Retrieves the encryption key from the hardware-backed SecureStore.
 * If no key exists, generates a new 256-bit AES key and saves it.
 *
 * Note: On web, SecureStore falls back to localStorage (not secure against physical theft).
 */
export async function getDatabaseEncryptionKey(): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    // Basic fallback for web (not secure, but prevents crashes)
    let keyHex = localStorage.getItem(SECURE_STORE_KEY);
    if (!keyHex) {
      keyHex = bytesToHex(randomBytes(32));
      localStorage.setItem(SECURE_STORE_KEY, keyHex);
    }
    return hexToBytes(keyHex);
  }

  let keyHex = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (!keyHex) {
    keyHex = bytesToHex(randomBytes(32));
    await SecureStore.setItemAsync(SECURE_STORE_KEY, keyHex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return hexToBytes(keyHex);
}

/**
 * Encrypts arbitrary binary data using AES-256-GCM.
 * Prepends the 12-byte nonce to the returned ciphertext.
 */
export async function encryptData(
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const keyBytes = await getDatabaseEncryptionKey();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const nonce = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    plaintext,
  );

  // Prepend nonce to ciphertext
  const result = new Uint8Array(nonce.length + encrypted.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(encrypted), nonce.length);
  return result;
}

/**
 * Decrypts data encrypted by `encryptData`.
 * Expects the first 12 bytes to be the AES-GCM nonce.
 */
export async function decryptData(
  encryptedData: Uint8Array,
): Promise<Uint8Array> {
  if (encryptedData.byteLength < 12) {
    throw new Error("Ciphertext too short (missing nonce)");
  }

  const keyBytes = await getDatabaseEncryptionKey();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const nonce = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    ciphertext,
  );

  return new Uint8Array(decrypted);
}

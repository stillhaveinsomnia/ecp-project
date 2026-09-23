import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";
import { AppStoredData } from "../storage/AppStorage";
import { QueuedStorageInterface } from "../storage/StorageInteraface";

// ---- Cryptography for PIN ---------------------------------------------------

const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256-bit

/**
 * Hash a PIN securely using PBKDF2-HMAC-SHA256.
 * We use 100,000 iterations to slow down brute-force attacks on short PINs.
 */
async function hashPin(pin: string, saltBytes: Uint8Array): Promise<string> {
  const pinBytes = new TextEncoder().encode(pin);
  const hashBytes = await pbkdf2Async(
    sha256,
    pinBytes,
    saltBytes,
    { c: ITERATIONS, dkLen: KEY_LENGTH }
  );
  return bytesToHex(hashBytes);
}

// ---- App Lock Logic ---------------------------------------------------------

/**
 * Enable App Lock with a new PIN.
 * Generates a new salt, hashes the PIN, and saves to device settings.
 */
export async function setAppLockPin(
  appStorage: QueuedStorageInterface<AppStoredData>,
  pin: string,
): Promise<void> {
  const saltBytes = randomBytes(16);
  const saltHex = bytesToHex(saltBytes);
  const pinHash = await hashPin(pin, saltBytes);

  await appStorage.write((current) => {
    return {
      ...current,
      deviceSettings: {
        ...current.deviceSettings,
        appLockEnabled: true,
        appLockPinHash: pinHash,
        appLockSalt: saltHex,
      },
    };
  });
}

/**
 * Verify if the provided PIN matches the stored hash.
 */
export async function verifyAppLockPin(
  appStorage: QueuedStorageInterface<AppStoredData>,
  pin: string,
): Promise<boolean> {
  const data = await appStorage.read();
  const { appLockEnabled, appLockPinHash, appLockSalt } = data.deviceSettings;

  if (!appLockEnabled || !appLockPinHash || !appLockSalt) {
    return true; // If lock is not enabled, any PIN is technically "valid" or bypasses
  }

  const saltBytes = hexToBytes(appLockSalt);
  const computedHash = await hashPin(pin, saltBytes);

  return computedHash === appLockPinHash;
}

/**
 * Disable App Lock. Clears the hash and salt.
 */
export async function disableAppLockPin(
  appStorage: QueuedStorageInterface<AppStoredData>,
): Promise<void> {
  await appStorage.write((current) => {
    return {
      ...current,
      deviceSettings: {
        ...current.deviceSettings,
        appLockEnabled: false,
        appLockPinHash: undefined,
        appLockSalt: undefined,
      },
    };
  });
}

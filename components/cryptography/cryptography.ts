import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import * as z from "zod";
import { memoizeSimple } from "../memoization";

// Device Keys

export const DeviceSecretSchema = z.string().brand("DeviceSecret");
/** ED25519 Secret key, hex string */
export type DeviceSecret = z.infer<typeof DeviceSecretSchema>;

export function deviceSecretToUint8Array(
  deviceSecret: DeviceSecret,
): Uint8Array {
  return hexToBytes(deviceSecret);
}

export function generateDeviceSecret(): DeviceSecret {
  const secretKey = ed25519.utils.randomSecretKey();
  return DeviceSecretSchema.parse(bytesToHex(secretKey));
}

export const DeviceIdSchema = z.string().brand("DeviceId");
/** ED25519 Public key, hex string */
export type DeviceId = z.infer<typeof DeviceIdSchema>;

export function deviceIdFromUint8Array(uint8Array: Uint8Array): DeviceId {
  if (uint8Array.length !== 32) {
    throw new Error(`Invalid deviceId length: ${uint8Array.length}`);
  }
  return DeviceIdSchema.parse(bytesToHex(uint8Array));
}

export function deviceIdToUint8Array(deviceId: DeviceId): Uint8Array {
  return hexToBytes(deviceId);
}

export function deviceIdToString(deviceId: DeviceId): string {
  return deviceId;
}

export const deviceIdFromDeviceSecret = memoizeSimple(
  (deviceSecret: DeviceSecret): DeviceId => {
    const publicKey = ed25519.getPublicKey(hexToBytes(deviceSecret));
    return deviceIdFromUint8Array(publicKey);
  },
);

// Account Keys

export const AccountSecretSchema = z.string().brand("AccountSecret");
/** ED25519 Secret key, hex string */
export type AccountSecret = z.infer<typeof AccountSecretSchema>;

export function generateAccountSecret(): AccountSecret {
  const secretKey = ed25519.utils.randomSecretKey();
  return AccountSecretSchema.parse(bytesToHex(secretKey));
}

export const AccountIdSchema = z.string().brand("AccountId");
/** ED25519 Public key, hex string */
export type AccountId = z.infer<typeof AccountIdSchema>;

export function accountIdToUint8Array(accountId: AccountId): Uint8Array {
  return hexToBytes(accountId);
}

function accountIdFromUint8Array(uint8Array: Uint8Array): AccountId {
  if (uint8Array.length !== 32) {
    throw new Error(`Invalid accountId length: ${uint8Array.length}`);
  }
  return AccountIdSchema.parse(bytesToHex(uint8Array));
}

// TODO memoize since its expensive
export const accountIdFromAccountSecret = memoizeSimple(
  (accountSecret: AccountSecret): AccountId => {
    const publicKey = ed25519.getPublicKey(hexToBytes(accountSecret));
    return accountIdFromUint8Array(publicKey);
  },
);

export function accountIdFromString(string: string): AccountId | undefined {
  try {
    return accountIdFromUint8Array(hexToBytes(string));
  } catch {
    return undefined;
  }
}

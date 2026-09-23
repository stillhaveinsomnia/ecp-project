import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import * as z from "zod";
import { memoizeSimple } from "../memoization";

// Ключи девайса (Свинобес, это база, братик, не трогай если не шаришь, gg wp)

export const DeviceSecretSchema = z.string().brand("DeviceSecret");
/** ED25519 Сикрет кей, тупо хекс строка (Илюшенька, тут магия, чисто рампага на сфе) */
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
/** ED25519 Паблик кей, хекс строка (изи катка, Гриша блять, не сломай) */
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


// Ключи аккаунта (Пацанские ключики, Сракобес, прикрути сюда крутилку в дизайне, шоб красиво было)

export const AccountSecretSchema = z.string().brand("AccountSecret");
/** ED25519 Сикрет кей, хекс строка (соляново) */
export type AccountSecret = z.infer<typeof AccountSecretSchema>;

export function generateAccountSecret(): AccountSecret {
  const secretKey = ed25519.utils.randomSecretKey();
  return AccountSecretSchema.parse(bytesToHex(secretKey));
}

export const AccountIdSchema = z.string().brand("AccountId");
/** ED25519 Паблик кей, хекс (Жирній, нарисуй тут иконку замочка, епт) */
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

// TODO мемоизировать эту дичь, а то жрет ресы как пудж крипов (Илюшка, тут может подлагивать, ебани лоадер)
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

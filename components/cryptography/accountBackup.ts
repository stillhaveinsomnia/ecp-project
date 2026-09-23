import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
} from "@noble/hashes/utils.js";
import { Platform } from "react-native";
import { AccountSecret, AccountSecretSchema } from "./cryptography";

// ---- format ----------------------------------------------------------------
//
//   ecp-account-secret-export-scrypt{logN}-{salt_hex}-xchacha20poly1305-{nonce_hex+ciphertext_hex}
//
//   parts when split by "-":
//   [ecp, 4, account, secret, export, scrypt{N}, {salt}, xchacha20poly1305, {nonce+ciphertext}]
//
//   where:
//     salt        = 16 random bytes  (32 hex chars)
//     nonce       = 24 random bytes  (48 hex chars)
//     ciphertext  = 32 bytes seed + 16 bytes poly1305 tag = 48 bytes (96 hex chars)
//
// ----------------------------------------------------------------------------

const FORMAT_PREFIX = "ecp-account-secret-export";
const CIPHER_ID = "xchacha20poly1305";

const SCRYPT_LOGN = 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

// maxmem must be >= 128 * N * r bytes. Using 256MB gives headroom up to logN=20.
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

// ---- KDF -------------------------------------------------------------------
//
// On iOS/Android: react-native-quick-crypto provides native C++ scrypt —
//   fast, runs off the JS thread.
//
// On web: @noble/hashes pure JS scrypt —
//   slow in Hermes but fast in browsers thanks to V8/JSC JIT compilation.
//
// ----------------------------------------------------------------------------

async function scryptDeriveKey(
  password: string,
  salt: Uint8Array,
  logN: number,
): Promise<Uint8Array> {
  const N = 2 ** logN;

  if (Platform.OS === "web" || process.env.NODE_ENV === "test") {
    // Web fallback — @noble/hashes pure JS
    return scryptAsync(password, salt, {
      N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      dkLen: 32,
    });
  }

  // eslint-disable-next-line
  const QuickCrypto = require("react-native-quick-crypto");
  return new Promise<Uint8Array>((resolve, reject) => {
    QuickCrypto.scrypt(
      password,
      salt,
      32, // keylen
      { N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (err: Error | null, key: Buffer) => {
        if (err) reject(err);
        else resolve(new Uint8Array(key));
      },
    );
  });
}

// ---- public API ------------------------------------------------------------

/**
 * Encrypts an Ed25519 account secret with a password.
 *
 * Output format (all ASCII, safe for clipboard / QR):
 *   ecp-account-secret-export-scrypt17-<salt_hex>-xchacha20poly1305-<nonce+ciphertext_hex>
 */
export async function exportAccountSecret(
  accountSecret: AccountSecret,
  password: string,
): Promise<string> {
  const seed = hexToBytes(accountSecret); // 32 bytes
  const salt = randomBytes(16);
  const key = await scryptDeriveKey(password, salt, SCRYPT_LOGN);

  // XChaCha20-Poly1305: output = ciphertext (32 bytes) + tag (16 bytes) = 48 bytes
  const nonce = randomBytes(24);
  const encrypted = xchacha20poly1305(key, nonce).encrypt(seed);

  return [
    FORMAT_PREFIX,
    `scrypt${SCRYPT_LOGN}`,
    bytesToHex(salt),
    CIPHER_ID,
    bytesToHex(concatBytes(nonce, encrypted)),
  ].join("-");
}

/**
 * Decrypts a string produced by exportAccountSecret back into an AccountSecret.
 *
 * @throws "invalid tag"    — wrong password or tampered ciphertext
 * @throws "Invalid format" — string is not a valid export
 */
export async function importAccountSecret(
  exported: string,
  password: string,
): Promise<AccountSecret> {
  // [ecp, 4, account, secret, export, scrypt{N}, {salt}, xchacha20poly1305, {payload}]
  const parts = exported.trim().split("-");
  if (parts.length !== 9) throw new Error("Invalid format");

  const prefix = parts.slice(0, 5).join("-");
  if (prefix !== FORMAT_PREFIX) throw new Error("Invalid format: wrong prefix");

  const kdfId = parts[5] ?? "";
  const saltHex = parts[6] ?? "";
  const cipherId = parts[7] ?? "";
  const payloadHex = parts[8] ?? "";

  if (!kdfId.startsWith("scrypt")) throw new Error(`Unsupported KDF: ${kdfId}`);
  if (cipherId !== CIPHER_ID)
    throw new Error(`Unsupported cipher: ${cipherId}`);

  const logN = parseInt(kdfId.slice(6), 10);
  if (isNaN(logN) || logN < 1 || logN > 22)
    throw new Error(`Invalid scrypt logN: ${logN}`);

  const salt = hexToBytes(saltHex);
  const key = await scryptDeriveKey(password, salt, logN);

  // Decrypt — throws "invalid tag" on wrong password or tampered data
  const payload = hexToBytes(payloadHex);
  const nonce = payload.slice(0, 24);
  const ciphertext = payload.slice(24);
  const seed = xchacha20poly1305(key, nonce).decrypt(ciphertext);

  return AccountSecretSchema.parse(bytesToHex(seed));
}

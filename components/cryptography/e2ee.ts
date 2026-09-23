import { ed25519, x25519 } from "@noble/curves/ed25519.js";

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
} from "@noble/hashes/utils.js";
import { AccountId, AccountSecret, accountIdFromAccountSecret } from "./cryptography";
import type {
  PrekeyBundle,
  X3DHHeader,
  SignedPrekeyPrivate,
  OneTimePrekeyPrivate,
} from "./x3dh";

// ---- Types ------------------------------------------------------------------

/** Hex-encoded X25519 public key (32 bytes = 64 hex chars) */
type X25519PublicKey = string;
/** Hex-encoded X25519 private key (32 bytes = 64 hex chars) */
type X25519PrivateKey = string;

/** The sealed (encrypted) envelope sent over the network */
export type SealedEnvelope = {
  /** Ephemeral X25519 public key (hex) */
  ephemeralPubKey: string;
  /** AES-GCM nonce/IV (hex, 12 bytes = 24 hex chars) */
  nonce: string;
  /** AES-GCM ciphertext + auth tag (hex) */
  ciphertext: string;
};

/** Internal structure of the encrypted data */
type SignedPayload = {
  payload: unknown;
  /** Ed25519 signature of the JSON payload (hex) */
  signature: string;
  senderAccountId: AccountId;
};

// ---- Ed25519 → X25519 conversion -------------------------------------------

/**
 * Convert an Ed25519 public key (AccountId hex) to an X25519 public key
 * suitable for Diffie-Hellman key exchange.
 */
export function accountIdToX25519Public(accountId: AccountId): X25519PublicKey {
  const edPub = hexToBytes(accountId);
  const xPub = ed25519.utils.toMontgomery(edPub);
  return bytesToHex(xPub);
}

/**
 * Convert an Ed25519 private key (AccountSecret hex) to an X25519 private key
 * suitable for Diffie-Hellman key exchange.
 */
export function accountSecretToX25519Private(
  accountSecret: AccountSecret,
): X25519PrivateKey {
  const edPriv = hexToBytes(accountSecret);
  const xPriv = ed25519.utils.toMontgomerySecret(edPriv);
  return bytesToHex(xPriv);
}

// ---- Ephemeral key generation -----------------------------------------------

/**
 * Generate a one-time X25519 key pair for forward secrecy.
 * Each message gets its own ephemeral key pair.
 */
export function generateEphemeralKeyPair(): {
  privateKey: X25519PrivateKey;
  publicKey: X25519PublicKey;
} {
  const privateKeyBytes = x25519.utils.randomSecretKey();
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(publicKeyBytes),
  };
}

// ---- ECDH (shared secret) ---------------------------------------------------

/**
 * Compute the X25519 shared secret between a private key and a public key.
 * Returns raw 32-byte shared secret as Uint8Array.
 */
function computeSharedSecret(
  privateKeyHex: X25519PrivateKey,
  publicKeyHex: X25519PublicKey,
): Uint8Array {
  return x25519.getSharedSecret(
    hexToBytes(privateKeyHex),
    hexToBytes(publicKeyHex),
  );
}

// ---- KDF (HKDF-SHA256) ------------------------------------------------------

/**
 * Derive a symmetric AES-256 key from the ECDH shared secret
 * using HKDF-SHA256.
 *
 * salt  = ephemeralPubKey || recipientPubKey (binds key to this exchange)
 * info  = "ECPE2EE" (domain separation)
 */
function deriveSymmetricKey(
  sharedSecret: Uint8Array,
  ephemeralPubKeyHex: string,
  recipientPubKeyHex: string,
): Uint8Array {
  const salt = concatBytes(
    hexToBytes(ephemeralPubKeyHex),
    hexToBytes(recipientPubKeyHex),
  );
  const info = new TextEncoder().encode("ECPE2EE");
  // 32 bytes = 256 bits for AES-256
  return hkdf(sha256, sharedSecret, salt, info, 32);
}

// ---- AES-256-GCM encryption ------------------------------------------------

/**
 * Encrypt plaintext bytes with AES-256-GCM.
 * Returns { nonce (12 bytes), ciphertext (plaintext + 16-byte auth tag) }.
 */
async function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> {
  const nonce = randomBytes(12); // 96-bit IV for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    plaintext,
  );
  return { nonce, ciphertext: new Uint8Array(encrypted) };
}

/**
 * Decrypt ciphertext bytes with AES-256-GCM.
 * Ciphertext must include the 16-byte auth tag appended by encrypt.
 */
async function aesGcmDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    ciphertext,
  );
  return new Uint8Array(decrypted);
}

// ---- High-level API ---------------------------------------------------------

/**
 * Seal (encrypt) an arbitrary payload for a specific recipient.
 *
 * 1. Generate ephemeral X25519 key pair
 * 2. ECDH(ephemeral_private, recipient_x25519_public) → shared secret
 * 3. HKDF-SHA256(shared_secret, salt, info) → AES-256 key
 * 4. AES-256-GCM(payload) → ciphertext
 *
 * The ephemeral public key, nonce, and ciphertext are returned as hex strings
 * in a SealedEnvelope suitable for transmission over the network.
 */
export async function sealMessage(
  payload: unknown,
  recipientAccountId: AccountId,
  senderAccountSecret: AccountSecret,
): Promise<SealedEnvelope> {
  const ephemeral = generateEphemeralKeyPair();
  const recipientX25519Pub = accountIdToX25519Public(recipientAccountId);

  const sharedSecret = computeSharedSecret(
    ephemeral.privateKey,
    recipientX25519Pub,
  );

  const aesKey = deriveSymmetricKey(
    sharedSecret,
    ephemeral.publicKey,
    recipientX25519Pub,
  );

  const payloadString = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadString);
  const signatureBytes = ed25519.sign(payloadBytes, hexToBytes(senderAccountSecret));

  const signedPayload: SignedPayload = {
    payload,
    signature: bytesToHex(signatureBytes),
    senderAccountId: accountIdFromAccountSecret(senderAccountSecret),
  };

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(signedPayload));
  const { nonce, ciphertext } = await aesGcmEncrypt(aesKey, plaintextBytes);

  return {
    ephemeralPubKey: ephemeral.publicKey,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

/**
 * Open (decrypt) a SealedEnvelope using the recipient's AccountSecret.
 *
 * 1. Convert recipient AccountSecret → X25519 private key
 * 2. ECDH(recipient_x25519_private, ephemeral_public) → shared secret
 * 3. HKDF-SHA256(shared_secret, salt, info) → AES-256 key
 * 4. AES-256-GCM decrypt → original payload
 *
 * Returns the parsed payload object, or throws if decryption/auth fails.
 */
export async function openMessage(
  envelope: SealedEnvelope,
  recipientAccountId: AccountId,
  recipientAccountSecret: AccountSecret,
): Promise<unknown> {
  const recipientX25519Priv =
    accountSecretToX25519Private(recipientAccountSecret);
  const recipientX25519Pub = accountIdToX25519Public(recipientAccountId);

  const sharedSecret = computeSharedSecret(
    recipientX25519Priv,
    envelope.ephemeralPubKey,
  );

  const aesKey = deriveSymmetricKey(
    sharedSecret,
    envelope.ephemeralPubKey,
    recipientX25519Pub,
  );

  const plaintext = await aesGcmDecrypt(
    aesKey,
    hexToBytes(envelope.nonce),
    hexToBytes(envelope.ciphertext),
  );

  const signedPayload: SignedPayload = JSON.parse(new TextDecoder().decode(plaintext));
  
  const payloadBytes = new TextEncoder().encode(JSON.stringify(signedPayload.payload));
  const isValid = ed25519.verify(
    hexToBytes(signedPayload.signature),
    payloadBytes,
    hexToBytes(signedPayload.senderAccountId)
  );

  if (!isValid) {
    throw new Error("Invalid Ed25519 signature on message payload");
  }

  return signedPayload.payload;
}

// ---- X3DH-based High-level API ---------------------------------------------

/** Envelope for messages established via X3DH key agreement */
export type X3DHSealedEnvelope = {
  /** X3DH header (identity key, ephemeral key, OPK id) */
  x3dhHeader: X3DHHeader;
  /** AES-GCM nonce/IV (hex, 12 bytes) */
  nonce: string;
  /** AES-GCM ciphertext + auth tag (hex) */
  ciphertext: string;
};

/**
 * Seal a message using X3DH-derived shared key.
 *
 * The caller must have already performed x3dhInitiate() to obtain
 * the shared key and header. This function signs + encrypts using
 * that pre-derived key.
 */
export async function sealMessageX3DH(
  payload: unknown,
  sharedKey: Uint8Array,
  header: X3DHHeader,
  senderAccountSecret: AccountSecret,
): Promise<X3DHSealedEnvelope> {
  const payloadString = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadString);
  const signatureBytes = ed25519.sign(
    payloadBytes,
    hexToBytes(senderAccountSecret),
  );

  const signedPayload: SignedPayload = {
    payload,
    signature: bytesToHex(signatureBytes),
    senderAccountId: accountIdFromAccountSecret(senderAccountSecret),
  };

  const plaintextBytes = new TextEncoder().encode(
    JSON.stringify(signedPayload),
  );
  const { nonce, ciphertext } = await aesGcmEncrypt(sharedKey, plaintextBytes);

  return {
    x3dhHeader: header,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

/**
 * Open a message sealed with X3DH.
 *
 * The caller must have already performed x3dhRespond() to obtain
 * the shared key. This function decrypts + verifies the Ed25519 signature.
 */
export async function openMessageX3DH(
  envelope: X3DHSealedEnvelope,
  sharedKey: Uint8Array,
): Promise<unknown> {
  const plaintext = await aesGcmDecrypt(
    sharedKey,
    hexToBytes(envelope.nonce),
    hexToBytes(envelope.ciphertext),
  );

  const signedPayload: SignedPayload = JSON.parse(
    new TextDecoder().decode(plaintext),
  );

  const payloadBytes = new TextEncoder().encode(
    JSON.stringify(signedPayload.payload),
  );
  const isValid = ed25519.verify(
    hexToBytes(signedPayload.signature),
    payloadBytes,
    hexToBytes(signedPayload.senderAccountId),
  );

  if (!isValid) {
    throw new Error("X3DH: Invalid Ed25519 signature on message payload");
  }

  return signedPayload.payload;
}

import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
} from "@noble/hashes/utils.js";
import {
  AccountId,
  AccountSecret,
  accountIdFromAccountSecret,
} from "./cryptography";
import {
  accountIdToX25519Public,
  accountSecretToX25519Private,
} from "./e2ee";

// ---- Types ------------------------------------------------------------------

/** Hex-encoded X25519 key */
export type X25519Pub = string;
export type X25519Priv = string;

/** A single one-time prekey with an identifier */
export type OneTimePrekey = {
  id: number;
  publicKey: X25519Pub;
};

/** Private-side storage for a one-time prekey */
export type OneTimePrekeyPrivate = {
  id: number;
  privateKey: X25519Priv;
  publicKey: X25519Pub;
};

/** A signed prekey (medium-term, rotated every 1-4 weeks) */
export type SignedPrekey = {
  publicKey: X25519Pub;
  /** Ed25519 signature over the raw SPK public key bytes, hex */
  signature: string;
};

/** Private-side storage for the signed prekey */
export type SignedPrekeyPrivate = {
  privateKey: X25519Priv;
  publicKey: X25519Pub;
  signature: string;
};

/**
 * The public Prekey Bundle that Bob publishes to the network.
 * Alice fetches this before initiating an X3DH handshake.
 */
export type PrekeyBundle = {
  /** Bob's long-term identity key (X25519, derived from AccountId) */
  identityKey: X25519Pub;
  /** Bob's AccountId (Ed25519 public key, hex) for signature verification */
  accountId: AccountId;
  /** Bob's signed prekey */
  signedPrekey: SignedPrekey;
  /** Available one-time prekeys (may be empty if exhausted) */
  oneTimePrekeys: OneTimePrekey[];
};

/**
 * Header sent by Alice alongside the first encrypted message.
 * Bob uses this to reconstruct the shared secret.
 */
export type X3DHHeader = {
  /** Alice's identity key (X25519 public, hex) */
  identityKey: X25519Pub;
  /** Alice's ephemeral key (X25519 public, hex) */
  ephemeralKey: X25519Pub;
  /** ID of the one-time prekey used, or null if none were available */
  usedOneTimePrekeyId: number | null;
  /** Alice's AccountId for sender identification */
  senderAccountId: AccountId;
};

/**
 * Result of X3DH initiation (Alice's side)
 */
export type X3DHInitResult = {
  /** The derived shared secret (32 bytes, hex) */
  sharedKey: Uint8Array;
  /** Header to include with the first message */
  header: X3DHHeader;
};

/**
 * Result of X3DH response (Bob's side)
 */
export type X3DHRespondResult = {
  /** The derived shared secret (32 bytes, hex) */
  sharedKey: Uint8Array;
};

// ---- Prekey Generation ------------------------------------------------------

/**
 * Generate a signed prekey pair. The public key is signed with the
 * account's Ed25519 secret key so Bob can prove ownership.
 */
export function generateSignedPrekey(
  accountSecret: AccountSecret,
): SignedPrekeyPrivate {
  const privBytes = x25519.utils.randomSecretKey();
  const pubBytes = x25519.getPublicKey(privBytes);
  const signature = ed25519.sign(pubBytes, hexToBytes(accountSecret));
  return {
    privateKey: bytesToHex(privBytes),
    publicKey: bytesToHex(pubBytes),
    signature: bytesToHex(signature),
  };
}

/**
 * Generate a batch of one-time prekeys starting from `startId`.
 * Each OPK is used exactly once and then discarded.
 */
export function generateOneTimePrekeys(
  count: number,
  startId: number = 0,
): { publicKeys: OneTimePrekey[]; privateKeys: OneTimePrekeyPrivate[] } {
  const publicKeys: OneTimePrekey[] = [];
  const privateKeys: OneTimePrekeyPrivate[] = [];

  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const privBytes = x25519.utils.randomSecretKey();
    const pubBytes = x25519.getPublicKey(privBytes);
    publicKeys.push({ id, publicKey: bytesToHex(pubBytes) });
    privateKeys.push({
      id,
      privateKey: bytesToHex(privBytes),
      publicKey: bytesToHex(pubBytes),
    });
  }

  return { publicKeys, privateKeys };
}

/**
 * Build a complete PrekeyBundle for publishing to the network.
 */
export function buildPrekeyBundle(
  accountId: AccountId,
  accountSecret: AccountSecret,
  signedPrekey: SignedPrekeyPrivate,
  oneTimePrekeys: OneTimePrekey[],
): PrekeyBundle {
  return {
    identityKey: accountIdToX25519Public(accountId),
    accountId,
    signedPrekey: {
      publicKey: signedPrekey.publicKey,
      signature: signedPrekey.signature,
    },
    oneTimePrekeys,
  };
}

// ---- SPK Signature Validation -----------------------------------------------

/**
 * Verify the Ed25519 signature on a signed prekey.
 * Returns true if the SPK was genuinely signed by the bundle owner.
 */
export function verifySignedPrekey(bundle: PrekeyBundle): boolean {
  return ed25519.verify(
    hexToBytes(bundle.signedPrekey.signature),
    hexToBytes(bundle.signedPrekey.publicKey),
    hexToBytes(bundle.accountId),
  );
}

// ---- X3DH Handshake ---------------------------------------------------------

/**
 * Perform X3DH as the initiator (Alice).
 *
 * Computes 3 or 4 ECDH operations and derives a shared key:
 *   DH1 = ECDH(IK_A, SPK_B)    — identity ↔ signed prekey
 *   DH2 = ECDH(EK_A, IK_B)     — ephemeral ↔ identity
 *   DH3 = ECDH(EK_A, SPK_B)    — ephemeral ↔ signed prekey
 *   DH4 = ECDH(EK_A, OPK_B)    — ephemeral ↔ one-time prekey (optional)
 *
 * @throws if the SPK signature is invalid
 */
export function x3dhInitiate(
  senderAccountId: AccountId,
  senderAccountSecret: AccountSecret,
  recipientBundle: PrekeyBundle,
): X3DHInitResult {
  // 1. Verify the signed prekey
  if (!verifySignedPrekey(recipientBundle)) {
    throw new Error("X3DH: Invalid signed prekey signature — possible MitM");
  }

  // 2. Convert sender's Ed25519 identity key to X25519
  const ikAPriv = accountSecretToX25519Private(senderAccountSecret);
  const ikAPub = accountIdToX25519Public(senderAccountId);

  // 3. Generate ephemeral key pair
  const ekPrivBytes = x25519.utils.randomSecretKey();
  const ekPubBytes = x25519.getPublicKey(ekPrivBytes);
  const ekPriv = bytesToHex(ekPrivBytes);
  const ekPub = bytesToHex(ekPubBytes);

  // 4. Perform ECDH operations
  const dh1 = x25519.getSharedSecret(
    hexToBytes(ikAPriv),
    hexToBytes(recipientBundle.signedPrekey.publicKey),
  );
  const dh2 = x25519.getSharedSecret(
    ekPrivBytes,
    hexToBytes(recipientBundle.identityKey),
  );
  const dh3 = x25519.getSharedSecret(
    ekPrivBytes,
    hexToBytes(recipientBundle.signedPrekey.publicKey),
  );

  let usedOPKId: number | null = null;
  let dhConcat = concatBytes(dh1, dh2, dh3);

  // DH4 with one-time prekey if available
  if (recipientBundle.oneTimePrekeys.length > 0) {
    const opk = recipientBundle.oneTimePrekeys[0];
    usedOPKId = opk.id;
    const dh4 = x25519.getSharedSecret(ekPrivBytes, hexToBytes(opk.publicKey));
    dhConcat = concatBytes(dhConcat, dh4);
  }

  // 5. Derive shared key via HKDF
  const salt = new Uint8Array(32); // all zeros per X3DH spec
  const info = new TextEncoder().encode("ECPX3DH");
  const sharedKey = hkdf(sha256, dhConcat, salt, info, 32);

  return {
    sharedKey,
    header: {
      identityKey: ikAPub,
      ephemeralKey: ekPub,
      usedOneTimePrekeyId: usedOPKId,
      senderAccountId,
    },
  };
}

/**
 * Perform X3DH as the responder (Bob).
 *
 * Mirrors the initiator's ECDH operations using Bob's private keys.
 *
 * @param recipientAccountSecret - Bob's Ed25519 account secret
 * @param signedPrekeyPrivate    - Bob's SPK private key (hex)
 * @param oneTimePrekeyPrivates  - Bob's OPK private keys (map by id)
 * @param header                 - The X3DH header from Alice's first message
 */
export function x3dhRespond(
  recipientAccountSecret: AccountSecret,
  signedPrekeyPrivate: SignedPrekeyPrivate,
  oneTimePrekeyPrivates: Map<number, OneTimePrekeyPrivate>,
  header: X3DHHeader,
): X3DHRespondResult {
  // Convert Bob's identity key to X25519
  const ikBPriv = accountSecretToX25519Private(recipientAccountSecret);

  // Mirror the 3 core ECDH operations
  const dh1 = x25519.getSharedSecret(
    hexToBytes(signedPrekeyPrivate.privateKey),
    hexToBytes(header.identityKey),
  );
  const dh2 = x25519.getSharedSecret(
    hexToBytes(ikBPriv),
    hexToBytes(header.ephemeralKey),
  );
  const dh3 = x25519.getSharedSecret(
    hexToBytes(signedPrekeyPrivate.privateKey),
    hexToBytes(header.ephemeralKey),
  );

  let dhConcat = concatBytes(dh1, dh2, dh3);

  // DH4 with one-time prekey if used
  if (header.usedOneTimePrekeyId !== null) {
    const opkPriv = oneTimePrekeyPrivates.get(header.usedOneTimePrekeyId);
    if (!opkPriv) {
      throw new Error(
        `X3DH: One-time prekey #${header.usedOneTimePrekeyId} not found — may have been consumed already`,
      );
    }
    const dh4 = x25519.getSharedSecret(
      hexToBytes(opkPriv.privateKey),
      hexToBytes(header.ephemeralKey),
    );
    dhConcat = concatBytes(dhConcat, dh4);
  }

  // Derive the same shared key
  const salt = new Uint8Array(32);
  const info = new TextEncoder().encode("ECPX3DH");
  const sharedKey = hkdf(sha256, dhConcat, salt, info, 32);

  return { sharedKey };
}

import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes } from "@noble/hashes/utils.js";

/**
 * Generates a 36-byte fingerprint from the initial and current keys.
 * Replaces the obsolete SHA-1 approach from MTProto with SHA-256.
 *
 * Fingerprint_288 = SHA256(K_initial)[0..15] || SHA256(K_current)[0..19]
 */
export function generateFingerprint(
  initialKey: Uint8Array,
  currentKey: Uint8Array,
): Uint8Array {
  const hashInit = sha256(initialKey);
  const hashCur = sha256(currentKey);

  // 16 bytes + 20 bytes = 36 bytes (288 bits)
  return concatBytes(hashInit.slice(0, 16), hashCur.slice(0, 20));
}

/**
 * Computes 4 Emoji indices from an authentication key and the initiator's public key
 * using the Commit-Reveal protection against MitM.
 *
 * Returns an array of 4 indices between 0 and 332.
 */
export function computeEmojiIndices(
  authKey: Uint8Array,
  initiatorPublicKey: Uint8Array,
): [number, number, number, number] {
  // SHA256(K_auth || g^a)
  const hash = sha256(concatBytes(authKey, initiatorPublicKey));

  // Extract at least 36 bits of entropy. We take the first 64 bits (8 bytes)
  const buf = new Uint8Array(8);
  buf.set(hash.slice(0, 8));
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  
  let v = Number(view.getBigUint64(0, false)); // Big Endian

  const indices: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    indices[i] = v % 333;
    v = Math.floor(v / 333);
  }

  return indices;
}

import { webcrypto } from "crypto";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import {
  accountIdToX25519Public,
  accountSecretToX25519Private,
  generateEphemeralKeyPair,
  openMessage,
  sealMessage,
} from "../../components/cryptography/e2ee";

// Polyfill crypto.subtle for Node.js test environment
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

describe("E2EE cryptography", () => {
  test("sealMessage → openMessage round-trip preserves the original payload", async () => {
    // Generate a recipient account (Bob)
    const bobSecret = generateAccountSecret();
    const bobId = accountIdFromAccountSecret(bobSecret);

    // Original payload (simulates a DataItem)
    const originalPayload = {
      type: "DirectMessageUpdate",
      senderId: "alice_account_id_placeholder",
      receiverId: bobId,
      body: "Hello, Bob! This is a secret message.",
      timestamp: Date.now(),
    };

    // Alice seals the message for Bob
    const envelope = await sealMessage(originalPayload, bobId);

    // Verify envelope structure
    expect(envelope).toHaveProperty("ephemeralPubKey");
    expect(envelope).toHaveProperty("nonce");
    expect(envelope).toHaveProperty("ciphertext");
    expect(envelope.ephemeralPubKey).toHaveLength(64); // 32 bytes hex
    expect(envelope.nonce).toHaveLength(24); // 12 bytes hex
    expect(envelope.ciphertext.length).toBeGreaterThan(0);

    // Bob opens the message
    const decrypted = await openMessage(envelope, bobId, bobSecret);

    // Verify round-trip fidelity
    expect(decrypted).toEqual(originalPayload);
  });

  test("openMessage fails with wrong recipient secret", async () => {
    const bobSecret = generateAccountSecret();
    const bobId = accountIdFromAccountSecret(bobSecret);
    const eveSecret = generateAccountSecret(); // wrong key

    const envelope = await sealMessage({ msg: "secret" }, bobId);

    // Eve tries to decrypt — should fail
    await expect(
      openMessage(envelope, bobId, eveSecret),
    ).rejects.toThrow();
  });

  test("openMessage fails with tampered ciphertext", async () => {
    const bobSecret = generateAccountSecret();
    const bobId = accountIdFromAccountSecret(bobSecret);

    const envelope = await sealMessage({ msg: "secret" }, bobId);

    // Tamper with the ciphertext
    const tampered = { ...envelope, ciphertext: "00" + envelope.ciphertext.slice(2) };

    await expect(
      openMessage(tampered, bobId, bobSecret),
    ).rejects.toThrow();
  });

  test("each sealMessage produces a different envelope (unique ephemeral keys)", async () => {
    const bobSecret = generateAccountSecret();
    const bobId = accountIdFromAccountSecret(bobSecret);
    const payload = { msg: "same message" };

    const envelope1 = await sealMessage(payload, bobId);
    const envelope2 = await sealMessage(payload, bobId);

    // Different ephemeral keys means different envelopes
    expect(envelope1.ephemeralPubKey).not.toEqual(envelope2.ephemeralPubKey);
    expect(envelope1.nonce).not.toEqual(envelope2.nonce);
    expect(envelope1.ciphertext).not.toEqual(envelope2.ciphertext);

    // But both decrypt to the same payload
    expect(await openMessage(envelope1, bobId, bobSecret)).toEqual(payload);
    expect(await openMessage(envelope2, bobId, bobSecret)).toEqual(payload);
  });

  test("Ed25519 → X25519 key conversion produces valid keys", () => {
    const secret = generateAccountSecret();
    const accountId = accountIdFromAccountSecret(secret);

    const x25519Pub = accountIdToX25519Public(accountId);
    const x25519Priv = accountSecretToX25519Private(secret);

    // X25519 keys should be 32 bytes = 64 hex chars
    expect(x25519Pub).toHaveLength(64);
    expect(x25519Priv).toHaveLength(64);

    // They should be different from the original Ed25519 keys
    expect(x25519Pub).not.toEqual(accountId);
    expect(x25519Priv).not.toEqual(secret);
  });

  test("generateEphemeralKeyPair produces valid X25519 keys", () => {
    const kp = generateEphemeralKeyPair();

    expect(kp.publicKey).toHaveLength(64);
    expect(kp.privateKey).toHaveLength(64);
    expect(kp.publicKey).not.toEqual(kp.privateKey);
  });
});

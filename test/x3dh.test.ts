import { webcrypto } from "crypto";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../components/cryptography/cryptography";
import {
  generateSignedPrekey,
  generateOneTimePrekeys,
  buildPrekeyBundle,
  verifySignedPrekey,
  x3dhInitiate,
  x3dhRespond,
} from "../components/cryptography/x3dh";
import {
  sealMessageX3DH,
  openMessageX3DH,
} from "../components/cryptography/e2ee";

// Polyfill crypto.subtle for Node.js test environment
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

describe("X3DH Key Agreement", () => {
  // Helper: set up Bob's prekey bundle and private keys
  function setupBob() {
    const bobSecret = generateAccountSecret();
    const bobId = accountIdFromAccountSecret(bobSecret);
    const spk = generateSignedPrekey(bobSecret);
    const { publicKeys: opkPubs, privateKeys: opkPrivs } =
      generateOneTimePrekeys(5);
    const bundle = buildPrekeyBundle(bobId, bobSecret, spk, opkPubs);
    const opkMap = new Map(opkPrivs.map((k) => [k.id, k]));
    return { bobSecret, bobId, spk, opkPubs, opkPrivs, bundle, opkMap };
  }

  test("full round-trip: initiate → respond produces identical shared keys", () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bobSecret, bundle, spk, opkMap } = setupBob();

    const { sharedKey: aliceKey, header } = x3dhInitiate(
      aliceId,
      aliceSecret,
      bundle,
    );

    const { sharedKey: bobKey } = x3dhRespond(
      bobSecret,
      spk,
      opkMap,
      header,
    );

    expect(Buffer.from(aliceKey)).toEqual(Buffer.from(bobKey));
  });

  test("X3DH without OPK still produces matching keys", () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bobSecret, spk, bundle } = setupBob();

    // Remove all one-time prekeys
    const bundleNoOPK = { ...bundle, oneTimePrekeys: [] };

    const { sharedKey: aliceKey, header } = x3dhInitiate(
      aliceId,
      aliceSecret,
      bundleNoOPK,
    );

    expect(header.usedOneTimePrekeyId).toBeNull();

    const { sharedKey: bobKey } = x3dhRespond(
      bobSecret,
      spk,
      new Map(),
      header,
    );

    expect(Buffer.from(aliceKey)).toEqual(Buffer.from(bobKey));
  });

  test("verifySignedPrekey returns true for valid bundle", () => {
    const { bundle } = setupBob();
    expect(verifySignedPrekey(bundle)).toBe(true);
  });

  test("x3dhInitiate throws on invalid SPK signature", () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bundle } = setupBob();

    // Tamper with the signature
    const tamperedBundle = {
      ...bundle,
      signedPrekey: {
        ...bundle.signedPrekey,
        signature: "00".repeat(64), // fake signature
      },
    };

    expect(() =>
      x3dhInitiate(aliceId, aliceSecret, tamperedBundle),
    ).toThrow("Invalid signed prekey signature");
  });

  test("x3dhRespond throws when OPK id not found", () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bobSecret, bundle, spk } = setupBob();

    const { header } = x3dhInitiate(aliceId, aliceSecret, bundle);

    // Respond with empty OPK map — the header references OPK id 0
    expect(() =>
      x3dhRespond(bobSecret, spk, new Map(), header),
    ).toThrow("One-time prekey");
  });

  test("different sessions produce different shared keys", () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bobSecret, bundle, spk, opkMap } = setupBob();

    const result1 = x3dhInitiate(aliceId, aliceSecret, bundle);

    // Second initiation uses a new ephemeral key
    const result2 = x3dhInitiate(aliceId, aliceSecret, bundle);

    expect(Buffer.from(result1.sharedKey)).not.toEqual(
      Buffer.from(result2.sharedKey),
    );
  });

  test("integration: X3DH → sealMessageX3DH → openMessageX3DH round-trip", async () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bobSecret, bundle, spk, opkMap } = setupBob();

    // 1. X3DH handshake
    const { sharedKey: aliceKey, header } = x3dhInitiate(
      aliceId,
      aliceSecret,
      bundle,
    );
    const { sharedKey: bobKey } = x3dhRespond(bobSecret, spk, opkMap, header);

    // 2. Alice seals a message
    const originalPayload = {
      type: "DirectMessageUpdate",
      body: "Hello via X3DH!",
      timestamp: Date.now(),
    };

    const envelope = await sealMessageX3DH(
      originalPayload,
      aliceKey,
      header,
      aliceSecret,
    );

    // 3. Bob opens the message
    const decrypted = await openMessageX3DH(envelope, bobKey);

    expect(decrypted).toEqual(originalPayload);
  });

  test("openMessageX3DH fails with wrong shared key", async () => {
    const aliceSecret = generateAccountSecret();
    const aliceId = accountIdFromAccountSecret(aliceSecret);
    const { bundle } = setupBob();

    const { sharedKey, header } = x3dhInitiate(aliceId, aliceSecret, bundle);

    const envelope = await sealMessageX3DH(
      { msg: "secret" },
      sharedKey,
      header,
      aliceSecret,
    );

    // Use a completely wrong key
    const wrongKey = new Uint8Array(32);
    wrongKey.fill(0xff);

    await expect(openMessageX3DH(envelope, wrongKey)).rejects.toThrow();
  });
});

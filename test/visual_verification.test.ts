import { generateFingerprint, computeEmojiIndices } from "../components/cryptography/visual_verification";
import { randomBytes } from "@noble/hashes/utils.js";

describe("Visual Verification", () => {
  test("generateFingerprint produces a 36-byte array", () => {
    const initKey = randomBytes(32);
    const curKey = randomBytes(32);
    const fp = generateFingerprint(initKey, curKey);

    expect(fp).toHaveLength(36);
  });

  test("generateFingerprint is deterministic", () => {
    const initKey = randomBytes(32);
    const curKey = randomBytes(32);
    
    const fp1 = generateFingerprint(initKey, curKey);
    const fp2 = generateFingerprint(initKey, curKey);

    expect(fp1).toEqual(fp2);
  });

  test("computeEmojiIndices produces 4 indices between 0 and 332", () => {
    const authKey = randomBytes(32);
    const pubKey = randomBytes(32);

    const indices = computeEmojiIndices(authKey, pubKey);

    expect(indices).toHaveLength(4);
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(333);
    }
  });

  test("computeEmojiIndices is deterministic", () => {
    const authKey = randomBytes(32);
    const pubKey = randomBytes(32);

    const indices1 = computeEmojiIndices(authKey, pubKey);
    const indices2 = computeEmojiIndices(authKey, pubKey);

    expect(indices1).toEqual(indices2);
  });
});

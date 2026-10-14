import { afterEach, describe, expect, it } from "vitest";
import {
  decryptInstagramToken,
  encryptInstagramToken,
  instagramPublishingEnabled,
} from "./instagram-server";

const previousKey = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
const previousFlag = process.env.INSTAGRAM_PUBLISHING_ENABLED;

afterEach(() => {
  if (previousKey === undefined) delete process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  else process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = previousKey;
  if (previousFlag === undefined) delete process.env.INSTAGRAM_PUBLISHING_ENABLED;
  else process.env.INSTAGRAM_PUBLISHING_ENABLED = previousFlag;
});

describe("CueFace Instagram safeguards", () => {
  it("encrypts access tokens before persistence and decrypts them server-side", () => {
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const token = "instagram-access-token-for-test";
    const encrypted = encryptInstagramToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptInstagramToken(encrypted)).toBe(token);
  });

  it("keeps publishing disabled unless explicitly enabled", () => {
    delete process.env.INSTAGRAM_PUBLISHING_ENABLED;
    expect(instagramPublishingEnabled()).toBe(false);
    process.env.INSTAGRAM_PUBLISHING_ENABLED = "true";
    expect(instagramPublishingEnabled()).toBe(true);
  });
});

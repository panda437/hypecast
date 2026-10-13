import { describe, expect, it } from "vitest";
import { assertPublicUrl } from "./url-safety";

describe("assertPublicUrl", () => {
  it.each([
    "ftp://example.com/file",
    "http://localhost",
    "http://service.internal",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://[::1]",
    "http://[fd00::1]",
    "http://[::ffff:127.0.0.1]",
    "https://example.com:8443",
  ])("rejects unsafe URL %s", async (url) => {
    await expect(assertPublicUrl(url)).rejects.toThrow();
  });

  it("allows a public literal address without a DNS lookup", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});

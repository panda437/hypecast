import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiRequestError } from "./api";

describe("apiRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("includes the recovery action in errors shown by existing screens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "The AI service is temporarily busy.",
      action: "Wait one minute and try again.",
      code: "PROVIDER_BUSY",
      retryable: true,
    }), { status: 429, headers: { "Content-Type": "application/json" } })));

    await expect(apiRequest("/api/image", {})).rejects.toMatchObject({
      name: "ApiRequestError",
      code: "PROVIDER_BUSY",
      retryable: true,
      message: "The AI service is temporarily busy.\n\nWhat you can do: Wait one minute and try again.",
    });
  });

  it("gives a useful network recovery path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/api/health")).rejects.toBeInstanceOf(ApiRequestError);
    await expect(apiRequest("/api/health")).rejects.toMatchObject({ code: "NETWORK_ERROR", retryable: true });
  });
});

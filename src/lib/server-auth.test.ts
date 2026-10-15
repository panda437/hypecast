import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeRouteError, HttpError } from "./server-auth";

describe("describeRouteError", () => {
  it("keeps intentional product errors and adds a recovery action", () => {
    expect(describeRouteError(new HttpError("Sign in before generating media.", 401))).toEqual({
      status: 401,
      error: "Sign in before generating media.",
      action: "Sign in again, then retry.",
      code: "HTTP_401",
      retryable: false,
    });
  });

  it("turns validation failures into plain-language feedback", () => {
    let failure: unknown;
    try {
      z.object({ email: z.string().email() }).parse({ email: "not-an-email" });
    } catch (error) {
      failure = error;
    }
    expect(describeRouteError(failure)).toMatchObject({
      status: 400,
      code: "INVALID_INPUT",
      retryable: false,
    });
  });

  it("does not expose a provider's raw error to the user", () => {
    const failure = Object.assign(new Error("secret upstream details"), { status: 500 });
    const result = describeRouteError(failure);
    expect(result.error).toBe("The AI service is temporarily unavailable.");
    expect(JSON.stringify(result)).not.toContain("secret upstream details");
    expect(result.retryable).toBe(true);
  });
});

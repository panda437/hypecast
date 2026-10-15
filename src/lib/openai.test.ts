import { afterEach, describe, expect, it } from "vitest";
import { configuredImageInputFidelity } from "./openai-image-options";

describe("OpenAI image edit options", () => {
  afterEach(() => {
    delete process.env.OPENAI_IMAGE_INPUT_FIDELITY;
  });

  it("does not send input_fidelity unless it was explicitly configured for a compatible model", () => {
    expect(configuredImageInputFidelity()).toBeUndefined();
    expect(configuredImageInputFidelity("unsupported")).toBeUndefined();
  });

  it("accepts only OpenAI's supported fidelity values when deliberately enabled", () => {
    expect(configuredImageInputFidelity("high")).toBe("high");
    expect(configuredImageInputFidelity("low")).toBe("low");
  });
});

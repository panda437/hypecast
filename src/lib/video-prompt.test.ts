import { describe, expect, it } from "vitest";
import { composeVideoPrompt } from "./video-prompt";

describe("the CueFace image-to-video prompt", () => {
  it("keeps the reference-person likeness without over-directing the model", () => {
    const prompt = composeVideoPrompt("The creator blinks once and gives a restrained smile.");
    expect(prompt).toContain("reference image to preserve the same person's likeness");
    expect(prompt).toContain("The creator blinks once and gives a restrained smile.");
    expect(prompt).toContain("natural 15-second silent video");
    expect(prompt).toContain("No extra people, speaking, text, logos, or watermarks");
    expect(prompt).not.toMatch(/first frame|first half-second|seconds 0|seconds 5|seconds 10|no cuts|wardrobe change/i);
  });

  it("trims the editable motion direction before submission", () => {
    expect(composeVideoPrompt("  A slow, natural breath.  ")).toContain("MOTION:\nA slow, natural breath.\n");
  });
});

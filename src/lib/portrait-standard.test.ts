import { describe, expect, it } from "vitest";
import { candidatePortraitPrompt, referencePortraitPrompt } from "./portrait-standard";

describe("the CueFace portrait-only standard", () => {
  it("keeps product context out of creator casting", () => {
    const prompt = candidatePortraitPrompt("Maya Chen", "Maya is 29 with short dark hair and a rust overshirt.");
    expect(prompt).not.toContain("Mosaic");
    expect(prompt).toContain("exactly one fictional adult person");
    expect(prompt).toContain("Keep the complete head, face, neck, and both shoulders inside the frame");
    expect(prompt).toContain("Do not show a product");
    expect(prompt).toContain("No screenshots, UI, mockups");
  });

  it("treats an existing image as identity reference only", () => {
    const prompt = referencePortraitPrompt(
      "Maya Chen",
      "Maya is 29 with short dark hair and a rust overshirt.",
      "Standing beside a softly lit window.",
    );
    expect(prompt).toContain("using the input only as an identity reference");
    expect(prompt).toContain("Discard every non-person visual element from the input");
    expect(prompt).toContain("image-within-an-image");
    expect(prompt).toContain("exactly one fictional adult person");
  });
});

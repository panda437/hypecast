import { describe, expect, it } from "vitest";
import { composeVideoPrompt } from "./video-prompt";

describe("the Hypecast image-to-video prompt", () => {
  it("locks every clip to the supplied character image", () => {
    const prompt = composeVideoPrompt("The creator blinks once and gives a restrained smile.");
    expect(prompt).toContain("supplied start image as the strict identity reference and first frame");
    expect(prompt).toContain("exact same single person");
    expect(prompt).toContain("only person allowed in the video");
    expect(prompt).toContain("The creator blinks once and gives a restrained smile.");
    expect(prompt).toContain("No speaking, lip-sync, identity drift");
    expect(prompt).toContain("additional person");
    expect(prompt).toContain("within the first half-second");
    expect(prompt).toContain("continuous 5-second shot");
  });

  it("trims the editable motion direction before submission", () => {
    expect(composeVideoPrompt("  A slow, natural breath.  ", 15)).toContain("MOTION DIRECTION:\nA slow, natural breath.\n");
    expect(composeVideoPrompt("A camera arc.", 15)).toContain("continuous 15-second shot");
  });
});

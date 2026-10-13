import { describe, expect, it } from "vitest";
import { demoClips, demoCreators, demoReferences, demoReels } from "./demo-data";

describe("the zero-credit Hypecast flow", () => {
  it("preserves the MVP batch contract", () => {
    expect(demoCreators).toHaveLength(5);
    expect(new Set(demoCreators.map((creator) => creator.id)).size).toBe(5);

    const references = demoReferences(demoCreators[0]);
    const clips = demoClips(references);
    const reels = demoReels(clips);

    expect(references).toHaveLength(3);
    expect(references.every((reference) => reference.status === "ready")).toBe(true);
    expect(clips).toHaveLength(3);
    expect(clips.every((clip) => clip.provider === "demo" && clip.status === "ready")).toBe(true);
    expect(reels).toHaveLength(5);
    expect(reels.every((reel) => clips.some((clip) => clip.id === reel.clipId))).toBe(true);
    expect(reels.every((reel) => reel.cards.every((card) => card.start >= 0 && card.end <= 15))).toBe(true);
  });
});

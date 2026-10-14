import { describe, expect, it } from "vitest";
import { storyBatchIssues, type StoryDraft } from "./story-standard";

function draft(story: string): StoryDraft {
  return { title: "A personal note", angle: "what changed for me", story };
}

describe("the Hypecast personal-story standard", () => {
  it("accepts a personal batch where the product stays incidental", () => {
    const stories = [
      draft("i was standing in the bathroom with one earring on when i realized i'd been getting ready for people i didn't even like. i took it off, washed my face, and stayed home. the relief arrived before the guilt, which told me more than either feeling wanted to."),
      draft("i missed my stop because i was rehearsing a conversation that had already happened. on the walk back, i kept inventing better versions of myself: calmer, funnier, impossible to misunderstand. by the time i reached home, the real conversation felt smaller than all the imaginary ones."),
      draft("my sister asked why i kept checking my reflection in the dark phone screen. i said i wasn't, then did it again. we both laughed, but i noticed how often i was trying to catch myself looking acceptable instead of actually being there."),
      draft("at the red light, i caught the driver beside me singing with both hands on the wheel. she saw me watching, smiled, and kept going. i spent the next three blocks wondering when i had started treating joy like something embarrassing people should do privately."),
      draft("i tucked my hair behind my ear before opening Mosaic, then did it again while nobody was looking. it was the exact nervous habit my mother has. i used to tease her for it. suddenly it felt less like a flaw and more like family."),
    ];
    expect(storyBatchIssues(stories, "Mosaic")).toEqual([]);
  });

  it("rejects product-led pivots and repeated brand mentions", () => {
    const stories = Array.from({ length: 5 }, () => draft("then i found Mosaic. Mosaic was the only thing that worked. try it and check it out."));
    const issues = storyBatchIssues(stories, "Mosaic");
    expect(issues.some((issue) => issue.includes("more than once"))).toBe(true);
    expect(issues.some((issue) => issue.includes("sales or solution pivot"))).toBe(true);
    expect(issues.some((issue) => issue.includes("maximum is one"))).toBe(true);
  });

  it("rejects long batches and repeated workplace framing", () => {
    const stories = Array.from({ length: 5 }, (_, index) => draft(
      `i sat in a team meeting with a client and watched an invoice spreadsheet become the whole conversation. ${"really ".repeat(index + 35)}i left.`,
    ));
    const issues = storyBatchIssues(stories, "Mosaic");
    expect(issues.some((issue) => issue.includes("35–55 words"))).toBe(true);
    expect(issues.some((issue) => issue.includes("business or workplace language"))).toBe(true);
  });
});

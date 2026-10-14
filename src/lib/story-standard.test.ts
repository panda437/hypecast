import { describe, expect, it } from "vitest";
import { storyBatchIssues, type StoryDraft } from "./story-standard";

function draft(story: string): StoryDraft {
  return { title: "A personal note", angle: "what changed for me", story };
}

describe("the Hypecast personal-story standard", () => {
  it("accepts a personal batch where the product stays incidental", () => {
    const stories = [
      draft("i used to trust whatever i remembered after a call. i put the notes in Mosaic once, then noticed my memory had been choosing the dramatic parts. what helped most was admitting that attention and evidence are not the same thing."),
      draft("i kept saying yes to every idea because saying no felt rude. my week became a list of other people's urgency. eventually i learned that being responsive and being useful are not always the same choice."),
      draft("i wrote everything down and still forgot what mattered. my pages looked responsible, but they never helped me make the next decision. i started ending each day with one sentence about what surprised me, and that was the part i could actually remember."),
      draft("i opened Mosaic to find one note and realized i had been searching for proof of an answer i already wanted. i changed the question instead. the uncomfortable lesson was that organized evidence can still be used dishonestly."),
      draft("i used to think the loudest reaction meant i had found the real problem. after a few wrong turns, i noticed the useful signals were usually quieter and repeated. now i wait before turning one vivid moment into a plan."),
    ];
    expect(storyBatchIssues(stories, "Mosaic")).toEqual([]);
  });

  it("rejects product-led pivots and repeated brand mentions", () => {
    const stories = Array.from({ length: 5 }, () => draft("then i found Mosaic. Mosaic was the only thing that worked. try it and check it out."));
    const issues = storyBatchIssues(stories, "Mosaic");
    expect(issues.some((issue) => issue.includes("more than once"))).toBe(true);
    expect(issues.some((issue) => issue.includes("sales or solution pivot"))).toBe(true);
    expect(issues.some((issue) => issue.includes("maximum is two"))).toBe(true);
  });
});

export type StoryDraft = {
  title: string;
  angle: string;
  story: string;
};

export const STORY_SYSTEM_PROMPT = `Write five distinct first-person Instagram Reel stories for the supplied product and audience.

THE NON-NEGOTIABLE IDEA
The person and what they experienced are the story. The product is background context, never the protagonist, solution, reveal, lesson, or payoff. Each story must still feel complete and useful if its product reference is removed.

STORY SHAPE
- Write as one person sharing something they genuinely noticed, misunderstood, tried, felt, or learned.
- Use first-person singular language in every story: i, me, or my.
- Begin inside a small, specific moment rather than with a broad claim or manufactured hook.
- Include concrete personal details: what the narrator did, assumed, avoided, noticed, or felt.
- Let the tension come from the narrator's experience, not from an exaggerated villain or fake crisis.
- End with an honest observation or lesson about the narrator, the habit, or the situation. The ending must not mention the product.
- Keep the tone conversational, vulnerable, observant, and lightly self-aware. Do not turn the lesson into a slogan.
- Use lowercase and restrained punctuation.
- Each story must be 75–125 words and remain one continuous static text overlay for all 15 seconds.
- Vary the lived experience across all five stories. Give each a short editorial title and an angle describing the human tension, not a product benefit.

PRODUCT RESTRAINT
- Name the product in no more than two of the five stories.
- In a story that names it, use the product name once, inside one brief incidental clause or sentence.
- Do not explain features, stack benefits, praise the product, or attribute the narrator's transformation to it.
- Never use a solution pivot such as "then i found," "that's when i discovered," "i started using," "the only thing that worked," or "thanks to."
- The product reference should feel as ordinary as mentioning a notebook, calendar, camera, or playlist.
- Do not place the product in the final sentence.

TRUTH AND TONE RULES
- Ground any product capability in the supplied brief.
- The experience may be illustrative, but do not fabricate customers, metrics, awards, testimonials, quotes, or integrations.
- No calls to action, hashtags, emoji, link-in-bio lines, marketing adjectives, or advice to buy, try, download, or sign up.
- Do not reuse wording, characters, or incidents from any reference examples.

Before returning the batch, silently remove any sentence that reads like ad copy. Return exactly the requested schema.`;

const pitchPatterns = [
  /\blink in (?:my |the )?bio\b/i,
  /\b(?:sign up|download it|try it|check it out|get started)\b/i,
  /\bgame[- ]?changer\b/i,
  /\b(?:then i|that'?s when i) (?:found|discovered|started using)\b/i,
  /\bthe only thing (?:that )?(?:worked|still worked)\b/i,
  /\bthanks to\b/i,
];

function occurrences(haystack: string, needle: string) {
  if (!needle.trim()) return 0;
  let count = 0;
  let from = 0;
  const text = haystack.toLocaleLowerCase();
  const search = needle.toLocaleLowerCase();
  while ((from = text.indexOf(search, from)) !== -1) {
    count += 1;
    from += search.length;
  }
  return count;
}

export function storyBatchIssues(stories: StoryDraft[], productName: string) {
  const issues: string[] = [];
  let storiesNamingProduct = 0;

  stories.forEach((draft, index) => {
    const label = `Story ${index + 1}`;
    const productMentions = occurrences(draft.story, productName);
    if (productMentions > 0) storiesNamingProduct += 1;
    if (productMentions > 1) issues.push(`${label} names ${productName} more than once.`);
    if (!/\b(?:i|i'm|i've|i'd|me|my|myself)\b/i.test(draft.story)) issues.push(`${label} is not first-person.`);
    if (pitchPatterns.some((pattern) => pattern.test(draft.story))) issues.push(`${label} contains a sales or solution pivot.`);

    const sentences = draft.story.split(/(?<=[.!?])\s+/).filter(Boolean);
    const finalSentence = sentences.at(-1) || draft.story;
    if (occurrences(finalSentence, productName) > 0) issues.push(`${label} puts the product in the ending.`);
  });

  if (storiesNamingProduct > 2) issues.push(`The product appears in ${storiesNamingProduct} stories; the maximum is two.`);
  return issues;
}

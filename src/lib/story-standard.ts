export type StoryDraft = {
  title: string;
  angle: string;
  story: string;
};

export const STORY_SYSTEM_PROMPT = `Write five distinct first-person Instagram Reel micro-stories for the supplied product and audience.

THE NON-NEGOTIABLE IDEA
The person and what they experienced are the story. The product brief is emotional research, not the subject. Translate its underlying tension into ordinary life: getting ready, a commute, a car ride, a kitchen, waiting somewhere, a friend or family interaction, an awkward habit, a small mistake, or a private realization. The product is never the protagonist, solution, reveal, lesson, or payoff. Each story must feel complete if its product reference is removed.

STORY SHAPE
- Write as one person sharing something they genuinely noticed, misunderstood, tried, felt, or learned.
- Use first-person singular language in every story: i, me, or my.
- Begin inside a small, specific moment rather than with a broad claim or manufactured hook.
- Include concrete personal details: what the narrator did, assumed, avoided, noticed, or felt.
- Let the tension come from the narrator's experience, not from an exaggerated villain or fake crisis.
- End on an earned, personal observation, image, or unresolved feeling. Do not announce "the lesson," give advice, or tie the moment into a neat motivational bow.
- Keep the tone conversational, vulnerable, observant, and lightly self-aware. It should sound like a private story someone happened to share, not a creator teaching an audience.
- Use lowercase and restrained punctuation.
- Each story must be 35–55 words and remain one continuous static text overlay for all 15 seconds. Every word has to earn screen space.
- Vary the lived experience across all five stories. Give each a short editorial title and an angle describing the human tension, not a product benefit.
- At least four stories must happen outside work and contain no workplace, business, customer, industry, product, or software language. No more than one story may use a work setting.
- Do not turn supplied hook angles, features, proof points, roles, or audience labels into story topics. Use them only to infer a human feeling such as hesitation, embarrassment, relief, avoidance, pride, loneliness, or uncertainty.

PRODUCT RESTRAINT
- Stories 1–4 must not name the product at all. Story 5 may name it once, inside one brief incidental clause or sentence, but should usually omit it too.
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
  /\bthe lesson (?:was|is)\b/i,
  /\bwhat (?:it|this) taught me\b/i,
  /\bnow i always\b/i,
];

const businessPatterns = [
  /\b(?:team|teams|client|clients|customer|customers|invoice|invoices|billing|spreadsheet|spreadsheets)\b/i,
  /\b(?:meeting|meetings|roadmap|startup|startups|engineer|engineers|company|companies|coworker|coworkers)\b/i,
  /\b(?:manager|managers|office|workplace|workflow|software|feature|features|deploy|pipeline)\b/i,
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
  let businessStories = 0;

  stories.forEach((draft, index) => {
    const label = `Story ${index + 1}`;
    const productMentions = occurrences(draft.story, productName);
    const wordCount = draft.story.trim().split(/\s+/).filter(Boolean).length;
    if (productMentions > 0) storiesNamingProduct += 1;
    if (businessPatterns.some((pattern) => pattern.test(draft.story))) businessStories += 1;
    if (wordCount < 35 || wordCount > 55) issues.push(`${label} is ${wordCount} words; each story must be 35–55 words.`);
    if (index < 4 && productMentions > 0) issues.push(`${label} names ${productName}; only Story 5 may name the product.`);
    if (productMentions > 1) issues.push(`${label} names ${productName} more than once.`);
    if (!/\b(?:i|i'm|i've|i'd|me|my|myself)\b/i.test(draft.story)) issues.push(`${label} is not first-person.`);
    if (pitchPatterns.some((pattern) => pattern.test(draft.story))) issues.push(`${label} contains a sales or solution pivot.`);

    const sentences = draft.story.split(/(?<=[.!?])\s+/).filter(Boolean);
    const finalSentence = sentences.at(-1) || draft.story;
    if (occurrences(finalSentence, productName) > 0) issues.push(`${label} puts the product in the ending.`);
  });

  if (storiesNamingProduct > 1) issues.push(`The product appears in ${storiesNamingProduct} stories; the maximum is one.`);
  if (businessStories > 1) issues.push(`${businessStories} stories use business or workplace language; the maximum is one.`);
  return issues;
}

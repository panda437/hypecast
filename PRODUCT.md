# Hypecast — GrowthX Build Week MVP

## 1. Product thesis

Hypecast turns one app URL into a reusable AI creator and five downloadable Instagram Reels. The first run deliberately does **not** generate AI video: it reuses the approved creator portrait as a 15-second 9:16 background and adds a subtle local push-in during export.

This tests whether a credible creator sharing recognizable experiences can earn attention before paying for motion. The story must work as human content even when the product reference is removed. AI-generated background videos become optional reusable library assets in the second run. “Thirty reels per month” remains a future goal, not the Build Week promise.

## 2. The job

When a founder needs organic reach, they want enough credible posts to test several hooks without becoming a full-time producer, filming themselves, or directing every generation across multiple tools.

The first product promise is:

> Paste a product link, approve the direction, select an AI creator, and export five editable 15-second story reels with zero video-generation spend.

## 3. Target user and trigger

**Primary user:** A founder or small product team with a public product page and limited distribution.

**Trigger:** A launch is approaching, current posts are not reaching enough people, or the founder needs a repeatable content format.

**Trust gap:** The user does not yet know whether an AI creator or the proposed hooks will feel credible. Paying for video before validating those decisions compounds the risk.

## 4. First-run format

- **Background:** the exact approved creator portrait.
- **Motion:** a slow local push-in rendered in the browser; no video model call.
- **Foreground:** one continuous story overlay, editable as a single text block.
- **Duration:** 15 seconds.
- **Frame:** 9:16 portrait with Instagram-safe text zones.
- **Audio:** none; platform-native music can be added when posting.
- **Output:** five H.264 MP4 files.
- **Video-generation cost:** $0.

## 5. End-to-end flow

The product has three intentionally distinct surfaces:

- **Public homepage:** explains the promise, shows the real studio workflow, and offers sign-in or a zero-credit demo. It is not the editor.
- **Cast onboarding:** a focused three-decision flow for product, creative direction, and cast selection.
- **Cast studio:** the persistent signed-in workspace for the selected creator, reusable background library, story batch, live preview, editing, and export.

### Step 1 — Sign in

Production generation requires authentication because OpenAI image calls still have a marginal cost. The zero-credit demo can remain available without paid calls.

### Step 2 — Analyze the product

The user enters a public product URL. Hypecast safely extracts visible evidence and uses OpenAI to create an editable brief containing the product summary, audience, problem, differentiators, proof points, tone, creator persona, and human story territories.

The user approves this brief before media spend begins.

### Step 3 — Choose the AI creator

Hypecast produces five distinct creator candidates that fit the approved persona. Each has a consistent character bible and portrait preview. The user selects one creator.

### Step 4 — Lock the portrait

The selected candidate portrait becomes the first reusable background asset. The first run creates no additional reference images. This removes three image calls from the earlier scope.

The user approves the portrait before composition. Future image or video additions must preserve its character bible.

### Step 5 — Add the $0 background

Hypecast places the portrait in the project’s background library as a 15-second still-based asset. The browser preview and exporter apply a gentle push-in so the result does not feel completely static.

No OpenRouter, fal, or other video request occurs in this step.

### Step 6 — Compose five reels

AI writes five first-person stories about something the creator experienced, assumed, noticed, changed, or learned. The reusable structure is a small personal moment, the narrator’s original assumption, what changed, and an earned observation. The product is not the solution or payoff: no more than two stories in a batch may name it, each may name it once, and the final sentence must stay human. A validation pass automatically rewrites batches that slip into calls to action, feature pitching, or “then I found the product” pivots.

All five may reuse the same portrait because the first hypothesis is whether the creator’s perspective feels worth following—not whether the audience will tolerate five miniature ads.

The user can:

- edit the exact text;
- export the generated copy as-is or optionally edit the one full-duration story overlay before download;
- choose top, center, or bottom safe-zone placement;
- choose the text treatment;
- preview the 15-second reel;
- export the current edit as a silent MP4.

## 6. Second-run background library

Video generation is a library-building action, not part of the first-run funnel.

Once the still-based format is validated, the user may generate a small number of new background videos through the provider adapter. A generated asset should be stored once and reused across many hooks and future batches. The product should show the estimated cost before submission and never regenerate a background merely because the hook text changed.

The existing OpenRouter adapter discovers compatible models dynamically and supports asynchronous submission, polling, and retrieval. It remains inactive until the user explicitly chooses to add motion to the library. A fal adapter remains available as a later quality tier.

## 7. MVP scope

### Must have this sprint

- Authentication integration with a clearly labelled local/demo fallback.
- Safe public URL validation, extraction, and editable AI analysis.
- Five creator candidates and one explicit selection.
- Reuse of the selected portrait without extra reference-image generation.
- One 15-second still-based background asset.
- Five AI-written first-person reel stories with restrained, optional product presence.
- One editable full-duration safe-zone story overlay per reel.
- In-browser preview.
- Downloadable silent 9:16 H.264 MP4 export.
- Local persistence plus authenticated Convex project/asset persistence.
- A provider-independent video adapter kept outside the first-run path.
- Clear disclosure that the first-run background is a still, not generated video.
- A deployable Next.js application, public repository, and verified Vercel URL.

### Explicitly deferred

- Video generation during onboarding or the first batch.
- Three generated reference images.
- Three generated background videos per project.
- Thirty generated reels per month.
- Automated Instagram account creation or posting.
- Music, voiceover, dialogue, or lip-sync.
- A CapCut-style timeline editor or timed multi-card text.
- Multiple creator identities per project.
- Analytics and automatic hook optimization.
- Dodopayments, subscriptions, credits, and invoices.

### Next useful additions

- “Add motion to library” as an explicit paid/credit action.
- Reuse counts and cost-per-use for every background.
- One-click replacement of the still with an existing library clip.
- Brand-kit and typography presets.
- Hook performance tracking.
- Dodopayments credits after actual willingness to pay is established.

## 8. Technical choices

### Application

- Next.js App Router on Vercel.
- TypeScript and React.
- Server routes for URL extraction and paid provider calls; secrets never reach the browser.

### AI

- OpenAI for product analysis, structured creator concepts, hooks, and creator portraits.
- No OpenAI or third-party video call in the first run.
- Structured outputs for text artifacts and a locked character bible for future media.

### Data

- Convex stores ownership, separate project snapshots, approved decisions, generated assets, background-library entries, versioned story batches, export records, jobs, reels, and edit state.
- Inline generated images are uploaded to storage for resumability after authentication is configured.
- Returning signed-in users restore the latest cloud project and can reopen earlier studios; device storage remains a signed-out fallback.
- A completed MP4 downloads immediately, then uploads to the project’s Convex asset library without blocking the download.

### Export

- The browser draws the portrait, local push-in, and current text state into a 720×1280 canvas.
- MediaBunny encodes a silent 15-second H.264 MP4.
- A file is complete only after the browser returns a real downloadable buffer.

### Future video adapter

- OpenRouter remains the economy/default adapter because model choice and pricing can change without changing the editor.
- A generated video is ingested into the reusable library, not bound to one reel.
- The same library asset may be used across many text stories.
- Hypecast never labels a video generated until the provider returns a playable result.

## 9. Assumptions

- The product URL is public and contains enough evidence for a useful brief.
- A founder can choose a credible creator from five candidates.
- Hook and positioning quality matter more than background motion in the first validation.
- One creator portrait can support five distinct posts without blocking learning.
- A subtle local push-in is sufficient for the first posting test.
- Users prefer adding trending music inside Instagram.
- Generated motion becomes economical only when reused across multiple reels.

## 10. Acceptance criteria

The first-run MVP is accepted only if a user can:

1. Enter the demo or sign in for live generation.
2. Submit a valid public product URL and review extracted evidence.
3. Edit and approve the AI brief.
4. See five creator candidates and select one.
5. Lock that existing portrait without triggering more reference-image calls.
6. Add the portrait as a ready 15-second background without a video-provider call.
7. Receive five relevant product-native stories with the approved narrative structure.
8. Edit the one continuous text block shown throughout the 15-second canvas.
9. Preview the same approved portrait behind every reel.
10. Download five silent MP4 files matching the current edits.
11. Reload and resume without losing approved decisions.
12. Rewrite a batch without erasing earlier scripts, then reopen either batch later.
13. Start another product without overwriting the previous cast, backgrounds, reels, or export records.

Technical acceptance also requires:

- private-network and oversized URL fetches are blocked;
- secrets remain outside client bundles and repository history;
- unauthenticated production users cannot trigger paid media calls;
- changing hook text never triggers image or video regeneration;
- first-run code never calls the video-provider routes;
- tests, lint, typecheck, build, and browser export pass;
- deployment and generated-media claims are made only after verification.

## 11. Risks and mitigations

| Risk | Why it matters | MVP mitigation |
| --- | --- | --- |
| A still image feels too static | Watch time may suffer | Use a subtle push-in, strong timed hooks, and platform-native audio |
| Five candidate images still cost money | Creator selection is the largest first-run media cost | Require brief approval first; later test text-first casting with one chosen image |
| Stories turn into disguised ads | The account loses trust and the creator feels synthetic | Make the lived experience primary, restrict product naming to two stories, ban solution pivots, and run an automatic quality check |
| Stories invent product claims | The founder could publish misleading content | Ground in extracted evidence and require editable approval |
| Export fails in some browsers | A preview alone does not finish the job | Detect encoder failures and return an actionable error |
| Video assets are generated but rarely reused | Library economics break | Show reuse counts and treat generation as an explicit library investment |
| AI posts receive low reach | File creation is not business value | Test five hooks manually before automating volume |

## 12. Riskiest product guess

The critical hypothesis is:

> A credible creator sharing a personal, useful experience can earn attention while the product remains an almost invisible part of the world—not the point of the post.

A useful initial signal is one of five posts reaching 500 organic views or clearly outperforming the founder’s recent median without trust backlash.

## 13. No-code validation

1. Pick one Build Week product with founder permission.
2. Approve one creator portrait.
3. Write five first-person experiences; mention the product in no more than two.
4. Export five 15-second still-based reels using the same portrait.
5. Post one per day with native Instagram audio.
6. Record 24-hour and 72-hour views, completion rate, shares, saves, profile visits, and link clicks.
7. Ask whether motion quality—not hook or positioning—was the main reason for weak performance.
8. Generate one reusable motion background only if the evidence says motion is the next constraint.

## 14. Definition of success

One founder downloads five usable still-based reels, posts at least three, and learns enough from the hooks to justify either another $0 batch or one deliberate investment in a reusable video-library asset.

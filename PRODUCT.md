# CueFace — GrowthX Build Week MVP

## 1. Product thesis

CueFace turns one app URL into a reusable AI creator and five downloadable Instagram Reels. The first run deliberately does **not** generate AI video: it reuses the approved creator portrait as a 15-second 9:16 background and adds a subtle local push-in during export.

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
- **Video credits used:** none.

## 5. End-to-end flow

The product has three intentionally distinct surfaces:

- **Public homepage:** explains the promise, shows the real studio workflow, and offers sign-in or a zero-credit demo. It is not the editor.
- **Cast onboarding:** a focused three-decision flow for product, creative direction, and cast selection.
- **Cast studio:** the persistent signed-in workspace for the selected creator, reusable background library, story batch, live preview, editing, and export.

Navigation is explicit. The studio always shows both **Back to cast** and **Change cast**; the CueFace logo is not the only exit. Returning to cast selection preserves the current studio. Choosing a different creator starts a separate studio record so the former cast, assets, scripts, and exports remain available under Recent Studios.

### Step 1 — Sign in

Production generation requires authentication because OpenAI image calls still have a marginal cost. The zero-credit demo can remain available without paid calls.

### Step 2 — Analyze the product

The user enters a public product URL. CueFace safely extracts visible evidence and uses OpenAI to create an editable brief containing the product summary, audience, problem, differentiators, proof points, tone, creator persona, and human story territories.

The user approves this brief before media spend begins.

### Step 3 — Choose the AI creator

CueFace produces five distinct creator candidates that fit the approved persona. Each has a consistent character bible and portrait preview. The user selects one creator.

### Step 4 — Lock the portrait

The selected candidate portrait becomes the first reusable background asset. The first run creates no additional reference images. This removes three image calls from the earlier scope.

The user approves the portrait before composition. Future image or video additions must preserve its character bible. Motion planning is free: the studio offers concrete performance-and-camera recipes (for example a hair tuck and caught glance, a parked-car turn and smile, or a front-to-profile camera arc), shows whether the current still can support the idea, and exposes the exact editable prompt before any provider request.

Every future video is image-to-video. The approved cast portrait, or an approved still derived from it, is required as the identity source. CueFace shows the editable motion direction and the complete identity-locked provider prompt before spending credits. After submission, the exact prompt and source image remain visible and saved with the video asset.

### Step 5 — Add the included background

CueFace places the portrait in the project’s background library as a 15-second still-based asset. The browser preview and exporter apply a gentle push-in so the result does not feel completely static.

No OpenRouter, fal, or other video request occurs in this step.

### Step 6 — Compose five reels

AI writes five first-person stories about something the creator experienced, assumed, noticed, changed, or learned. The reusable structure is a small personal moment, the narrator’s original assumption, what changed, and an earned observation. The product is not the solution or payoff: only Story 5 may name it, at most once, and omission is preferred. The final sentence must stay human. A validation pass automatically rewrites batches that slip into calls to action, feature pitching, or “then I found the product” pivots.

All five may reuse the same portrait because the first hypothesis is whether the creator’s perspective feels worth following—not whether the audience will tolerate five miniature ads.

The user can:

- edit the exact text;
- export the generated copy as-is or optionally edit the one full-duration story overlay before download;
- choose top, center, or bottom safe-zone placement;
- choose the text treatment;
- preview the 15-second reel;
- export the current edit as a silent MP4;
- export all five current edits as one ZIP, with visible sequential progress;
- see Saving, confirmed Saved, or Save failed rather than an unverified autosave claim;
- connect an Instagram Creator or Business account and publish a cloud-saved reel without leaving CueFace when the publishing beta is enabled.

## 6. Second-run background library

Video generation is a library-building action, not part of the first-run funnel.

Each subscriber has a durable allowance of 100 video credits. One successfully accepted AI video generation reserves and consumes one credit. A rejected or failed generation returns the credit automatically. Still-image reels and every preview, edit, export, download, and Instagram publish action consume no video credits.

Once the still-based format is validated, the user may generate new background videos through the provider adapter. Every AI motion asset is generated as one continuous 15-second shot; CueFace never repeats a shorter segment to fill the reel. A generated asset should be stored once and reused across many hooks and future batches. The product charges one video credit per AI video generation and never charges for previews, edits, exports, downloads, or reusing an existing background.

The studio’s **All cast assets** library is append-only from the user’s perspective. It lists the approved portrait, every derived portrait, every queued or completed video, and its status. **New cast asset** opens an explicit image/video composer. New images use the approved cast portrait as the identity source and exclude products, screenshots, logos, text, and collage elements. The video composer is visible but disabled with a clear explanation until an OpenRouter or fal credential is configured.

The OpenRouter adapter supports asynchronous submission, polling, and retrieval. Provider selection and wholesale pricing remain server-side and are never shown to subscribers. A private runtime price ceiling rejects or replaces models that exceed the operator’s budget. Generation remains inactive until the user approves the final prompt and presses the one-credit generation button. A fal adapter remains available as a later quality tier.

## 7. MVP scope

### Must have this sprint

- Authentication integration with a clearly labelled local/demo fallback.
- Safe public URL validation, extraction, and editable AI analysis.
- Five creator candidates and one explicit selection.
- Reuse of the selected portrait without extra reference-image generation.
- One 15-second still-based background asset.
- Five AI-written first-person reel stories with restrained, optional product presence.
- One editable full-duration safe-zone story overlay per reel.
- Each generated story is a readable 35–55-word personal micro-story; at least four of five avoid work and business settings entirely.
- Stories 1–4 never name the product. Story 5 may mention it once incidentally, but omission is preferred.
- In-browser preview.
- Downloadable silent 9:16 H.264 MP4 export.
- One-click ZIP export of all five current reels.
- Local persistence plus authenticated Convex project/asset persistence.
- Confirmed cloud-save state based on the completed Convex mutation.
- Direct Instagram Reel publishing for connected professional accounts, protected by a global kill switch and a per-account switch.
- Explicit studio navigation, non-destructive cast switching, and an all-assets library.
- On-demand identity-consistent cast images that append to the library rather than replacing existing assets.
- A provider-independent video adapter kept outside the first-run path.
- Clear disclosure that the first-run background is a still, not generated video.
- A deployable Next.js application, public repository, and verified Vercel URL.

### Explicitly deferred

- Video generation during onboarding or the first batch.
- Three generated reference images.
- Three generated background videos per project.
- Thirty generated reels per month.
- Automated Instagram account creation. Direct publishing is limited to user-connected professional Instagram accounts and remains behind a global kill switch.
- Music, voiceover, dialogue, or lip-sync.
- A CapCut-style timeline editor or timed multi-card text.
- Multiple creator identities per project.
- Analytics and automatic hook optimization.
- Dodopayments checkout, subscription renewal webhooks, and invoices.

### Next useful additions

- Subscription-cycle credit replenishment through Dodopayments.
- Reuse counts and cost-per-use for every background.
- One-click replacement of the still with an existing library clip.
- Brand-kit and typography presets.
- Hook performance tracking.
- Plan upgrades and credit top-ups after actual willingness to pay is established.

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
- Video jobs are added to the saved project before provider submission, survive refresh while queued, and are polled to completion.
- Completed provider videos are copied into Convex storage; the provider URL is not treated as permanent project storage.
- Returning signed-in users restore the latest cloud project and can reopen earlier studios; device storage remains a signed-out fallback.
- A completed MP4 downloads immediately, then uploads to the project’s Convex asset library without blocking the download.

### Export

- The browser draws the portrait, local push-in, and current text state into a 720×1280 canvas.
- MediaBunny encodes a silent 15-second H.264 MP4.
- A file is complete only after the browser returns a real downloadable buffer.

### Future video adapter

- OpenRouter remains the economy/default adapter because model choice and pricing can change without changing the editor.
- The production credential is a server-only Vercel secret; no OpenRouter credential may appear in this document or repository.
- Model discovery enforces 15-second, 9:16, 480p image-to-video support and a private operator-controlled price ceiling.
- A generated video is ingested into the reusable library, not bound to one reel.
- The same library asset may be used across many text stories.
- CueFace never labels a video generated until the provider returns a playable result.

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
14. Use a visible Back to cast or Change cast control without knowing that the logo is clickable.
15. Generate an additional identity-consistent portrait and see it appended to All cast assets alongside every earlier image and video.
16. Select a different creator without deleting the previous creator’s studio; reopen the former studio from Recent Studios.
17. See a confirmed cloud-save timestamp after editing copy, media, typography, placement, or treatment.
18. Download all five current reels in one ZIP without browser multi-download prompts.
19. When publishing is enabled and Meta has approved the app, connect a professional Instagram account, turn publishing on or off, edit the caption, and publish a cloud-saved reel without opening Instagram.

Technical acceptance also requires:

- private-network and oversized URL fetches are blocked;
- secrets remain outside client bundles and repository history;
- unauthenticated production users cannot trigger paid media calls;
- changing hook text never triggers image or video regeneration;
- first-run code never calls the video-provider routes;
- unavailable video providers are shown as unavailable before submission rather than failing silently;
- queued video records and exact prompts are saved before polling, and completed clips are copied into durable project storage;
- Instagram tokens are encrypted before database storage and are never returned to browser code;
- the production-wide Instagram kill switch blocks connection and publishing routes when disabled;
- tests, lint, typecheck, build, and browser export pass;
- deployment and generated-media claims are made only after verification.

## 11. Risks and mitigations

| Risk | Why it matters | MVP mitigation |
| --- | --- | --- |
| A still image feels too static | Watch time may suffer | Use a subtle push-in, strong timed hooks, and platform-native audio |
| Five candidate images still cost money | Creator selection is the largest first-run media cost | Require brief approval first; later test text-first casting with one chosen image |
| Stories turn into disguised ads | The account loses trust and the creator feels synthetic | Make the lived experience primary, restrict product naming to Story 5 only, ban solution pivots, and run an automatic quality check |
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
3. Write five first-person experiences; only Story 5 may mention the product, and omission is preferred.
4. Export five 15-second still-based reels using the same portrait.
5. Post one per day with native Instagram audio.
6. Record 24-hour and 72-hour views, completion rate, shares, saves, profile visits, and link clicks.
7. Ask whether motion quality—not hook or positioning—was the main reason for weak performance.
8. Generate one reusable motion background only if the evidence says motion is the next constraint.

## 14. Definition of success

One founder downloads five usable still-based reels, posts at least three, and learns enough from the hooks to justify another batch or using one video credit on a reusable library asset.

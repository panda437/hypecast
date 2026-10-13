# Hypecast — GrowthX Build Week MVP

## 1. Product thesis

Hypecast turns one app URL into a small, reusable AI creator and a launch-ready batch of silent Instagram Reels. A founder should be able to move from “my product has no reach” to five downloadable 9:16 videos without writing every hook, art-directing every shot, or appearing on camera.

The initial batch is **five finished reels**. “Thirty reels per month” is the future recurring product promise, not the Build Week MVP.

## 2. The job

When a startup founder, indie hacker, or product builder needs organic reach for an app, they want a repeatable creator identity and a batch of short-form posts so they can test hooks at useful volume without becoming a full-time video producer.

Today they either:

1. Write a script and direct each generation themselves across tools such as Gemini or Higgsfield.
2. Hire UGC creators or an agency.
3. Film themselves.
4. Post a few inconsistent AI experiments.
5. Make nothing because the workflow is too slow or uncomfortable.

The desired feeling is speed and momentum. The desired outcome is a credible posting habit that gives the product more chances to earn attention.

## 3. Target user and trigger

**Primary user:** A founder or small product team with a live product page and little or no distribution.

**Trigger:** They are about to launch, just launched, or see that their existing posts are not reaching enough people.

**What they already pay for:** AI generation tools, design tools, UGC ads, creators, editors, or agencies.

**Trust gap:** They do not know whether an AI creator will look consistent, whether the reel will feel native to Instagram, or whether the generated hook will accurately represent the product.

## 4. Product promise

Paste a product link, approve the positioning, choose one of five creator candidates, and get five editable, silent, vertical reels built from three consistent background clips.

The reel format is intentionally simple:

- **Background:** a natural-looking AI creator working on a laptop, checking a phone, walking, or reacting subtly.
- **Foreground:** one readable hook or a short sequence of timed text cards; the text carries the full message.
- **Audio:** none. The user can add platform-native music when posting.
- **Frame:** 9:16 portrait, approximately 15 seconds, with text inside Instagram-safe zones.

## 5. End-to-end flow

### Step 1 — Sign in

The user signs in before generation because video generation has a real marginal cost. The product must also enforce authorization inside every server route or database operation, not only in navigation.

### Step 2 — Analyze the product

The user enters a public product URL. Hypecast extracts the page title, description, visible copy, and useful metadata. AI turns that evidence into:

- a plain-language product summary;
- target audience and use case;
- differentiators and proof points;
- five hook territories;
- a detailed promotional persona for the creator.

The user can edit and approve this brief before any expensive media generation.

### Step 3 — Choose the AI creator

Hypecast generates five visually distinct creator candidates that all fit the approved persona. Each candidate includes a name, visual description, on-camera energy, wardrobe, and a portrait preview.

The user selects exactly one candidate. The selection becomes the immutable character anchor for the project unless the user explicitly starts over.

### Step 4 — Build references

Hypecast creates three 9:16 reference images of the selected creator:

1. front-facing medium shot;
2. three-quarter working-at-laptop shot;
3. casual phone-in-hand lifestyle shot.

All three prompts share a locked character bible: face, hair, age range, skin tone, body type, wardrobe palette, lighting, lens, and realism constraints. Later images use the first accepted portrait as an image reference where the model supports it.

The user reviews the trio before video generation. They can regenerate a single bad reference rather than paying to restart the entire project.

### Step 5 — Generate three background clips

Hypecast sends the accepted references and simple motion prompts to a video-provider adapter. It requests three silent, portrait, 15-second clips:

1. working naturally at a laptop;
2. checking a phone and reacting subtly;
3. walking or turning toward camera in a simple environment.

Jobs are asynchronous. Each clip visibly reports queued, generating, ready, or failed. A clip is never labelled ready until the provider returns a playable asset that the app can load.

### Step 6 — Compose five reels

AI writes five product-specific hooks. The editor pairs those hooks with the three clips, reusing clips with different crop, start point, or text treatment where needed.

The user can:

- edit the exact text;
- choose a single full-duration overlay or up to three timed text cards;
- move between safe-zone text positions;
- adjust text size and contrast treatment;
- preview the final 9:16 result with sound off;
- export each reel as an MP4 with text burned in.

Export is performed from the actual selected clip and current edit state. A successful download is the definition of a finished reel.

## 6. MVP scope

### Must have this sprint

- Authentication with a demo-friendly local fallback and production provider integration.
- Product URL validation, safe fetching, extraction, and editable AI analysis.
- Five creator candidates with images and a clear selection step.
- Three consistent reference images for the selected creator.
- A video-provider interface plus one production adapter.
- Three asynchronous 15-second 9:16 silent clip jobs.
- Five AI-written reel hooks.
- A reel editor with readable safe-zone overlays and timed cards.
- In-browser preview.
- Download/export of five silent MP4 reels.
- Durable project, asset, generation-job, reel, and edit records in Convex.
- Clear progress, cost boundary, retry, failure, and empty states.
- Local demo mode that exercises the workflow without pretending external generations occurred.
- A documented, deployable Next.js app, public GitHub repository, and verified Vercel deployment when credentials allow.

### Explicitly not in this sprint

- Thirty generated reels per month.
- Automated Instagram account creation or posting.
- Music licensing, soundtrack selection, voiceover, dialogue, or lip-sync.
- A timeline editor comparable to CapCut.
- Multiple creator identities inside one project.
- Team workspaces, roles, or collaboration.
- Performance analytics or automatic hook optimization.
- Dodopayments checkout, subscriptions, metering, or invoices.
- Native mobile apps.

### Nice after the core loop works

- One-click regenerate for only the weakest reel.
- Brand kit and typography presets.
- A/B hook variants tied to view data.
- Scheduled posting.
- 30-reel monthly batches.
- Dodopayments credits and plans.

## 7. Technical choices

### Application

- Next.js App Router on Vercel.
- TypeScript, React, and a responsive dark creator-studio UI.
- Server-side routes for URL extraction and paid provider calls; secrets never reach the browser.

### AI

- OpenAI for product analysis, persona and hook writing, and creator/reference image generation.
- Structured outputs for all editable text artifacts.
- Image generation produces portrait-first assets with an explicit character bible.

### Video provider

The initial production adapter targets **OpenRouter's asynchronous video API** and discovers the lowest-cost current model that supports a 9:16 first-frame image, 15-second output, 480p validation resolution, and audio-off generation. It keeps the video-provider contract independent from the editor and allows a specific model to be pinned by environment variable after quality testing.

At the current catalog price, the 480p validation setting is about **$0.02 per output second plus $0.01 for the input image**, or roughly **$0.31 per 15-second clip / $0.93 for three** before retries. The 720p option is roughly **$0.46 per clip / $1.38 for three**. The app must discover supported models and prices from OpenRouter rather than assuming a model will remain available. There is currently no free video-output model in OpenRouter's free catalog.

OpenRouter normalizes submit, polling, and result retrieval across providers. A fal/Kling adapter remains available as a later quality tier, and the shared adapter contract allows either provider to change without touching the editor.

### Data

- Convex stores users, projects, approved briefs, creator candidates, selected creator, reference assets, provider jobs, clips, reels, and edit state.
- Large generated media remains in provider/object storage; Convex stores URLs, ownership, state, and metadata.

### Export

- The editor renders the visible composition into a downloadable silent MP4 in the browser when browser codec support permits.
- The UI must detect unsupported export capability and give an actionable error. A server render service is a post-MVP fallback, not a fake success state.

## 8. Assumptions

- The submitted product URL is public and can be fetched without authentication.
- A founder can judge and approve product positioning from an editable summary.
- Three accepted reference images are enough for useful cross-clip identity consistency.
- Reusing three background clips across five text stories is acceptable because the text is the primary creative variable.
- Users prefer adding trending audio inside Instagram.
- A 720p portrait export is sufficient for the Build Week test.
- Provider generation may take minutes; progress and resumability are therefore product requirements.
- Generated output is probabilistic. Regeneration and honest failure states are expected, not exceptional.

## 9. Acceptance criteria

The MVP is accepted only if a first-time user can complete this path:

1. Sign in or enter clearly labelled local demo mode.
2. Submit a valid product URL and see extracted evidence.
3. Receive an AI brief and edit it before approval.
4. See five distinct creator candidates and select one.
5. Generate, view, and approve three reference images of the same creator.
6. Submit three video jobs and see truthful status for each.
7. Play every returned background clip in a 9:16 preview.
8. Receive five relevant hooks, edit them, and preview safe-zone overlays.
9. Download five silent MP4 files whose visuals and text match the current edits.
10. Reload and resume the same project without losing approved decisions.

Technical acceptance also requires:

- unauthenticated users cannot read or mutate another user's project;
- fetch endpoints block localhost, private networks, non-HTTP protocols, redirects to private hosts, and oversized pages;
- API keys are absent from client bundles and repository history;
- expensive actions are idempotent and cannot be triggered repeatedly by double-clicking;
- build, typecheck, and core flow tests pass;
- a deployment is only called live after its URL responds successfully;
- videos are only called generated after a real provider result has been played or downloaded.

## 10. Risks and mitigations

| Risk | Why it matters | MVP mitigation |
| --- | --- | --- |
| Creator identity drifts between clips | The account stops feeling like one recognizable creator | Lock a character bible, use three approved references, pass a reusable element to the provider, and regenerate single failures |
| Video cost is consumed before intent is clear | Build Week tests can become expensive quickly | Put brief, candidate, and reference approvals before video submission; show the estimated batch cost |
| URL fetching becomes an SSRF vector | A public form could access internal services | Resolve and block private IPs, restrict protocols and ports, cap redirects/bytes/time, and parse text only |
| Hooks hallucinate claims | Founders could publish misleading posts | Ground hooks in extracted evidence, show the source brief, and require editable approval |
| Export fails on some browsers | A preview without a postable file is not the job | Detect MediaRecorder/codec support early and expose an actionable fallback state |
| Long generation latency feels broken | Users may leave or resubmit jobs | Persist jobs, poll with backoff, show queue state, and make generation resumable |
| AI reels receive low reach | The product does not create business value | Test posts manually before investing in 30/month automation |
| Platform policy changes | Synthetic-media labelling or API restrictions may change | Keep provider and publishing layers replaceable; include a disclosure reminder |

## 11. Riskiest product guess

The critical hypothesis is not “AI can produce five files.” It is:

> A consistent, silent AI-creator reel with a product-specific text story can earn enough attention to justify repeated posting.

The initial threshold is directional: at least one of five posts reaches 500 organic views or clearly outperforms the founder's recent median, while maintaining acceptable comments/saves and no trust backlash.

## 12. No-code validation while building

1. Pick one real GrowthX Build Week product with founder permission.
2. Write five hooks from its landing page and generate one consistent creator/reference set manually.
3. Produce five silent text-overlay reels with the same three background clips.
4. Post one per day on a new, clearly disclosed experimental account.
5. Record 24-hour and 72-hour views, average watch time, completion rate, shares, saves, profile visits, and link clicks.
6. Interview the founder after the batch: what did they edit, what felt unsafe, and would they run the next five?
7. Continue only if the batch is publishable without hand-rebuilding each reel and at least one post meets the attention threshold.

## 13. Definition of success for Build Week

One founder completes the full workflow, downloads five genuinely usable reels, posts at least three, and chooses to return for another batch based on the speed and creative quality—not because the demo implied that unfinished media existed.

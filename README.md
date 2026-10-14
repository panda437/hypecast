# Hypecast

Hypecast turns one public product URL into an AI creator and five editable Instagram Reels.

The first run is intentionally inexpensive: after the user chooses a creator, Hypecast reuses that exact portrait as a 15-second 9:16 background. The browser adds a gentle push-in and burns the editable text into a silent MP4. No video model is called.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and choose **Try the zero-credit demo** to exercise the full approval, editing, and export path without provider calls.

## First-run services

- OpenAI: product analysis, creator concepts, creator portraits, and reel hooks.
- Convex: authenticated project history, generated-media storage, story batches, casts, and export records.
- Clerk: production login.
- Browser: 15-second 720×1280 silent H.264 export.

## Persistence

- Every product is stored as a separate project instead of overwriting one global workspace.
- Signed-in users restore their latest Convex-backed studio and can reopen recent projects.
- Every generated or rewritten story batch remains selectable in Story history.
- Creator candidates, the approved cast, reusable backgrounds, current edits, and export records are included in the project snapshot.
- Completed browser exports download immediately and are then uploaded to Convex storage for the signed-in user.
- Signed-out demo work is retained on the current device as a fallback, but cross-device recovery requires sign-in.

`OPENROUTER_API_KEY` is not required for the first run.

## Future background library

OpenRouter and fal adapters remain available for a second-run **Add motion to library** feature. A generated background should be paid for once, stored, and reused across many hooks and batches. Video generation never occurs merely because the user changes reel text.

## Quality gates

```bash
npm test
npm run lint
npm run build
```

See [PRODUCT.md](./PRODUCT.md) for the resolved scope, assumptions, acceptance criteria, risks, and no-code validation plan.

## MVP boundary

- Initial output: five 15-second reels using one approved portrait.
- Initial video-generation spend: $0.
- Future target: a reusable motion-background library and 30 reels per month.
- Payments: deferred; Dodopayments is the planned billing layer.
- Publishing: manual; Hypecast does not create or post to Instagram accounts.

A generated-media claim is made only after a real provider result can be played or exported. The still-based first run is labelled honestly throughout the product.

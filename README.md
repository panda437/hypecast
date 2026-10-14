# Hypecast

Hypecast turns one public product URL into an AI creator and five editable, first-person Instagram Reels. The experience and lesson lead; the product stays incidental and may not appear at all.

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

`OPENROUTER_API_KEY` is not required for the first run. When configured, it must remain a server-only environment variable.

## Second-run background library

The studio’s **Plan motion before spending** action uses free, editable motion recipes before an explicit OpenRouter call. Every new paid motion asset is one continuous 15-second generation—Hypecast does not repeat a shorter segment to fill the reel. The economy configuration selects 9:16, 480p, first-frame image-to-video models at or below $0.03 per output second. The currently pinned model is `x-ai/grok-imagine-video-1.5-lite`, verified at $0.02 per second plus a $0.01 image-input charge, or about $0.31 for 15 seconds. A generated background is paid for once, copied into Convex storage, and reused across many story batches. Video generation never occurs merely because the user changes reel text.

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

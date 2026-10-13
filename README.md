# Hypecast

Hypecast turns one public product URL into an AI creator and five editable Instagram Reels.

The first run is intentionally inexpensive: after the user chooses a creator, Hypecast reuses that exact portrait as a 17-second 9:16 background. The browser adds a gentle push-in and burns the editable text into a silent MP4. No video model is called.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and choose **Try the zero-credit demo** to exercise the full approval, editing, and export path without provider calls.

## First-run services

- OpenAI: product analysis, creator concepts, creator portraits, and reel hooks.
- Convex: authenticated project snapshots and generated-image storage.
- Clerk: production login.
- Browser: 17-second 720×1280 silent H.264 export.

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

- Initial output: five 17-second reels using one approved portrait.
- Initial video-generation spend: $0.
- Future target: a reusable motion-background library and 30 reels per month.
- Payments: deferred; Dodopayments is the planned billing layer.
- Publishing: manual; Hypecast does not create or post to Instagram accounts.

A generated-media claim is made only after a real provider result can be played or exported. The still-based first run is labelled honestly throughout the product.

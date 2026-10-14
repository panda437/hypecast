# CueFace

CueFace turns one public product URL into an AI creator and five editable, first-person Instagram Reels. The experience and lesson lead; the product stays incidental and may not appear at all.

The first run is intentionally inexpensive: after the user chooses a creator, CueFace reuses that exact portrait as a 15-second 9:16 background. The browser adds a gentle push-in and burns the editable text into a silent MP4. No video model is called.

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

The studio’s motion planner lets subscribers choose and edit a direction before using a video credit. Every new motion asset is one continuous 15-second generation—CueFace does not repeat a shorter segment to fill the reel. Provider selection and wholesale pricing stay server-side behind an operator-controlled ceiling. Each accepted AI video generation consumes one of the subscriber’s 100 video credits; rejected or failed jobs return the credit. The generated background is copied into Convex storage and can be reused across many story batches. Previewing, editing, exporting, downloading, publishing, or changing reel text never consumes a video credit.

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
- Publishing: authenticated Instagram Creator/Business accounts can publish saved exports through Meta's API when the server-side publishing flag and credentials are enabled.

## Instagram publishing beta

Publishing is protected by two controls: the global `INSTAGRAM_PUBLISHING_ENABLED` kill switch and a per-connected-account on/off switch. The global switch defaults off. Tokens are encrypted before Convex storage and never enter the browser bundle. A reel must finish uploading to CueFace cloud storage before Meta can fetch and publish it.

Required server variables are documented in `.env.example`. Meta must approve `instagram_business_basic` and `instagram_business_content_publish` before arbitrary customer accounts can use the production app.

A generated-media claim is made only after a real provider result can be played or exported. The still-based first run is labelled honestly throughout the product.

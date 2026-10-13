# Hypecast

Hypecast is a GrowthX Build Week MVP that turns one public product URL into a consistent AI creator, three silent 9:16 background clips, and five editable Instagram Reels.

The zero-credit demo exercises the complete approval and editing workflow with clearly labelled motion mocks. Live mode uses OpenAI for grounded text and creator/reference images, then OpenRouter's least-expensive compatible video model through a provider adapter. No demo asset is presented as an AI-generated video.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For the no-cost path, select **Try the zero-credit demo**.

## Configuration

Copy `.env.example` and provide only the services you want to exercise. `OPENAI_API_KEY` enables product analysis and image generation. `OPENROUTER_API_KEY` enables real video jobs. Clerk is required for production generation routes; Convex holds signed-in project snapshots and generated images.

`OPENROUTER_VIDEO_MODEL` can pin a tested model. When it is absent, the adapter queries the current video catalog and chooses the lowest estimated price that supports first-frame input, 9:16, 15 seconds, 480p, and audio off. `FAL_KEY` is an optional fallback adapter.

## Quality gates

```bash
npm test
npm run lint
npm run build
```

The detailed product scope, assumptions, risks, acceptance criteria, and no-code validation plan are in [PRODUCT.md](./PRODUCT.md).

## Current MVP boundary

- Initial output: five reels built from three background clips.
- Future target: 30 reels per month.
- Export: silent H.264 MP4 with editable timed text burned in.
- Payments: intentionally deferred; Dodopayments is the planned billing layer.
- Publishing: manual. Hypecast does not create or post to Instagram accounts.

Generated media is considered verified only after a real provider response can be played or exported. A successful build or demo mock is not proof that a live video was generated.

import { afterEach, describe, expect, it, vi } from "vitest";
import { selectOpenRouterVideoOption } from "./video-provider";

const compatible = {
  supported_durations: [5, 15],
  supported_aspect_ratios: ["9:16"],
  supported_resolutions: ["480p"],
  supported_frame_images: ["first_frame"],
};

describe("OpenRouter video model selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENROUTER_VIDEO_MODEL;
    delete process.env.OPENROUTER_VIDEO_MAX_PER_SECOND_USD;
  });

  it("honors the configured model only while it remains under the price ceiling", async () => {
    process.env.OPENROUTER_VIDEO_MODEL = "expensive/model";
    process.env.OPENROUTER_VIDEO_MAX_PER_SECOND_USD = "0.03";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        {
          ...compatible,
          id: "expensive/model",
          pricing_skus: { cents_per_video_output_second_480p: "5" },
        },
        {
          ...compatible,
          id: "x-ai/grok-imagine-video-1.5-lite",
          pricing_skus: {
            cents_per_video_output_second_480p: "2",
            cents_per_image_input: "1",
          },
        },
      ],
    }))));

    const selected = await selectOpenRouterVideoOption();

    expect(selected.id).toBe("x-ai/grok-imagine-video-1.5-lite");
    expect(selected.estimatedPerSecondUsd).toBe(0.02);
    expect(selected.estimatedPreviewUsd).toBe(0.11);
    expect(selected.estimatedClipUsd).toBe(0.31);
  });
});

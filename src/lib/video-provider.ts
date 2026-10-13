export type SubmitVideoInput = {
  prompt: string;
  startImageUrl: string;
  referenceImageUrls: string[];
  duration: 15;
};

export type VideoJobResult = {
  requestId: string;
  status: "queued" | "generating" | "ready" | "failed";
  videoUrl?: string;
  error?: string;
};

export interface VideoProvider {
  submit(input: SubmitVideoInput): Promise<VideoJobResult>;
  status(requestId: string): Promise<VideoJobResult>;
}

type OpenRouterModel = {
  id: string;
  supported_durations?: number[] | null;
  supported_aspect_ratios?: string[] | null;
  supported_resolutions?: string[] | null;
  supported_frame_images?: string[] | null;
  pricing_skus?: Record<string, string> | null;
};

export type VideoModelOption = {
  id: string;
  resolution: "480p";
  estimatedPerSecondUsd: number;
  estimatedBatchUsd: number;
};

function estimate480p(model: OpenRouterModel) {
  const pricing = model.pricing_skus || {};
  const cents = Number(pricing.cents_per_video_output_second_480p || pricing.cents_per_second_output || NaN);
  if (Number.isFinite(cents)) return cents / 100;
  const dollars = Number(
    pricing.duration_seconds_480p ||
      pricing.image_to_video_duration_seconds_480p ||
      pricing.duration_seconds ||
      NaN,
  );
  return Number.isFinite(dollars) ? dollars : null;
}

export async function listOpenRouterVideoOptions(): Promise<VideoModelOption[]> {
  const response = await fetch("https://openrouter.ai/api/v1/videos/models", { next: { revalidate: 600 } });
  if (!response.ok) throw new Error("OpenRouter's video catalog is unavailable.");
  const payload = (await response.json()) as { data?: OpenRouterModel[] };
  return (payload.data || [])
    .filter(
      (model) =>
        model.supported_durations?.includes(15) &&
        model.supported_aspect_ratios?.includes("9:16") &&
        model.supported_resolutions?.includes("480p") &&
        model.supported_frame_images?.includes("first_frame"),
    )
    .flatMap((model) => {
      const price = estimate480p(model);
      if (price === null) return [];
      const imageInput = Number(model.pricing_skus?.cents_per_image_input || 0) / 100;
      return [{
        id: model.id,
        resolution: "480p" as const,
        estimatedPerSecondUsd: price,
        estimatedBatchUsd: Number(((price * 15 + imageInput) * 3).toFixed(2)),
      }];
    })
    .sort((a, b) => a.estimatedBatchUsd - b.estimatedBatchUsd);
}

class OpenRouterVideoProvider implements VideoProvider {
  private async selectedModel() {
    if (process.env.OPENROUTER_VIDEO_MODEL) return process.env.OPENROUTER_VIDEO_MODEL;
    const options = await listOpenRouterVideoOptions();
    return options[0]?.id || "x-ai/grok-imagine-video-1.5-lite";
  }

  private get headers() {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured.");
    return {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Hypecast",
    };
  }

  async submit(input: SubmitVideoInput): Promise<VideoJobResult> {
    const model = await this.selectedModel();
    const response = await fetch("https://openrouter.ai/api/v1/videos", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        duration: input.duration,
        resolution: process.env.OPENROUTER_VIDEO_RESOLUTION || "480p",
        aspect_ratio: "9:16",
        generate_audio: false,
        frame_images: [
          {
            type: "image_url",
            image_url: { url: input.startImageUrl },
            frame_type: "first_frame",
          },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.id) {
      throw new Error(payload.error?.message || payload.error || "OpenRouter rejected the video job.");
    }
    return { requestId: payload.id, status: "queued" };
  }

  async status(requestId: string): Promise<VideoJobResult> {
    const response = await fetch(
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(requestId)}`,
      { headers: this.headers, cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || payload.error || "Could not read the video job.");
    if (["pending", "queued"].includes(payload.status)) return { requestId, status: "queued" };
    if (["processing", "in_progress", "running"].includes(payload.status)) {
      return { requestId, status: "generating" };
    }
    if (payload.status === "completed") {
      const videoUrl = payload.unsigned_urls?.[0] || `/api/video/content?requestId=${encodeURIComponent(requestId)}`;
      return { requestId, status: "ready", videoUrl };
    }
    return {
      requestId,
      status: "failed",
      error: payload.error?.message || payload.error || "The video generation failed.",
    };
  }
}

class FalVideoProvider implements VideoProvider {
  private endpoint = "fal-ai/kling-video/v3/pro/image-to-video";

  private get headers() {
    if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured.");
    return { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" };
  }

  async submit(input: SubmitVideoInput): Promise<VideoJobResult> {
    const response = await fetch(`https://queue.fal.run/${this.endpoint}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        start_image_url: input.startImageUrl,
        prompt: input.prompt,
        duration: String(input.duration),
        generate_audio: false,
        elements: [
          {
            frontal_image_url: input.referenceImageUrls[0],
            reference_image_urls: input.referenceImageUrls.slice(1),
          },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.request_id) {
      throw new Error(payload.detail || payload.error || "fal.ai rejected the video job.");
    }
    return { requestId: payload.request_id, status: "queued" };
  }

  async status(requestId: string): Promise<VideoJobResult> {
    const statusResponse = await fetch(
      `https://queue.fal.run/${this.endpoint}/requests/${encodeURIComponent(requestId)}/status`,
      { headers: this.headers, cache: "no-store" },
    );
    const statusPayload = await statusResponse.json();
    if (!statusResponse.ok) throw new Error(statusPayload.detail || "Could not read the video job.");
    if (statusPayload.status === "IN_QUEUE") return { requestId, status: "queued" };
    if (statusPayload.status === "IN_PROGRESS") return { requestId, status: "generating" };
    if (statusPayload.status === "COMPLETED") {
      const resultResponse = await fetch(
        `https://queue.fal.run/${this.endpoint}/requests/${encodeURIComponent(requestId)}`,
        { headers: this.headers, cache: "no-store" },
      );
      const resultPayload = await resultResponse.json();
      const videoUrl = resultPayload.video?.url;
      if (!resultResponse.ok || !videoUrl) {
        return { requestId, status: "failed", error: resultPayload.detail || "No playable video was returned." };
      }
      return { requestId, status: "ready", videoUrl };
    }
    return {
      requestId,
      status: "failed",
      error: statusPayload.error || statusPayload.detail || "The video generation failed.",
    };
  }
}

export function getVideoProvider(): VideoProvider {
  if (process.env.OPENROUTER_API_KEY || !process.env.FAL_KEY) return new OpenRouterVideoProvider();
  return new FalVideoProvider();
}

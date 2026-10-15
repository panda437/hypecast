import OpenAI, { toFile } from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { assertPublicUrl } from "@/lib/url-safety";
import { configuredImageInputFidelity } from "./openai-image-options";

let client: OpenAI | undefined;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured for this environment.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
export const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";

export async function parseStructured<T extends z.ZodType>(
  schema: T,
  name: string,
  system: string,
  input: string,
): Promise<z.infer<T>> {
  const response = await getOpenAI().responses.parse({
    model: textModel,
    input: [
      { role: "system", content: system },
      { role: "user", content: input },
    ],
    text: { format: zodTextFormat(schema, name) },
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return a usable structured response.");
  }
  return response.output_parsed as z.infer<T>;
}

export async function generatePortrait(prompt: string) {
  const response = await getOpenAI().images.generate({
    model: imageModel,
    prompt,
    n: 1,
    size: "768x1360",
    quality: "medium",
    background: "opaque",
    output_format: "webp",
    output_compression: 78,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI returned no image data.");
  return `data:image/webp;base64,${encoded}`;
}

export async function editPortrait(sourceDataUrl: string, prompt: string) {
  const match = sourceDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  let bytes: Buffer;
  let contentType: string;
  if (match) {
    contentType = match[1];
    bytes = Buffer.from(match[2], "base64");
  } else {
    const publicUrl = await assertPublicUrl(sourceDataUrl);
    const response = await fetch(publicUrl, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error("The stored source portrait could not be loaded.");
    contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (!contentType.startsWith("image/")) throw new Error("The stored source is not an image.");
    const payload = await response.arrayBuffer();
    if (payload.byteLength > 8_000_000) throw new Error("The source portrait is too large.");
    bytes = Buffer.from(payload);
  }
  const extension = contentType.split("/")[1].replace("jpeg", "jpg");
  const file = await toFile(bytes, `creator.${extension}`, { type: contentType });
  const inputFidelity = configuredImageInputFidelity();
  const response = await getOpenAI().images.edit({
    model: imageModel,
    image: file,
    prompt,
    n: 1,
    size: "768x1360",
    quality: "medium",
    ...(inputFidelity ? { input_fidelity: inputFidelity } : {}),
    background: "opaque",
    output_format: "webp",
    output_compression: 78,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI returned no edited image data.");
  return `data:image/webp;base64,${encoded}`;
}

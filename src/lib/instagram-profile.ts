import type { CreatorCandidate, ProductBrief } from "./types";

export function buildInstagramBio(
  creator: CreatorCandidate,
  brief: ProductBrief | undefined,
  productUrl: string,
) {
  const firstName = creator.name.trim().split(/\s+/)[0] || "Creator";
  const productName = brief?.productName.trim();
  const link = productUrl.trim() || brief?.source.url.trim() || "";
  return [
    `${firstName} · AI creator`,
    "small moments, honest lessons & things I noticed late",
    productName ? `currently using ${productName} ↓` : "what I am using lately ↓",
    link,
  ].filter(Boolean).join("\n");
}

export function instagramProfileFilename(creatorName: string) {
  const safeName = creatorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "creator";
  return `cueface-${safeName}-instagram-profile.png`;
}

export function squareProfileCrop(width: number, height: number) {
  const size = Math.min(width, height);
  const x = Math.max(0, (width - size) / 2);
  const faceFocusY = height * 0.36;
  const y = Math.max(0, Math.min(height - size, faceFocusY - size / 2));
  return { x, y, size };
}

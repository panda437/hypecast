import type {
  CreatorCandidate,
  ProductBrief,
  Reel,
  ReferenceImage,
  VideoClip,
} from "@/lib/types";

const palette = [
  ["#ff6b45", "#ffd66b", "#201313"],
  ["#a7ff83", "#4cc9f0", "#071911"],
  ["#d6b3ff", "#ff8dc7", "#160d24"],
  ["#ffbd59", "#ff5c8a", "#211007"],
  ["#8cf0ff", "#5474ff", "#07101f"],
];

function portrait(name: string, index: number, variant = 0) {
  const [a, b, bg] = palette[index % palette.length];
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const offset = variant * 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1365" viewBox="0 0 768 1365">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="n"><feTurbulence baseFrequency=".8" numOctaves="4" stitchTiles="stitch" type="fractalNoise"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .12 0"/></filter></defs>
    <rect width="768" height="1365" fill="${bg}"/><circle cx="${610 - offset}" cy="220" r="260" fill="url(#g)" opacity=".7"/>
    <rect x="70" y="92" width="628" height="1180" rx="48" fill="url(#g)" opacity=".18" stroke="${a}" stroke-opacity=".55"/>
    <circle cx="${384 + offset}" cy="500" r="176" fill="url(#g)"/><path d="M190 1110c18-255 101-388 194-388s176 133 194 388" fill="${a}" opacity=".9"/>
    <circle cx="328" cy="485" r="14" fill="${bg}"/><circle cx="440" cy="485" r="14" fill="${bg}"/><path d="M338 570q46 36 92 0" fill="none" stroke="${bg}" stroke-width="11" stroke-linecap="round"/>
    <text x="384" y="1220" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="58" fill="white">${initials}</text>
    <rect width="768" height="1365" filter="url(#n)" opacity=".28"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const demoBrief: ProductBrief = {
  productName: "Mosaic",
  oneLiner: "A calm, shared workspace that turns messy customer notes into a clear product roadmap.",
  audience: "Early-stage product teams juggling calls, feedback, and too many tabs.",
  problem: "Important customer insight gets buried before it becomes a decision.",
  differentiators: [
    "Turns raw notes into themes automatically",
    "Keeps evidence attached to every roadmap decision",
    "Designed for tiny teams, not enterprise admins",
  ],
  proofPoints: ["One workspace from interview to roadmap", "Set up from a product URL in minutes"],
  tone: "observant, lightly witty, credible",
  persona: {
    role: "A product-minded creator who notices the small chaos of building a startup",
    ageRange: "26–34",
    energy: "calm, sharp, slightly amused",
    setting: "warm apartment workspace and quiet city streets",
    visualDirection: "natural phone-camera realism, soft daylight, understated wardrobe",
  },
  hookAngles: [
    "The customer quote you forgot was actually the roadmap",
    "POV: your feedback finally stops living in six tabs",
    "The unglamorous reason good product ideas disappear",
    "A tiny workflow change that makes founder calls useful",
    "Your roadmap is not missing ideas. It is missing receipts.",
  ],
  source: {
    url: "https://example.com",
    title: "Mosaic — customer evidence to roadmap",
    description: "A fictional product used to demonstrate Hypecast without spending generation credits.",
    excerpt: "Capture feedback, reveal patterns, and make product decisions with evidence attached.",
  },
};

const creatorSeed = [
  ["Maya Chen", "The observant operator", "calm confidence", "cream knit, graphite trousers"],
  ["Theo Brooks", "The candid builder", "dry humor", "overshirt, white tee, dark denim"],
  ["Nia Alvarez", "The culture translator", "bright precision", "cobalt cardigan, silver accents"],
  ["Arjun Mehta", "The thoughtful skeptic", "measured curiosity", "rust jacket, charcoal tee"],
  ["Zoe Martin", "The friendly instigator", "playful focus", "forest green knit, black jeans"],
];

export const demoCreators: CreatorCandidate[] = creatorSeed.map((entry, index) => ({
  id: `creator-${index + 1}`,
  name: entry[0],
  archetype: entry[1],
  description: `${entry[0]} feels like a real product person sharing something they noticed, never a polished spokesperson.`,
  energy: entry[2],
  wardrobe: entry[3],
  setting: "soft daylight, lived-in workspace, phone-camera realism",
  characterBible: `${entry[0]}, age 29, distinctive consistent facial structure, ${entry[3]}, ${entry[2]}, natural skin texture, documentary phone-camera photography`,
  imageDataUrl: portrait(entry[0], index),
  imageStatus: "ready",
}));

export function demoReferences(creator: CreatorCandidate): ReferenceImage[] {
  const index = demoCreators.findIndex((item) => item.id === creator.id);
  return [
    { id: "ref-front", label: "Character anchor", direction: "Front-facing medium portrait", imageDataUrl: portrait(creator.name, index, 0), status: "ready" },
    { id: "ref-laptop", label: "Work mode", direction: "Three-quarter view at a laptop", imageDataUrl: portrait(creator.name, index, 1), status: "ready" },
    { id: "ref-phone", label: "Phone moment", direction: "Casual phone-in-hand lifestyle shot", imageDataUrl: portrait(creator.name, index, -1), status: "ready" },
  ];
}

export function demoClips(references: ReferenceImage[]): VideoClip[] {
  const motions = [
    ["Deep work", "Types naturally, pauses, reads the screen, soft handheld drift"],
    ["The notification", "Checks a phone, subtle eyebrow raise, returns to work"],
    ["Between meetings", "Walks slowly through warm daylight, glances toward camera"],
  ];
  return motions.map(([label, motionPrompt], index) => ({
    id: `clip-${index + 1}`,
    label,
    motionPrompt,
    referenceImageId: references[index].id,
    provider: "demo",
    status: "ready",
    posterUrl: references[index].imageDataUrl,
  }));
}

export function demoReels(clips: VideoClip[]): Reel[] {
  return demoBrief.hookAngles.map((hook, index) => ({
    id: `reel-${index + 1}`,
    title: `Reel ${String(index + 1).padStart(2, "0")}`,
    clipId: clips[index % clips.length].id,
    hook,
    cards: [{ id: `card-${index + 1}`, text: hook, start: 0, end: 15 }],
    position: index % 3 === 0 ? "top" : index % 3 === 1 ? "center" : "bottom",
    style: index % 3 === 0 ? "glass" : index % 3 === 1 ? "clean" : "highlight",
  }));
}

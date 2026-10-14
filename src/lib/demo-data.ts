import type {
  CreatorCandidate,
  ProductBrief,
  Reel,
  ReferenceImage,
  VideoClip,
} from "@/lib/types";

const demoPortraits = [
  "/demo-cast/maya-chen.jpg",
  "/demo-cast/theo-brooks.jpg",
  "/demo-cast/nia-alvarez.jpg",
  "/demo-cast/arjun-mehta.jpg",
  "/demo-cast/zoe-martin.jpg",
];

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
    description: "A fictional product used to demonstrate CueFace without spending generation credits.",
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
  imageDataUrl: demoPortraits[index],
  imageStatus: "ready",
}));

export function demoCreatorsForBrief(brief: ProductBrief): CreatorCandidate[] {
  return demoCreators.map((creator, index) => ({
    ...creator,
    description: `${creator.name} feels credible to ${brief.audience.toLowerCase()}, while still reading as a person rather than a spokesperson.`,
    setting: brief.persona.setting,
    characterBible: `${creator.characterBible}. Candidate ${index + 1} for ${brief.persona.role.toLowerCase()}. Keep the portrait free of products, screens, logos, text, and collage elements.`,
  }));
}

export function demoReferences(creator: CreatorCandidate): ReferenceImage[] {
  return [
    { id: "ref-anchor", label: "First-run portrait", direction: "The selected creator image becomes the reusable 15-second still background", imageDataUrl: creator.imageDataUrl, status: "ready" },
  ];
}

export function demoClips(references: ReferenceImage[]): VideoClip[] {
  return [{
    id: "clip-still",
    label: "Creator portrait · 15s",
    motionPrompt: "A gentle local push-in gives the still subtle motion without a video-generation call",
    referenceImageId: references[0].id,
    provider: "still",
    duration: 15,
    status: "ready",
    posterUrl: references[0].imageDataUrl,
  }];
}

const demoStories = [
  "i was standing in the bathroom with one earring on when i realized i'd been getting ready for people i didn't even like. i took it off, washed my face, and stayed home. the relief arrived before the guilt, which told me more than either feeling wanted to.",
  "i missed my stop because i was rehearsing a conversation that had already happened. on the walk back, i kept inventing better versions of myself: calmer, funnier, impossible to misunderstand. by the time i reached home, the real conversation felt smaller than all the imaginary ones.",
  "my sister asked why i kept checking my reflection in the dark phone screen. i said i wasn't, then did it again. we both laughed, but i noticed how often i was trying to catch myself looking acceptable instead of actually being there.",
  "at the red light, i caught the driver beside me singing with both hands on the wheel. she saw me watching, smiled, and kept going. i spent the next three blocks wondering when i had started treating joy like something embarrassing people should do privately.",
  "i tucked my hair behind my ear before opening the door, then did it again while nobody was looking. it was the exact nervous habit my mother has. i used to tease her for it. suddenly it felt less like a flaw and more like family.",
];

const planningStories = [
  "i spent twenty minutes rearranging a saturday list before doing the easiest thing on it. when my friend arrived, she crossed out half and asked if i actually wanted the day i had planned. i didn't. apparently organization can be another way of avoiding a choice.",
  "i missed my stop because i was rehearsing a conversation that had already happened. on the walk back, i kept inventing better versions of myself: calmer, funnier, impossible to misunderstand. by the time i reached home, the real conversation felt smaller than all the imaginary ones.",
  "i bought a new notebook because the old one looked too messy to trust. three pages in, the handwriting went crooked again. i finally noticed i wasn't trying to remember things; i was trying to become the kind of person whose life stayed inside the lines.",
  "my brother asked why i had six alarms for one morning. i told him each one had a different job. he said that sounded exhausting, and i laughed until i realized i had built a tiny system for getting out of bed. i kept only two.",
  "i was color-coding a project plan when someone beside me asked what we were actually deciding. i had no answer, just a very organized collection of maybe. deleting half the plan felt reckless for thirty seconds. then the real question finally had somewhere to land.",
];

const planningTitles = ["the saturday list", "the missed stop", "the clean notebook", "six alarms", "organized maybe"];

export function demoReels(clips: VideoClip[], brief?: ProductBrief): Reel[] {
  const signals = `${brief?.oneLiner || ""} ${brief?.problem || ""} ${brief?.audience || ""}`.toLowerCase();
  const usesPlanningTension = /plan|productivity|organ(?:ize|ization)|project|task|roadmap|workflow|build/.test(signals);
  const stories = usesPlanningTension ? planningStories : demoStories;
  const titles = usesPlanningTension ? planningTitles : ["one earring", "the missed stop", "the dark screen", "the red light", "my mother's habit"];
  return stories.map((story, index) => ({
    id: `reel-${index + 1}`,
    title: titles[index],
    clipId: clips[index % clips.length].id,
    hook: story.split(".")[0],
    cards: [{ id: `card-${index + 1}`, text: story, start: 0, end: 15 }],
    position: "center",
    style: "glass",
    fontFamily: "sans",
    fontSize: "medium",
  }));
}

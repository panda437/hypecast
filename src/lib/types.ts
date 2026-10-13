export type ProductBrief = {
  productName: string;
  oneLiner: string;
  audience: string;
  problem: string;
  differentiators: string[];
  proofPoints: string[];
  tone: string;
  persona: {
    role: string;
    ageRange: string;
    energy: string;
    setting: string;
    visualDirection: string;
  };
  hookAngles: string[];
  source: {
    url: string;
    title: string;
    description: string;
    excerpt: string;
  };
};

export type CreatorCandidate = {
  id: string;
  name: string;
  archetype: string;
  description: string;
  energy: string;
  wardrobe: string;
  setting: string;
  characterBible: string;
  imageDataUrl?: string;
  imageStatus: "idle" | "generating" | "ready" | "failed";
};

export type ReferenceImage = {
  id: string;
  label: string;
  direction: string;
  imageDataUrl?: string;
  status: "idle" | "generating" | "ready" | "failed";
};

export type VideoClip = {
  id: string;
  label: string;
  motionPrompt: string;
  referenceImageId: string;
  provider: "still" | "openrouter" | "fal" | "demo";
  status: "idle" | "queued" | "generating" | "ready" | "failed";
  requestId?: string;
  videoUrl?: string;
  posterUrl?: string;
  error?: string;
};

export type TextCard = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type Reel = {
  id: string;
  title: string;
  clipId: string;
  hook: string;
  cards: TextCard[];
  position: "top" | "center" | "bottom";
  style: "glass" | "clean" | "highlight";
};

export type AppCapabilities = {
  openai: boolean;
  fal: boolean;
  convex: boolean;
  clerk: boolean;
  videoProvider: string;
  textModel: string;
  imageModel: string;
};

export type WorkspaceSnapshot = {
  mode: "demo" | "live";
  step: number;
  productUrl: string;
  brief?: ProductBrief;
  creators: CreatorCandidate[];
  selectedCreatorId?: string;
  references: ReferenceImage[];
  clips: VideoClip[];
  reels: Reel[];
  updatedAt: number;
};

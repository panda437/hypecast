"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Cloud,
  Download,
  FileVideo,
  ImageIcon,
  LayoutGrid,
  Library,
  LoaderCircle,
  LogIn,
  Pencil,
  Play,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { demoClips, demoCreators, demoCreatorsForBrief, demoReels, demoReferences } from "@/lib/demo-data";
import { DEFAULT_MOTION_RECIPE, MOTION_RECIPES } from "@/lib/motion-recipes";
import { exportReel } from "@/lib/reel-export";
import { composeVideoPrompt } from "@/lib/video-prompt";
import type {
  AppCapabilities,
  CreatorCandidate,
  ProductBrief,
  PendingExport,
  Reel,
  ReferenceImage,
  SavedProject,
  StoryBatch,
  VideoClip,
  WorkspaceSnapshot,
} from "@/lib/types";
import { ReelPreview } from "@/components/reel-preview";
import { CloudProjectSync } from "@/components/cloud-project-sync";

const STORAGE_KEY = "hypecast-project-v2";
const PROJECTS_STORAGE_KEY = "hypecast-project-history-v1";
const REEL_DURATION = 15;
const onboardingSteps = ["Read link", "Review direction", "Choose cast"];

type VideoPlan = {
  selected: {
    id: string;
    resolution: "480p";
    estimatedPerSecondUsd: number;
    estimatedImageInputUsd: number;
    estimatedPreviewUsd: number;
    estimatedClipUsd: number;
    estimatedBatchUsd: number;
  };
  maxPerSecondUsd: number;
};

const emptyWorkspace: WorkspaceSnapshot = {
  clientProjectId: "",
  mode: "demo",
  step: 0,
  productUrl: "",
  creators: [],
  references: [],
  clips: [],
  reels: [],
  storyBatches: [],
  exports: [],
  updatedAt: Date.now(),
};

const homepageReferences = demoReferences(demoCreators[0]);
const homepageClips = demoClips(homepageReferences);
const homepageReel = demoReels(homepageClips)[0];

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function newWorkspace(mode: WorkspaceSnapshot["mode"] = "live"): WorkspaceSnapshot {
  return { ...emptyWorkspace, mode, clientProjectId: newId("project"), updatedAt: Date.now() };
}

function cloneReels(reels: Reel[]) {
  return reels.map((reel) => ({ ...reel, cards: reel.cards.map((card) => ({ ...card })) }));
}

function materializeStoryBatch(drafts: Reel[]) {
  const batchId = newId("batch");
  const reels = drafts.map((reel, index) => ({
    ...reel,
    id: `${batchId}-reel-${index + 1}`,
    cards: reel.cards.map((card) => ({ ...card, id: `${batchId}-card-${index + 1}` })),
  }));
  return {
    reels,
    batch: { id: batchId, createdAt: Date.now(), reels: cloneReels(reels) } satisfies StoryBatch,
  };
}

function reelsFromHooks(
  hooks: Array<{ title: string; angle: string; story: string }>,
  clipId: string,
) {
  return hooks.map((item, index) => ({
    id: `reel-${index + 1}`,
    title: item.title,
    clipId,
    hook: item.story.split(/[.!?]/)[0] || item.angle,
    cards: [{ id: `reel-${index + 1}-story`, text: item.story, start: 0, end: REEL_DURATION }],
    position: "center" as const,
    style: "glass" as const,
    fontFamily: "sans" as const,
    fontSize: "medium" as const,
  }));
}

function stillClip(reference: ReferenceImage, id = "clip-still", label = "Creator portrait · 15s"): VideoClip {
  return {
    id,
    label,
    motionPrompt: "A gentle local push-in gives the still subtle motion without a video-generation call.",
    referenceImageId: reference.id,
    provider: "still",
    duration: 15,
    status: "ready",
    posterUrl: reference.imageDataUrl,
  };
}

function normalizeWorkspace(saved: WorkspaceSnapshot): WorkspaceSnapshot {
  const references = Array.isArray(saved.references) ? saved.references : [];
  let clips: VideoClip[] = Array.isArray(saved.clips)
    ? saved.clips.map((clip) => ({
        ...clip,
        label: clip.label.replace("17s", "15s"),
        duration: clip.duration || 15,
        storageStatus: clip.storageStatus || (clip.videoUrl && !clip.videoUrl.startsWith("/api/") ? "stored" as const : undefined),
      }))
    : [];
  if (saved.selectedCreatorId && clips.length === 0 && references[0]?.imageDataUrl) {
    clips = [stillClip(references[0])];
  }
  const reels = (Array.isArray(saved.reels) ? saved.reels : []).map((reel) => {
    const story = reel.cards?.map((card) => card.text.trim()).filter(Boolean).join("\n\n") || reel.hook;
    return {
      ...reel,
      hook: story.split(/[.!?]/)[0] || story,
      cards: [{ id: `${reel.id}-story`, text: story, start: 0, end: REEL_DURATION }],
      position: reel.position || "center",
      style: reel.style || "glass",
      fontFamily: reel.fontFamily || "sans",
      fontSize: reel.fontSize || "medium",
    } satisfies Reel;
  });
  const batches = Array.isArray(saved.storyBatches) ? saved.storyBatches.map((batch) => ({
    ...batch,
    reels: cloneReels(batch.reels || []).map((reel) => ({
      ...reel,
      fontFamily: reel.fontFamily || "sans",
      fontSize: reel.fontSize || "medium",
    })),
  })) : [];
  if (reels.length && batches.length === 0) {
    batches.push({ id: "batch-imported", createdAt: saved.updatedAt || Date.now(), reels: cloneReels(reels) });
  }
  const step = Number(saved.step) > 3 ? 3 : Math.max(0, Number(saved.step) || 0);
  return {
    ...emptyWorkspace,
    ...saved,
    clientProjectId: saved.clientProjectId || newId("project"),
    references,
    clips,
    reels,
    storyBatches: batches,
    activeBatchId: saved.activeBatchId || batches.at(-1)?.id,
    activeCastId: saved.activeCastId || (step === 3 ? saved.selectedCreatorId : undefined),
    exports: Array.isArray(saved.exports) ? saved.exports : [],
    step,
    updatedAt: saved.updatedAt || Date.now(),
  };
}

export function HypecastStudio() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(emptyWorkspace);
  const [demoStarted, setDemoStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [capabilities, setCapabilities] = useState<(AppCapabilities & { openrouter?: boolean }) | null>(null);
  const [videoPlan, setVideoPlan] = useState<VideoPlan | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [selectedReelId, setSelectedReelId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [exportProgress, setExportProgress] = useState<Record<string, number>>({});
  const [deviceProjects, setDeviceProjects] = useState<SavedProject[]>([]);
  const [cloudProjects, setCloudProjects] = useState<SavedProject[]>([]);
  const [pendingExports, setPendingExports] = useState<PendingExport[]>([]);
  const pendingVideoJobKey = useMemo(() => JSON.stringify(
    workspace.clips
      .filter((clip) => clip.requestId && (clip.status === "queued" || clip.status === "generating"))
      .map((clip) => ({ id: clip.id, requestId: clip.requestId as string })),
  ), [workspace.clips]);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setWorkspace(normalizeWorkspace(JSON.parse(saved) as WorkspaceSnapshot));
        } else {
          setWorkspace(newWorkspace(clerkEnabled ? "live" : "demo"));
        }
        const history = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (history) {
          const snapshots = JSON.parse(history) as WorkspaceSnapshot[];
          setDeviceProjects(snapshots.map((snapshot) => {
            const normalized = normalizeWorkspace(snapshot);
            return {
              clientProjectId: normalized.clientProjectId,
              productName: normalized.brief?.productName || "Untitled product",
              updatedAt: normalized.updatedAt,
              snapshot: normalized,
              source: "device" as const,
            };
          }));
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(PROJECTS_STORAGE_KEY);
        setWorkspace(newWorkspace(clerkEnabled ? "live" : "demo"));
      }
      setHydrated(true);
    }, 0);
    apiRequest<AppCapabilities & { openrouter?: boolean }>("/api/health")
      .then(setCapabilities)
      .catch(() => null);
    apiRequest<VideoPlan>("/api/video/models")
      .then(setVideoPlan)
      .catch(() => null);
    return () => window.clearTimeout(hydrateTimer);
  }, [clerkEnabled]);

  useEffect(() => {
    if (!hydrated || !workspace.clientProjectId) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      } catch {
        // Large live images are moved to Convex; the cloud copy remains authoritative.
      }
      setDeviceProjects((current) => {
        const saved: SavedProject = {
          clientProjectId: workspace.clientProjectId,
          productName: workspace.brief?.productName || "Untitled product",
          updatedAt: workspace.updatedAt,
          snapshot: workspace,
          source: "device",
        };
        const next = [saved, ...current.filter((project) => project.clientProjectId !== workspace.clientProjectId)]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20);
        try {
          window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next.map((project) => project.snapshot)));
        } catch {
          // Keep the in-memory history while cloud storage replaces inline media.
        }
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

  useEffect(() => {
    const pendingVideoJobs = JSON.parse(pendingVideoJobKey) as Array<{ id: string; requestId: string }>;
    if (!hydrated || pendingVideoJobs.length === 0) return;
    let cancelled = false;
    let checking = false;

    const checkJobs = async () => {
      if (checking) return;
      checking = true;
      await Promise.allSettled(pendingVideoJobs.map(async (clip) => {
        const result = await apiRequest<VideoClip>("/api/video/status", { requestId: clip.requestId });
        if (cancelled) return;
        setWorkspace((current) => ({
          ...current,
          clips: current.clips.map((item) => item.id === clip.id ? {
            ...item,
            status: result.status,
            videoUrl: result.videoUrl || item.videoUrl,
            storageStatus: result.status === "ready" ? "pending" : item.storageStatus,
            error: result.error,
          } : item),
          updatedAt: Date.now(),
        }));
      }));
      checking = false;
    };

    void checkJobs();
    const timer = window.setInterval(() => void checkJobs(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hydrated, pendingVideoJobKey]);

  const savedProjects = useMemo(() => {
    const merged = new Map<string, SavedProject>();
    for (const project of deviceProjects) merged.set(project.clientProjectId, project);
    for (const project of cloudProjects) {
      const local = merged.get(project.clientProjectId);
      if (!local || project.updatedAt >= local.updatedAt) merged.set(project.clientProjectId, project);
    }
    return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cloudProjects, deviceProjects]);

  const selectedCreator = useMemo(
    () => workspace.creators.find((creator) => creator.id === workspace.selectedCreatorId),
    [workspace.creators, workspace.selectedCreatorId],
  );
  const selectedReel = useMemo(
    () => workspace.reels.find((reel) => reel.id === selectedReelId) || workspace.reels[0],
    [selectedReelId, workspace.reels],
  );
  const activeClip = useMemo(() => {
    const clipId = selectedReel?.clipId || selectedAssetId;
    const clip = workspace.clips.find((item) => item.id === clipId) || workspace.clips[0];
    if (clip) return clip;
    if (selectedCreator?.imageDataUrl) {
      return {
        id: "casting-preview",
        label: "Casting preview",
        motionPrompt: "",
        referenceImageId: "",
        provider: "demo" as const,
        status: "ready" as const,
        posterUrl: selectedCreator.imageDataUrl,
      };
    }
    return undefined;
  }, [selectedAssetId, selectedCreator, selectedReel?.clipId, workspace.clips]);

  function updateWorkspace(patch: Partial<WorkspaceSnapshot>) {
    setWorkspace((current) => ({ ...current, ...patch, updatedAt: Date.now() }));
  }

  const handleAssetStored = useCallback((kind: "candidate" | "reference", id: string, url: string) => {
    setWorkspace((current) => {
      if (kind === "candidate") {
        return {
          ...current,
          creators: current.creators.map((creator) => creator.id === id ? { ...creator, imageDataUrl: url } : creator),
          updatedAt: Date.now(),
        };
      }
      return {
        ...current,
        references: current.references.map((reference) => reference.id === id ? { ...reference, imageDataUrl: url } : reference),
        clips: current.clips.map((clip) => clip.referenceImageId === id ? { ...clip, posterUrl: url } : clip),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleExportStored = useCallback((id: string, url: string) => {
    setWorkspace((current) => ({
      ...current,
      exports: current.exports.map((item) => item.id === id ? { ...item, status: "saved", url } : item),
      updatedAt: Date.now(),
    }));
    setPendingExports((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleClipStored = useCallback((id: string, url: string) => {
    setWorkspace((current) => ({
      ...current,
      clips: current.clips.map((clip) => clip.id === id ? { ...clip, videoUrl: url, storageStatus: "stored" } : clip),
      updatedAt: Date.now(),
    }));
  }, []);

  const restoreWorkspace = useCallback((saved: WorkspaceSnapshot) => {
    const restored = normalizeWorkspace(saved);
    setWorkspace(restored);
    setSelectedReelId(restored.reels[0]?.id || "");
    setSelectedAssetId(restored.clips[0]?.id || "");
    setError("");
  }, []);

  const handleCloudProjects = useCallback((projects: SavedProject[]) => {
    setCloudProjects(projects);
  }, []);

  function openSavedProject(clientProjectId: string) {
    const project = savedProjects.find((item) => item.clientProjectId === clientProjectId);
    if (!project) return;
    setDemoStarted(true);
    restoreWorkspace(project.snapshot);
  }

  function resetProject() {
    setWorkspace(newWorkspace(clerkEnabled ? "live" : "demo"));
    setDemoStarted(false);
    setSelectedReelId("");
    setSelectedAssetId("");
    setError("");
  }

  async function analyzeProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!workspace.productUrl) return;
    setBusy("analyzing");
    try {
      const endpoint = workspace.mode === "demo" ? "/api/demo/analyze" : "/api/analyze";
      const { brief } = await apiRequest<{ brief: ProductBrief }>(endpoint, { url: workspace.productUrl });
      updateWorkspace({ brief, step: 1, creators: [], selectedCreatorId: undefined, activeCastId: undefined, references: [], clips: [], reels: [], storyBatches: [], activeBatchId: undefined, exports: [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not analyze that page.");
    } finally {
      setBusy("");
    }
  }

  function startDemo() {
    setDemoStarted(true);
    updateWorkspace({
      mode: "demo",
      productUrl: "",
      brief: undefined,
      step: 0,
      creators: [],
      selectedCreatorId: undefined,
      activeCastId: undefined,
      references: [],
      clips: [],
      reels: [],
      storyBatches: [],
      activeBatchId: undefined,
      exports: [],
    });
    setSelectedReelId("");
    setSelectedAssetId("");
    setError("");
  }

  function updateBrief<K extends keyof ProductBrief>(key: K, value: ProductBrief[K]) {
    if (!workspace.brief) return;
    updateWorkspace({ brief: { ...workspace.brief, [key]: value } });
  }

  async function createCast() {
    if (!workspace.brief) return;
    setBusy("cast");
    setError("");
    if (workspace.mode === "demo") {
      await pause(450);
      updateWorkspace({ creators: demoCreatorsForBrief(workspace.brief), step: 2 });
      setBusy("");
      return;
    }
    try {
      const { creators } = await apiRequest<{ creators: CreatorCandidate[] }>("/api/creators", { brief: workspace.brief });
      updateWorkspace({ creators, step: 2 });
      await Promise.allSettled(creators.map(async (creator) => {
        setWorkspace((current) => ({
          ...current,
          creators: current.creators.map((item) => item.id === creator.id ? { ...item, imageStatus: "generating" } : item),
        }));
        try {
          const { imageDataUrl } = await apiRequest<{ imageDataUrl: string }>("/api/image", {
            kind: "candidate",
            name: creator.name,
            characterBible: creator.characterBible,
          });
          setWorkspace((current) => ({
            ...current,
            creators: current.creators.map((item) => item.id === creator.id ? { ...item, imageDataUrl, imageStatus: "ready" } : item),
          }));
        } catch {
          setWorkspace((current) => ({
            ...current,
            creators: current.creators.map((item) => item.id === creator.id ? { ...item, imageStatus: "failed" } : item),
          }));
        }
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the creator cast.");
    } finally {
      setBusy("");
    }
  }

  function chooseCreator(id: string) {
    updateWorkspace({ selectedCreatorId: id });
  }

  async function openCastStudio() {
    if (!selectedCreator?.imageDataUrl) {
      setError("Choose a creator with a finished portrait first.");
      return;
    }
    if (workspace.activeCastId === selectedCreator.id && workspace.clips.length && workspace.reels.length) {
      setSelectedAssetId((current) => current || workspace.clips[0].id);
      updateWorkspace({ step: 3 });
      setError("");
      return;
    }

    setBusy("opening-studio");
    setError("");
    const references = workspace.mode === "demo"
      ? demoReferences(selectedCreator)
      : [{
          id: "ref-anchor",
          label: "Approved cast portrait",
          direction: "The approved cast image becomes a reusable 15-second background.",
          imageDataUrl: selectedCreator.imageDataUrl,
          status: "ready" as const,
        }];
    const clips = workspace.mode === "demo" ? demoClips(references) : [stillClip(references[0])];
    try {
      let drafts: Reel[];
      if (workspace.mode === "demo") {
        await pause(380);
        drafts = demoReels(clips, workspace.brief);
      } else {
        if (!workspace.brief) throw new Error("The product direction is missing. Go back and analyze the product again.");
        const { hooks } = await apiRequest<{ hooks: Array<{ title: string; angle: string; story: string }> }>("/api/hooks", workspace.brief);
        drafts = reelsFromHooks(hooks, clips[0].id);
      }
      const { reels, batch } = materializeStoryBatch(drafts);
      setSelectedAssetId(clips[0].id);
      setSelectedReelId(reels[0].id);
      setWorkspace((current) => ({
        ...current,
        clientProjectId: current.activeCastId && current.activeCastId !== selectedCreator.id ? newId("project") : current.clientProjectId,
        activeCastId: selectedCreator.id,
        references,
        clips,
        reels,
        storyBatches: [batch],
        activeBatchId: batch.id,
        exports: [],
        step: 3,
        updatedAt: Date.now(),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the first reel.");
    } finally {
      setBusy("");
    }
  }

  async function generateCastImage(direction: string) {
    if (!selectedCreator?.imageDataUrl) {
      setError("The approved cast portrait is missing. Go back and choose the cast again.");
      return false;
    }
    const assetNumber = workspace.references.length + 1;
    const referenceId = newId("reference");
    const clipId = newId("still");
    const reference: ReferenceImage = {
      id: referenceId,
      label: `Cast image ${assetNumber}`,
      direction,
      status: "generating",
    };
    const clip: VideoClip = {
      ...stillClip(reference, clipId, `Cast image ${assetNumber} · 15s`),
      status: "generating",
      posterUrl: selectedCreator.imageDataUrl,
    };

    setBusy("image-asset");
    setError("");
    const queuedWorkspace: WorkspaceSnapshot = {
      ...workspace,
      references: [...workspace.references, reference],
      clips: [...workspace.clips, clip],
      updatedAt: Date.now(),
    };
    setWorkspace(queuedWorkspace);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedWorkspace));
    } catch {
      // Cloud autosave remains the durable path when browser storage is full.
    }
    try {
      let imageDataUrl = selectedCreator.imageDataUrl;
      if (workspace.mode === "demo") {
        await pause(500);
      } else {
        const result = await apiRequest<{ imageDataUrl: string }>("/api/image", {
          kind: "reference",
          name: selectedCreator.name,
          characterBible: selectedCreator.characterBible,
          direction,
          sourceDataUrl: selectedCreator.imageDataUrl,
        });
        imageDataUrl = result.imageDataUrl;
      }
      setWorkspace((current) => ({
        ...current,
        references: current.references.map((item) => item.id === referenceId ? { ...item, imageDataUrl, status: "ready" } : item),
        clips: current.clips.map((item) => item.id === clipId ? { ...item, posterUrl: imageDataUrl, status: "ready" } : item),
        updatedAt: Date.now(),
      }));
      setSelectedAssetId(clipId);
      if (selectedReel) updateReel(selectedReel.id, { clipId });
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not generate the new cast image.";
      setWorkspace((current) => ({
        ...current,
        references: current.references.map((item) => item.id === referenceId ? { ...item, status: "failed" } : item),
        clips: current.clips.map((item) => item.id === clipId ? { ...item, status: "failed", error: message } : item),
        updatedAt: Date.now(),
      }));
      setError(message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function generateCastVideo(motionPrompt: string, duration: 5 | 15) {
    const sourceClip = workspace.clips.find((clip) => clip.id === selectedAssetId) || workspace.clips[0];
    const reference = workspace.references.find((item) => item.id === sourceClip?.referenceImageId) || workspace.references.find((item) => item.status === "ready");
    if (!reference?.imageDataUrl) {
      setError("Choose a finished cast image before adding motion.");
      return false;
    }
    if (!capabilities?.openrouter && !capabilities?.fal) {
      setError("Video generation is not connected yet. Add an OpenRouter or fal key when you are ready for run two.");
      return false;
    }

    const clipId = newId("video");
    const provider = capabilities.openrouter ? "openrouter" as const : "fal" as const;
    const clip: VideoClip = {
      id: clipId,
      label: `Motion clip ${workspace.clips.filter((item) => item.videoUrl || item.requestId).length + 1} · ${duration}s`,
      motionPrompt,
      referenceImageId: reference.id,
      provider,
      duration,
      status: "queued",
      posterUrl: reference.imageDataUrl,
    };
    setBusy("video-asset");
    setError("");
    const queuedWorkspace: WorkspaceSnapshot = {
      ...workspace,
      clips: [...workspace.clips, clip],
      updatedAt: Date.now(),
    };
    setWorkspace(queuedWorkspace);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queuedWorkspace));
    } catch {
      // Cloud autosave remains the durable path when browser storage is full.
    }
    setSelectedAssetId(clipId);
    try {
      const result = await apiRequest<{
        requestId: string;
        status: VideoClip["status"];
        generationPrompt?: string;
        videoUrl?: string;
      }>("/api/video/submit", {
        prompt: motionPrompt,
        startImageUrl: reference.imageDataUrl,
        referenceImageUrls: [reference.imageDataUrl],
        duration,
      });
      setWorkspace((current) => ({
        ...current,
        clips: current.clips.map((item) => item.id === clipId ? {
          ...item,
          requestId: result.requestId,
          status: result.status,
          generationPrompt: result.generationPrompt,
          videoUrl: result.videoUrl,
          storageStatus: result.status === "ready" ? "pending" : undefined,
        } : item),
        updatedAt: Date.now(),
      }));
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not start the video generation.";
      setWorkspace((current) => ({
        ...current,
        clips: current.clips.map((item) => item.id === clipId ? { ...item, status: "failed", error: message } : item),
        updatedAt: Date.now(),
      }));
      setError(message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function buildReels() {
    const readyClips = workspace.clips.filter((clip) => clip.status === "ready");
    const chosenClip = readyClips.find((clip) => clip.id === selectedAssetId) || readyClips[0];
    if (!chosenClip || !workspace.brief) {
      setError("Choose a ready cast image or video before writing stories.");
      return;
    }
    setBusy("stories");
    setError("");
    try {
      let draftReels: Reel[];
      if (workspace.mode === "demo") {
        await pause(420);
        draftReels = demoReels([chosenClip], workspace.brief);
      } else {
        const { hooks } = await apiRequest<{ hooks: Array<{ title: string; angle: string; story: string }> }>("/api/hooks", workspace.brief);
        draftReels = reelsFromHooks(hooks, chosenClip.id);
      }
      const { reels, batch } = materializeStoryBatch(draftReels);
      setWorkspace((current) => ({
        ...current,
        reels,
        storyBatches: [...current.storyBatches, batch],
        activeBatchId: batch.id,
        step: 3,
        updatedAt: Date.now(),
      }));
      setSelectedReelId(reels[0].id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not write the story batch.");
    } finally {
      setBusy("");
    }
  }

  function updateReel(reelId: string, patch: Partial<Reel>) {
    setWorkspace((current) => ({
      ...current,
      reels: current.reels.map((reel) => reel.id === reelId ? { ...reel, ...patch } : reel),
      storyBatches: current.storyBatches.map((batch) => batch.id === current.activeBatchId ? {
        ...batch,
        reels: batch.reels.map((reel) => reel.id === reelId ? { ...reel, ...patch } : reel),
      } : batch),
      updatedAt: Date.now(),
    }));
  }

  function updateStory(reel: Reel, text: string) {
    updateReel(reel.id, {
      hook: text.split(/[.!?]/)[0] || text,
      cards: [{ id: reel.cards[0]?.id || `${reel.id}-story`, text, start: 0, end: REEL_DURATION }],
    });
  }

  function chooseAsset(clipId: string) {
    setSelectedAssetId(clipId);
    if (selectedReel) updateReel(selectedReel.id, { clipId });
  }

  function chooseBatch(batchId: string) {
    const batch = workspace.storyBatches.find((item) => item.id === batchId);
    if (!batch) return;
    const reels = cloneReels(batch.reels);
    updateWorkspace({ activeBatchId: batchId, reels });
    setSelectedReelId(reels[0]?.id || "");
  }

  async function exportOne(reel: Reel) {
    const clip = workspace.clips.find((item) => item.id === reel.clipId);
    if (!clip) return;
    setError("");
    setExportProgress((current) => ({ ...current, [reel.id]: 1 }));
    try {
      const blob = await exportReel(reel, clip, (progress) => setExportProgress((current) => ({ ...current, [reel.id]: progress })));
      const createdAt = Date.now();
      const id = newId("export");
      const story = reel.cards[0]?.text || reel.hook;
      setWorkspace((current) => ({
        ...current,
        exports: [{ id, reelId: reel.id, title: reel.title, story, clipId: reel.clipId, createdAt, status: "downloaded" }, ...current.exports],
        updatedAt: Date.now(),
      }));
      setPendingExports((current) => [...current, { id, clientProjectId: workspace.clientProjectId, blob, reelId: reel.id, title: reel.title, story, createdAt }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This browser could not export the reel.");
      setExportProgress((current) => ({ ...current, [reel.id]: 0 }));
    }
  }

  const previewReel = selectedReel || (workspace.brief ? ({
    id: "preview",
    title: "Story preview",
    clipId: activeClip?.id || "",
    hook: workspace.brief.hookAngles[0] || workspace.brief.oneLiner,
    cards: [{
      id: "preview-story",
      text: "Your cast is ready. Choose a scene, then write five small personal moments: an awkward pause, a missed stop, a habit you caught yourself doing. The product can stay off-screen.",
      start: 0,
      end: REEL_DURATION,
    }],
    position: "center",
    style: "glass",
    fontFamily: "sans",
    fontSize: "medium",
  } satisfies Reel) : undefined);

  const experience = workspace.step === 3 && selectedCreator ? (
    <CastStudio
      workspace={workspace}
      creator={selectedCreator}
      clerkEnabled={clerkEnabled}
      selectedReel={selectedReel}
      selectedAssetId={selectedAssetId || activeClip?.id || ""}
      activeClip={activeClip}
      previewReel={previewReel}
      busy={busy}
      error={error}
      exportProgress={exportProgress}
      capabilities={capabilities}
      videoPlan={videoPlan}
      savedProjects={savedProjects}
      onDismissError={() => setError("")}
      onReset={resetProject}
      onChangeCast={() => updateWorkspace({ step: 2 })}
      onOpenProject={openSavedProject}
      onSelectReel={setSelectedReelId}
      onSelectAsset={chooseAsset}
      onUpdateStory={updateStory}
      onUpdateReel={updateReel}
      onSelectBatch={chooseBatch}
      onBuildReels={buildReels}
      onGenerateImage={generateCastImage}
      onGenerateVideo={generateCastVideo}
      onExport={exportOne}
    />
  ) : (
    <CastOnboarding
      workspace={workspace}
      busy={busy}
      error={error}
      clerkEnabled={clerkEnabled}
      savedProjects={savedProjects}
      onDismissError={() => setError("")}
      onReset={resetProject}
      onOpenProject={openSavedProject}
      onAnalyze={analyzeProduct}
      onUpdateWorkspace={updateWorkspace}
      onUpdateBrief={updateBrief}
      onCreateCast={createCast}
      onChooseCreator={chooseCreator}
      onOpenStudio={openCastStudio}
    />
  );

  return (
    <>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CONVEX_URL ? (
        <CloudProjectSync
          workspace={workspace}
          hydrated={hydrated}
          pendingExports={pendingExports}
          onAssetStored={handleAssetStored}
          onClipStored={handleClipStored}
          onExportStored={handleExportStored}
          onRestore={restoreWorkspace}
          onProjectsChanged={handleCloudProjects}
        />
      ) : null}
      {clerkEnabled ? (
        <>
          <Show when="signed-out">{workspace.step === 0 && !demoStarted ? <MarketingHome clerkEnabled onStartDemo={startDemo} /> : experience}</Show>
          <Show when="signed-in">{experience}</Show>
        </>
      ) : workspace.step === 0 && !demoStarted ? <MarketingHome clerkEnabled={false} onStartDemo={startDemo} /> : experience}
    </>
  );
}

function MarketingHome({ clerkEnabled, onStartDemo }: { clerkEnabled: boolean; onStartDemo: () => void }) {
  const studioButton = clerkEnabled ? (
    <SignInButton mode="modal"><button className="button button--primary home-cta">Open the studio <ArrowRight size={16} /></button></SignInButton>
  ) : (
    <button className="button button--primary home-cta" onClick={onStartDemo}>Open the demo studio <ArrowRight size={16} /></button>
  );

  return (
    <div className="hypecast-home">
      <header className="home-nav">
        <div className="brand"><span className="brand-mark">H</span><span>HYPECAST</span></div>
        <nav><a href="#how-it-works">How it works</a><a href="#story-format">Story format</a></nav>
        <div className="home-nav-actions">{clerkEnabled ? <SignInButton mode="modal"><button className="home-login">Log in</button></SignInButton> : null}{studioButton}</div>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="eyebrow">AI CREATOR STUDIO · BUILD WEEK MVP</span>
            <h1>Give your product<br />a cast worth <em>following.</em></h1>
            <p>Hypecast turns one product link into a consistent creator and five story-led reels. The free demo reads your real page, lets you choose the face, and builds the first still-image reel.</p>
            <div className="home-hero-actions">{studioButton}<button className="text-button" onClick={onStartDemo}><Play size={15} /> Try the zero-credit demo</button></div>
            <div className="home-proofline"><span>01 approved cast</span><span>05 editable stories</span><span>15s silent reels</span><span>$0 video generation</span></div>
          </div>
          <div className="home-product-shot" aria-label="Hypecast studio preview">
            <div className="home-shot-top"><span>CAST / MAYA</span><strong>Story 01</strong><small>15 SEC</small></div>
            <div className="home-shot-body">
              <div className="home-shot-assets"><span>CAST LIBRARY</span>{demoCreators.slice(0, 3).map((creator, index) => <img key={creator.id} src={creator.imageDataUrl} alt="" className={index === 0 ? "is-active" : ""} />)}</div>
              <ReelPreview reel={homepageReel} clip={homepageClips[0]} compact />
              <div className="home-shot-story"><span>ONE STORY · FULL 15s</span><p>{homepageReel.cards[0].text}</p><button>Export MP4</button></div>
            </div>
          </div>
        </section>

        <section className="home-thesis" id="how-it-works">
          <div><span className="eyebrow">THE CAST STAYS. THE STORIES CHANGE.</span><h2>Not another prompt box.<br />A repeatable creator workflow.</h2></div>
          <div className="home-steps">
            <article><span>01</span><h3>Paste the real link</h3><p>Hypecast reads the public page and shows you exactly what it extracted before anything is created.</p></article>
            <article><span>02</span><h3>Choose the cast</h3><p>Review five distinct creator candidates. The one you approve becomes the identity anchor for the account.</p></article>
            <article><span>03</span><h3>Get the first reel</h3><p>The selected portrait becomes a 15-second still reel with editable text, ready to preview and export.</p></article>
          </div>
        </section>

        <section className="home-story-format" id="story-format">
          <div className="story-format-copy">
            <span className="eyebrow">THE WRITING STANDARD</span>
            <h2>An experience first.<br />The product barely enters.</h2>
            <p>The creator shares something personal: a small moment, what they assumed, what changed, and what they learned. If the product appears, it is an ordinary detail—not the hero or the lesson.</p>
            <div className="story-rhythm"><span>personal moment</span><ArrowRight size={14} /><span>what I assumed</span><ArrowRight size={14} /><span>what changed</span><ArrowRight size={14} /><span>what stayed with me</span></div>
          </div>
          <blockquote>“taking good notes and noticing the right thing are completely different skills.”<span>Illustrative personal story</span></blockquote>
        </section>

        <section className="home-final-cta">
          <span className="eyebrow">ONE LINK → ONE CAST → FIVE REELS</span>
          <h2>Build the account before<br />you buy the motion.</h2>
          <p>Your first batch reuses the approved portrait with a subtle local push-in. Add paid video assets only when the stories prove they deserve them.</p>
          {studioButton}
        </section>
      </main>
      <footer className="home-footer"><div className="brand"><span className="brand-mark">H</span><span>HYPECAST</span></div><span>GrowthX Build Week MVP</span></footer>
    </div>
  );
}

type OnboardingProps = {
  workspace: WorkspaceSnapshot;
  savedProjects: SavedProject[];
  busy: string;
  error: string;
  clerkEnabled: boolean;
  onDismissError: () => void;
  onReset: () => void;
  onOpenProject: (clientProjectId: string) => void;
  onAnalyze: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateWorkspace: (patch: Partial<WorkspaceSnapshot>) => void;
  onUpdateBrief: <K extends keyof ProductBrief>(key: K, value: ProductBrief[K]) => void;
  onCreateCast: () => void;
  onChooseCreator: (id: string) => void;
  onOpenStudio: () => void;
};

function CastOnboarding(props: OnboardingProps) {
  const { workspace, busy, error } = props;
  const selectedCreator = workspace.creators.find((creator) => creator.id === workspace.selectedCreatorId);
  return (
    <div className="onboarding-shell">
      <header className="studio-topbar">
        <button className="brand" onClick={props.onReset}><span className="brand-mark">H</span><span>HYPECAST</span></button>
        <div className="studio-topbar-title"><span>CREATOR ONBOARDING</span><strong>{workspace.brief?.productName || "New cast"}</strong></div>
        <div className="onboarding-top-actions">
          {workspace.mode === "demo" ? <span className="status-pill"><span className="signal signal--live" /> Free demo · no credits</span> : null}
          {props.clerkEnabled ? <Show when="signed-in" fallback={<SignInButton mode="modal"><button className="button button--small"><LogIn size={14} /> Sign in</button></SignInButton>}><UserButton /></Show> : null}
        </div>
      </header>

      <main className="onboarding-main">
        <aside className="onboarding-aside">
          <span className="eyebrow">SET UP YOUR CAST</span>
          <h2>Three decisions.<br />Then the studio.</h2>
          <p>Paste the product link, confirm what Hypecast understood, then choose the person who will carry the account.</p>
          <div className="onboarding-steps">
            {onboardingSteps.map((label, index) => <button key={label} className={`${workspace.step === index ? "is-active" : ""} ${workspace.step > index ? "is-done" : ""}`} disabled={index > workspace.step} onClick={() => props.onUpdateWorkspace({ step: index })}><span>{workspace.step > index ? <Check size={14} /> : `0${index + 1}`}</span><strong>{label}</strong></button>)}
          </div>
          <div className="onboarding-budget"><strong>$0 first-run video spend</strong><span>The selected portrait becomes the first reusable background.</span></div>
          {props.savedProjects.some((project) => project.clientProjectId !== workspace.clientProjectId && project.snapshot.step > 0) ? (
            <div className="saved-projects saved-projects--onboarding">
              <span>RECENT STUDIOS</span>
              {props.savedProjects.filter((project) => project.clientProjectId !== workspace.clientProjectId && project.snapshot.step > 0).slice(0, 4).map((project) => (
                <button key={project.clientProjectId} onClick={() => props.onOpenProject(project.clientProjectId)}>
                  <strong>{project.productName}</strong><small>{project.source === "cloud" ? <Cloud size={10} /> : <Clock3 size={10} />}{new Date(project.updatedAt).toLocaleDateString()}</small>
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <section className="onboarding-content">
          {error ? <Notice message={error} onDismiss={props.onDismissError} /> : null}
          {workspace.step === 0 ? (
            <div className="onboarding-stage onboarding-stage--narrow">
              <StageHeader step="01 / 03" eyebrow="READ THE LINK" title="Start with the actual product." description="Paste a public website or app-store link. Hypecast reads the page first and lets you correct the extracted direction before creating anything." />
              <form className="onboarding-url-form" onSubmit={props.onAnalyze}>
                <label htmlFor="studio-product-url">Website or app link</label>
                <input id="studio-product-url" type="url" value={workspace.productUrl} placeholder="https://yourproduct.com" onChange={(event) => props.onUpdateWorkspace({ productUrl: event.target.value })} required autoFocus />
                <button className="button button--primary button--wide" disabled={busy === "analyzing"}>{busy === "analyzing" ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />} {busy === "analyzing" ? "Reading the page…" : "Extract product details"}</button>
                <p className="onboarding-demo-note">{workspace.mode === "demo" ? "Free demo: real page extraction, sample cast portraits, and a $0 still-image reel. No API credits are used." : "Live studio: AI refines the extracted page into a deeper creative direction."}</p>
              </form>
            </div>
          ) : null}

          {workspace.step === 1 && workspace.brief ? (
            <div className="onboarding-stage">
              <StageHeader step="02 / 03" eyebrow="EXTRACTED DIRECTION" title="Is this what the product actually is?" description="This came from the link you entered. Correct anything vague or wrong; the cast and the first reel will use the approved version." />
              <div className="brief-source"><span>{workspace.brief.source.title || workspace.brief.source.url}</span><a href={workspace.brief.source.url} target="_blank" rel="noreferrer">View source</a></div>
              <div className="form-grid onboarding-form-grid">
                <label><span>Product name</span><input value={workspace.brief.productName} onChange={(event) => props.onUpdateBrief("productName", event.target.value)} /></label>
                <label><span>Writing voice</span><input value={workspace.brief.tone} onChange={(event) => props.onUpdateBrief("tone", event.target.value)} /></label>
                <label className="span-2"><span>What it does</span><textarea rows={3} value={workspace.brief.oneLiner} onChange={(event) => props.onUpdateBrief("oneLiner", event.target.value)} /></label>
                <label className="span-2"><span>Who the stories are for</span><textarea rows={3} value={workspace.brief.audience} onChange={(event) => props.onUpdateBrief("audience", event.target.value)} /></label>
                <label className="span-2"><span>The tension worth writing about</span><textarea rows={3} value={workspace.brief.problem} onChange={(event) => props.onUpdateBrief("problem", event.target.value)} /></label>
              </div>
              <div className="onboarding-action"><button className="button button--primary" onClick={props.onCreateCast} disabled={busy === "cast"}>{busy === "cast" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {busy === "cast" ? "Creating the cast…" : "Approve and create five cast options"}</button><span>{workspace.mode === "demo" ? "Free demo uses five ready-made portraits tailored to this direction." : "Live mode generates five new portrait candidates."}</span></div>
            </div>
          ) : null}

          {workspace.step === 2 ? (
            <div className="onboarding-stage onboarding-stage--wide">
              <StageHeader step="03 / 03" eyebrow="CHOOSE THE CAST" title="Who should carry the account?" description="Choose the person who feels native to the audience—not the most polished face. Hypecast will immediately turn that portrait into the first 15-second reel." />
              <div className="onboarding-cast-grid">
                {workspace.creators.map((creator) => (
                  <button key={creator.id} className={`onboarding-cast-card ${workspace.selectedCreatorId === creator.id ? "is-selected" : ""}`} onClick={() => creator.imageStatus === "ready" && props.onChooseCreator(creator.id)} disabled={creator.imageStatus !== "ready"}>
                    <div className="creator-image">{creator.imageDataUrl ? <img src={creator.imageDataUrl} alt={creator.name} /> : <div className="loading-tile"><LoaderCircle className={creator.imageStatus === "generating" ? "spin" : ""} /><span>{creator.imageStatus === "failed" ? "Image failed" : "Casting…"}</span></div>}{workspace.selectedCreatorId === creator.id ? <span className="selected-stamp"><Check size={14} /> YOUR CAST</span> : null}</div>
                    <div><span>{creator.archetype}</span><h3>{creator.name}</h3><p>{creator.energy} · {creator.wardrobe}</p></div>
                  </button>
                ))}
              </div>
              <div className="onboarding-action"><button className="button button--primary" onClick={props.onOpenStudio} disabled={!selectedCreator || busy === "opening-studio"}>{busy === "opening-studio" ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />} {busy === "opening-studio" ? "Creating the first reel…" : `Choose ${selectedCreator?.name.split(" ")[0] || "a cast"} and create reel`}</button><span>The chosen portrait becomes a 15-second still background with editable text.</span></div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

type CastStudioProps = {
  workspace: WorkspaceSnapshot;
  creator: CreatorCandidate;
  savedProjects: SavedProject[];
  clerkEnabled: boolean;
  selectedReel?: Reel;
  selectedAssetId: string;
  activeClip?: VideoClip;
  previewReel?: Reel;
  busy: string;
  error: string;
  exportProgress: Record<string, number>;
  capabilities: (AppCapabilities & { openrouter?: boolean }) | null;
  videoPlan: VideoPlan | null;
  onDismissError: () => void;
  onReset: () => void;
  onChangeCast: () => void;
  onOpenProject: (clientProjectId: string) => void;
  onSelectReel: (id: string) => void;
  onSelectAsset: (id: string) => void;
  onUpdateStory: (reel: Reel, text: string) => void;
  onUpdateReel: (id: string, patch: Partial<Reel>) => void;
  onSelectBatch: (id: string) => void;
  onBuildReels: () => void;
  onGenerateImage: (direction: string) => Promise<boolean>;
  onGenerateVideo: (motionPrompt: string, duration: 5 | 15) => Promise<boolean>;
  onExport: (reel: Reel) => void;
};

function CastStudio(props: CastStudioProps) {
  const { workspace, creator, selectedReel } = props;
  const [editingReelId, setEditingReelId] = useState<string | null>(null);
  const [assetComposerOpen, setAssetComposerOpen] = useState(false);
  const [assetKind, setAssetKind] = useState<"image" | "video">("image");
  const [imageDirection, setImageDirection] = useState("Front-facing waist-up portrait, calm attentive expression, soft window light, simple lived-in background. The creator is alone with empty hands. No products, screens, text, logos, or collage elements.");
  const [selectedRecipeId, setSelectedRecipeId] = useState(DEFAULT_MOTION_RECIPE.id);
  const [motionPrompt, setMotionPrompt] = useState(DEFAULT_MOTION_RECIPE.motionPrompt);
  const [videoDuration, setVideoDuration] = useState<5 | 15>(5);
  const activeReference = workspace.references.find((reference) => reference.id === props.activeClip?.referenceImageId);
  const story = selectedReel?.cards[0]?.text || "";
  const wordCount = story.trim() ? story.trim().split(/\s+/).length : 0;
  const exporting = selectedReel ? Boolean(props.exportProgress[selectedReel.id] && props.exportProgress[selectedReel.id] < 100) : false;
  const isEditing = Boolean(selectedReel && editingReelId === selectedReel.id);
  const videoAvailable = Boolean(props.capabilities?.openrouter || props.capabilities?.fal);
  const selectedRecipe = MOTION_RECIPES.find((recipe) => recipe.id === selectedRecipeId) || DEFAULT_MOTION_RECIPE;
  const videoEstimate = videoDuration === 5
    ? props.videoPlan?.selected.estimatedPreviewUsd
    : props.videoPlan?.selected.estimatedClipUsd;
  const videoEstimateLabel = videoEstimate === undefined ? "price checking" : `$${videoEstimate.toFixed(2)}`;
  const previewEstimate = props.videoPlan?.selected.estimatedPreviewUsd;
  const previewEstimateLabel = previewEstimate === undefined ? "price checking" : `$${previewEstimate.toFixed(2)}`;
  const providerPromptPreview = composeVideoPrompt(motionPrompt, videoDuration);

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = assetKind === "image"
      ? await props.onGenerateImage(imageDirection.trim())
      : await props.onGenerateVideo(motionPrompt.trim(), videoDuration);
    if (created) setAssetComposerOpen(false);
  }

  return (
    <div className="cast-shell">
      <aside className="cast-sidebar">
        <button className="brand" onClick={props.onReset}><span className="brand-mark">H</span><span>HYPECAST</span></button>
        <span className="cast-nav-label">WORKSPACE</span>
        <nav className="cast-nav"><a className="is-active" href="#cast-studio"><LayoutGrid size={16} /><span>Cast studio</span></a><a href="#cast-backgrounds"><Library size={16} /><span>Backgrounds</span><small>{workspace.clips.length}</small></a><a href="#cast-reels"><FileVideo size={16} /><span>Reels</span><small>{workspace.reels.length}</small></a></nav>
        <div className="cast-sidebar-project"><span>ACTIVE PROJECT</span><strong>{workspace.brief?.productName}</strong><button onClick={props.onReset}>Start another product</button></div>
        {props.savedProjects.some((project) => project.clientProjectId !== workspace.clientProjectId && project.snapshot.step > 0) ? (
          <div className="saved-projects">
            <span>RECENT STUDIOS</span>
            {props.savedProjects.filter((project) => project.clientProjectId !== workspace.clientProjectId && project.snapshot.step > 0).slice(0, 4).map((project) => (
              <button key={project.clientProjectId} onClick={() => props.onOpenProject(project.clientProjectId)}>
                <strong>{project.productName}</strong><small>{project.source === "cloud" ? <Cloud size={10} /> : <Clock3 size={10} />}{new Date(project.updatedAt).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
        ) : null}
        <div className="cast-sidebar-user">{props.clerkEnabled ? <Show when="signed-in"><UserButton /></Show> : null}<span>{props.clerkEnabled ? "Saved to your studio" : "Local demo project"}</span></div>
      </aside>

      <main className="cast-main">
        <header className="cast-topbar"><div><button className="studio-back-button" onClick={props.onChangeCast}><ArrowLeft size={14} /> Back to cast</button><span>CAST STUDIO / {creator.name.toUpperCase()}</span><h1>Make the next reel.</h1></div><div className="cast-topbar-status"><span className="signal signal--live" />{props.clerkEnabled ? <Show when="signed-in" fallback={<>Saved on this device</>}>Cloud autosave on</Show> : "Saved on this device"}</div></header>
        {props.error ? <Notice message={props.error} onDismiss={props.onDismissError} /> : null}
        <div className="cast-workbench" id="cast-studio">
          <section className="cast-assets-panel" id="cast-backgrounds">
            <div className="cast-profile"><img src={creator.imageDataUrl} alt={creator.name} /><div><span>YOUR CAST</span><h2>{creator.name}</h2><p>{creator.archetype}</p><button className="change-cast-button" onClick={props.onChangeCast}>Change cast <ArrowRight size={11} /></button></div></div>
            <div className="cast-character-note"><span>CONTINUITY</span><p>{creator.characterBible}</p></div>
            <div className="asset-heading"><div><span>ALL CAST ASSETS · {workspace.clips.length}</span><strong>Choose an image or video</strong></div><button title="Generate a new cast asset" aria-label="Generate a new cast asset" onClick={() => setAssetComposerOpen((open) => !open)} className={assetComposerOpen ? "is-active" : ""}><Plus size={15} /></button></div>
            {assetComposerOpen ? (
              <form className="asset-composer" onSubmit={submitAsset}>
                <div className="asset-composer-head"><strong>New cast asset</strong><button type="button" aria-label="Close asset generator" onClick={() => setAssetComposerOpen(false)}><X size={13} /></button></div>
                <div className="asset-kind-tabs"><button type="button" className={assetKind === "image" ? "is-active" : ""} onClick={() => setAssetKind("image")}><ImageIcon size={13} /> Image</button><button type="button" className={assetKind === "video" ? "is-active" : ""} onClick={() => setAssetKind("video")}><FileVideo size={13} /> Video</button></div>
                {assetKind === "image" ? (
                  <label><span>PORTRAIT DIRECTION</span><textarea value={imageDirection} rows={5} onChange={(event) => setImageDirection(event.target.value)} /><small>Uses the approved cast portrait as the identity source. The prompt keeps the person alone and excludes product screenshots.</small></label>
                ) : (
                  <div className="motion-builder">
                    <div className="motion-builder-head"><span>CHOOSE A DIRECTION</span><small>$0 to choose, inspect, and edit</small></div>
                    <div className="motion-recipe-grid">
                      {MOTION_RECIPES.map((recipe) => (
                        <button type="button" key={recipe.id} className={selectedRecipe.id === recipe.id ? "is-active" : ""} onClick={() => { setSelectedRecipeId(recipe.id); setMotionPrompt(recipe.motionPrompt); }}>
                          <span>{recipe.beat}</span><strong>{recipe.title}</strong><small>{recipe.description}</small>
                        </button>
                      ))}
                    </div>
                    <div className="motion-source-note"><div><span>SOURCE CHECK</span><p>{selectedRecipe.sourceNote}</p></div>{selectedRecipe.requiresNewImage ? <button type="button" onClick={() => { setImageDirection(selectedRecipe.imageDirection); void props.onGenerateImage(selectedRecipe.imageDirection); }} disabled={props.busy === "image-asset"}>{props.busy === "image-asset" ? <LoaderCircle className="spin" size={13} /> : <ImageIcon size={13} />} Use image credits · create car still</button> : null}</div>
                    <label><span>FINAL MOTION PROMPT · EDIT ANYTHING</span><textarea value={motionPrompt} rows={7} onChange={(event) => setMotionPrompt(event.target.value)} /><small>The exact identity-locked prompt is saved with the clip. No credits are used while you edit this.</small></label>
                    <details className="provider-prompt-preview"><summary>View exact provider prompt</summary><p>{providerPromptPreview}</p></details>
                    <div className="motion-duration"><span>PAID GENERATION LENGTH</span><div><button type="button" className={videoDuration === 5 ? "is-active" : ""} onClick={() => setVideoDuration(5)}><strong>5s test</strong><small>{previewEstimateLabel} est. · loops in 15s reel</small></button><button type="button" className={videoDuration === 15 ? "is-active" : ""} onClick={() => setVideoDuration(15)}><strong>15s full</strong><small>{props.videoPlan?.selected.estimatedClipUsd === undefined ? "price checking" : `$${props.videoPlan.selected.estimatedClipUsd.toFixed(2)} est.`}</small></button></div></div>
                    <p className="motion-spend-note">Credits are used only when you press the generation button below.</p>
                  </div>
                )}
                <button className="button button--primary button--wide" disabled={!((assetKind === "image" ? imageDirection : motionPrompt).trim()) || props.busy === "image-asset" || props.busy === "video-asset" || (assetKind === "video" && (!videoAvailable || !props.videoPlan))}>{props.busy === `${assetKind}-asset` ? <LoaderCircle className="spin" size={15} /> : assetKind === "image" ? <ImageIcon size={15} /> : <FileVideo size={15} />}{assetKind === "image" ? "Generate image" : videoAvailable ? `Spend ${videoEstimateLabel} · generate ${videoDuration}s` : "Connect video provider"}</button>
              </form>
            ) : null}
            <div className="asset-list">
              {workspace.clips.map((clip) => <button key={clip.id} disabled={clip.status !== "ready"} title={clip.error} className={props.selectedAssetId === clip.id || selectedReel?.clipId === clip.id ? "is-selected" : ""} onClick={() => props.onSelectAsset(clip.id)}><div>{clip.videoUrl ? <video src={clip.videoUrl} muted playsInline loop /> : <img src={clip.posterUrl} alt="" />}{clip.status === "queued" || clip.status === "generating" ? <LoaderCircle className="spin" size={13} /> : clip.videoUrl ? <FileVideo size={13} /> : <ImageIcon size={13} />}</div><span>{clip.label}</span><small>{clip.status === "failed" ? "Generation failed" : clip.status === "queued" || clip.status === "generating" ? "Generating · safely saved" : clip.provider === "still" ? "$0 · subtle push-in" : `${clip.provider} · ${clip.duration || 15}s reusable loop`}</small></button>)}
            </div>
            {props.activeClip ? (
              <div className="asset-prompt-card">
                <div className="asset-prompt-head"><span>{props.activeClip.provider === "still" ? "MOTION RECIPE" : "EXACT VIDEO PROMPT"}</span><small>{props.activeClip.provider === "still" ? "$0 · local effect" : "Saved with this asset"}</small></div>
                <p>{props.activeClip.generationPrompt || props.activeClip.motionPrompt}</p>
                <div className="asset-prompt-source"><span>IDENTITY SOURCE</span><strong>{activeReference?.label || "Approved cast portrait"}</strong></div>
              </div>
            ) : null}
            <button className="motion-note" onClick={() => { setAssetKind("video"); setAssetComposerOpen(true); }}><Plus size={14} /><div><strong>Plan motion before spending</strong><span>{videoAvailable ? `Choose and edit directions free · ${previewEstimateLabel} estimated for a reusable 5s test.` : "Connect OpenRouter later; your image workflow works now."}</span></div></button>
          </section>

          <section className="cast-preview-stage">
            <div className="cast-preview-head"><span>LIVE OUTPUT</span><strong>9:16 · 15 sec · sound off</strong></div>
            <ReelPreview reel={props.previewReel} clip={props.activeClip} />
            {workspace.reels.length ? <div className="studio-reel-tabs">{workspace.reels.map((reel, index) => <button key={reel.id} className={selectedReel?.id === reel.id ? "is-active" : ""} onClick={() => props.onSelectReel(reel.id)}><span>0{index + 1}</span><strong>{reel.title}</strong></button>)}</div> : <div className="preview-empty-note">Your selected cast asset is ready. Write the first batch to fill the canvas.</div>}
          </section>

          <section className="story-panel" id="cast-reels">
            <div className="story-panel-head"><div><span>STORY DESK</span><h2>{selectedReel ? selectedReel.title : "Write the first batch"}</h2></div><span className="draft-pill">{workspace.mode === "demo" ? "FREE DEMO" : "AI DRAFT"}</span></div>
            {selectedReel ? (
              <>
                {workspace.storyBatches.length ? (
                  <label className="batch-picker"><span><Clock3 size={12} /> STORY HISTORY</span><select value={workspace.activeBatchId || ""} onChange={(event) => props.onSelectBatch(event.target.value)}>{workspace.storyBatches.map((batch, index) => <option key={batch.id} value={batch.id}>Batch {index + 1} · {new Date(batch.createdAt).toLocaleString()}</option>)}</select></label>
                ) : null}
                <div className="story-rule"><span>ONE TEXT · FULL DURATION</span><strong>00:00 — 00:15</strong></div>
                <div className="story-copy-head">
                  <div><span>FINAL COPY</span><small>Ready to export as-is. Editing is optional.</small></div>
                  <button className="text-button" onClick={() => setEditingReelId(isEditing ? null : selectedReel.id)}>{isEditing ? <Check size={14} /> : <Pencil size={14} />}{isEditing ? "Done editing" : "Edit copy"}</button>
                </div>
                {isEditing ? (
                  <label className="story-editor"><textarea aria-label="Edit final story copy" value={story} rows={17} onChange={(event) => props.onUpdateStory(selectedReel, event.target.value)} /><small className={wordCount < 35 || wordCount > 55 ? "is-warning" : ""}>Changes save automatically · {wordCount} words · 35–55 reads cleanly in 15 seconds</small></label>
                ) : (
                  <div className="story-review"><p>{story}</p><small className={wordCount < 35 || wordCount > 55 ? "is-warning" : ""}>{wordCount} words · target 35–55 · product facts should be checked before posting</small></div>
                )}
                <div className="story-controls">
                  <label><span>Font</span><select aria-label="Reel font" value={selectedReel.fontFamily} onChange={(event) => props.onUpdateReel(selectedReel.id, { fontFamily: event.target.value as Reel["fontFamily"] })}><option value="sans">Clean sans</option><option value="serif">Editorial serif</option><option value="mono">Typewriter mono</option></select></label>
                  <label><span>Text size</span><select aria-label="Reel text size" value={selectedReel.fontSize} onChange={(event) => props.onUpdateReel(selectedReel.id, { fontSize: event.target.value as Reel["fontSize"] })}><option value="small">Compact</option><option value="medium">Standard</option><option value="large">Large</option></select></label>
                  <label><span>Placement</span><select value={selectedReel.position} onChange={(event) => props.onUpdateReel(selectedReel.id, { position: event.target.value as Reel["position"] })}><option value="top">Top safe zone</option><option value="center">Center</option><option value="bottom">Bottom safe zone</option></select></label>
                  <label><span>Treatment</span><select value={selectedReel.style} onChange={(event) => props.onUpdateReel(selectedReel.id, { style: event.target.value as Reel["style"] })}><option value="glass">Smoked glass</option><option value="clean">Clean outline</option><option value="highlight">Hype orange</option></select></label>
                </div>
                <div className="story-actions"><button className="button" onClick={props.onBuildReels} disabled={props.busy === "stories"}>{props.busy === "stories" ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Rewrite batch</button><button className="button button--primary" onClick={() => props.onExport(selectedReel)} disabled={exporting}>{exporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{exporting ? `Encoding ${props.exportProgress[selectedReel.id]}%` : "Export MP4"}</button></div>
                {workspace.exports.length ? (
                  <div className="export-history"><span>EXPORT HISTORY · {workspace.exports.length}</span>{workspace.exports.slice(0, 3).map((item) => item.url ? <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><FileVideo size={12} /><strong>{item.title}</strong><small>Cloud copy</small></a> : <div key={item.id}><Download size={12} /><strong>{item.title}</strong><small>Downloaded · saves after sign-in</small></div>)}</div>
                ) : null}
              </>
            ) : (
              <div className="story-empty">
                <div className="story-structure"><span>01</span><p>Personal moment</p><span>02</span><p>What I assumed</p><span>03</span><p>What changed</p><span>04</span><p>What stayed with me</p></div>
                <p>Hypecast will write five first-person experiences. The product is optional and never becomes the lesson.</p>
                <button className="button button--primary button--wide" onClick={props.onBuildReels} disabled={props.busy === "stories"}>{props.busy === "stories" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Write five personal stories</button>
              </div>
            )}
            <div className="studio-health"><span><i className={props.capabilities?.openai ? "is-ready" : ""} /> Writing model</span><span><i className="is-ready" /> $0 still mode</span><span><i className={props.capabilities?.convex ? "is-ready" : ""} /> Cloud save</span></div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div className="notice notice--error"><CircleAlert size={17} /><span>{message}</span><button onClick={onDismiss}><X size={15} /></button></div>;
}

function StageHeader({ step, eyebrow, title, description }: { step: string; eyebrow: string; title: string; description: string }) {
  return <header className="onboarding-stage-header"><span className="stage-count">{step}</span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

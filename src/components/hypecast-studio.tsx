"use client";
/* eslint-disable @next/next/no-img-element */

import {
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
import { demoBrief, demoClips, demoCreators, demoReels, demoReferences } from "@/lib/demo-data";
import { exportReel } from "@/lib/reel-export";
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
const onboardingSteps = ["Product", "Direction", "Cast"];

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

function newWorkspace(): WorkspaceSnapshot {
  return { ...emptyWorkspace, clientProjectId: newId("project"), updatedAt: Date.now() };
}

function cloneReels(reels: Reel[]) {
  return reels.map((reel) => ({ ...reel, cards: reel.cards.map((card) => ({ ...card })) }));
}

function stillClip(reference: ReferenceImage): VideoClip {
  return {
    id: "clip-still",
    label: "Creator portrait · 15s",
    motionPrompt: "A gentle local push-in gives the still subtle motion without a video-generation call.",
    referenceImageId: reference.id,
    provider: "still",
    status: "ready",
    posterUrl: reference.imageDataUrl,
  };
}

function normalizeWorkspace(saved: WorkspaceSnapshot): WorkspaceSnapshot {
  const references = Array.isArray(saved.references) ? saved.references : [];
  let clips = Array.isArray(saved.clips)
    ? saved.clips.map((clip) => ({ ...clip, label: clip.label.replace("17s", "15s") }))
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
    } satisfies Reel;
  });
  const batches = Array.isArray(saved.storyBatches) ? saved.storyBatches.map((batch) => ({
    ...batch,
    reels: cloneReels(batch.reels || []),
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
    exports: Array.isArray(saved.exports) ? saved.exports : [],
    step,
    updatedAt: saved.updatedAt || Date.now(),
  };
}

export function HypecastStudio() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(emptyWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [capabilities, setCapabilities] = useState<(AppCapabilities & { openrouter?: boolean }) | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [selectedReelId, setSelectedReelId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [exportProgress, setExportProgress] = useState<Record<string, number>>({});
  const [deviceProjects, setDeviceProjects] = useState<SavedProject[]>([]);
  const [cloudProjects, setCloudProjects] = useState<SavedProject[]>([]);
  const [pendingExports, setPendingExports] = useState<PendingExport[]>([]);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setWorkspace(normalizeWorkspace(JSON.parse(saved) as WorkspaceSnapshot));
        } else {
          setWorkspace(newWorkspace());
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
        setWorkspace(newWorkspace());
      }
      setHydrated(true);
    }, 0);
    apiRequest<AppCapabilities & { openrouter?: boolean }>("/api/health")
      .then(setCapabilities)
      .catch(() => null);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    if (!hydrated || !workspace.clientProjectId) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
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
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next.map((project) => project.snapshot)));
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

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
    restoreWorkspace(project.snapshot);
  }

  function resetProject() {
    setWorkspace(newWorkspace());
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
      const { brief } = await apiRequest<{ brief: ProductBrief }>("/api/analyze", { url: workspace.productUrl });
      updateWorkspace({ mode: "live", brief, step: 1, creators: [], selectedCreatorId: undefined, references: [], clips: [], reels: [], storyBatches: [], activeBatchId: undefined, exports: [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not analyze that page.");
    } finally {
      setBusy("");
    }
  }

  function startDemo() {
    updateWorkspace({
      mode: "demo",
      productUrl: demoBrief.source.url,
      brief: demoBrief,
      step: 1,
      creators: [],
      selectedCreatorId: undefined,
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
      updateWorkspace({ creators: demoCreators, step: 2 });
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
            productName: workspace.brief?.productName,
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

  function openCastStudio() {
    if (!selectedCreator?.imageDataUrl) {
      setError("Choose a creator with a finished portrait first.");
      return;
    }
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
    setSelectedAssetId(clips[0].id);
    updateWorkspace({ references, clips, reels: [], step: 3 });
    setError("");
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
        draftReels = demoReels([chosenClip]);
      } else {
        const { hooks } = await apiRequest<{ hooks: Array<{ title: string; angle: string; story: string }> }>("/api/hooks", workspace.brief);
        draftReels = hooks.map((item, index) => ({
          id: `reel-${index + 1}`,
          title: item.title,
          clipId: chosenClip.id,
          hook: item.story.split(/[.!?]/)[0] || item.angle,
          cards: [{ id: `reel-${index + 1}-story`, text: item.story, start: 0, end: REEL_DURATION }],
          position: "center",
          style: "glass",
        }));
      }
      const batchId = newId("batch");
      const reels = draftReels.map((reel, index) => ({
        ...reel,
        id: `${batchId}-reel-${index + 1}`,
        cards: reel.cards.map((card) => ({ ...card, id: `${batchId}-card-${index + 1}` })),
      }));
      const batch: StoryBatch = { id: batchId, createdAt: Date.now(), reels: cloneReels(reels) };
      setWorkspace((current) => ({
        ...current,
        reels,
        storyBatches: [...current.storyBatches, batch],
        activeBatchId: batchId,
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
      text: "Your cast is ready. Choose a background, then Hypecast will write five first-person stories about something experienced, noticed, and learned. The product may appear as one quiet detail, or not at all.",
      start: 0,
      end: REEL_DURATION,
    }],
    position: "center",
    style: "glass",
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
      savedProjects={savedProjects}
      onDismissError={() => setError("")}
      onReset={resetProject}
      onOpenProject={openSavedProject}
      onSelectReel={setSelectedReelId}
      onSelectAsset={chooseAsset}
      onUpdateStory={updateStory}
      onUpdateReel={updateReel}
      onSelectBatch={chooseBatch}
      onBuildReels={buildReels}
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
      onStartDemo={startDemo}
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
          onExportStored={handleExportStored}
          onRestore={restoreWorkspace}
          onProjectsChanged={handleCloudProjects}
        />
      ) : null}
      {clerkEnabled ? (
        <>
          <Show when="signed-out">{workspace.step === 0 ? <MarketingHome clerkEnabled onStartDemo={startDemo} /> : experience}</Show>
          <Show when="signed-in">{experience}</Show>
        </>
      ) : workspace.step === 0 ? <MarketingHome clerkEnabled={false} onStartDemo={startDemo} /> : experience}
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
            <p>Hypecast turns one product link into a consistent AI creator and five story-led reels. Pick the face once. Change the story as often as you want.</p>
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
            <article><span>01</span><h3>Read the product</h3><p>Hypecast turns your public page into an editable creative direction grounded in what the product actually does.</p></article>
            <article><span>02</span><h3>Choose the cast</h3><p>Review five distinct creator candidates. The one you approve becomes the identity anchor for the account.</p></article>
            <article><span>03</span><h3>Work in the studio</h3><p>Choose one cast image or reusable clip, write five stories, edit the exact text, preview, and export.</p></article>
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
  onStartDemo: () => void;
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
        {props.clerkEnabled ? <Show when="signed-in" fallback={<SignInButton mode="modal"><button className="button button--small"><LogIn size={14} /> Sign in</button></SignInButton>}><UserButton /></Show> : <span className="status-pill">Local demo</span>}
      </header>

      <main className="onboarding-main">
        <aside className="onboarding-aside">
          <span className="eyebrow">SET UP YOUR CAST</span>
          <h2>Three decisions.<br />Then the studio.</h2>
          <p>This is setup, not the product itself. Approve the product direction, choose one creator, then make every reel from their dedicated workspace.</p>
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
              <StageHeader step="01 / 03" eyebrow="PRODUCT" title="What are we casting for?" description="Paste the public product page. Hypecast will extract an editable creative brief before it spends anything on creator images." />
              <form className="onboarding-url-form" onSubmit={props.onAnalyze}>
                <label htmlFor="studio-product-url">Public product URL</label>
                <input id="studio-product-url" type="url" value={workspace.productUrl} placeholder="https://yourproduct.com" onChange={(event) => props.onUpdateWorkspace({ productUrl: event.target.value })} required />
                <button className="button button--primary button--wide" disabled={busy === "analyzing"}>{busy === "analyzing" ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />} Build the creative direction</button>
              </form>
              <button className="text-button onboarding-demo" onClick={props.onStartDemo}><Play size={15} /> Continue with the sample product instead</button>
            </div>
          ) : null}

          {workspace.step === 1 && workspace.brief ? (
            <div className="onboarding-stage">
              <StageHeader step="02 / 03" eyebrow="DIRECTION" title="Make sure the premise is true." description="This is the source material for the cast and every future story. Fix anything vague, generic, or unsupported." />
              <div className="brief-source"><span>{workspace.brief.source.title || workspace.brief.source.url}</span><a href={workspace.brief.source.url} target="_blank" rel="noreferrer">View source</a></div>
              <div className="form-grid onboarding-form-grid">
                <label><span>Product name</span><input value={workspace.brief.productName} onChange={(event) => props.onUpdateBrief("productName", event.target.value)} /></label>
                <label><span>Writing voice</span><input value={workspace.brief.tone} onChange={(event) => props.onUpdateBrief("tone", event.target.value)} /></label>
                <label className="span-2"><span>What it does</span><textarea rows={3} value={workspace.brief.oneLiner} onChange={(event) => props.onUpdateBrief("oneLiner", event.target.value)} /></label>
                <label className="span-2"><span>Who the stories are for</span><textarea rows={3} value={workspace.brief.audience} onChange={(event) => props.onUpdateBrief("audience", event.target.value)} /></label>
                <label className="span-2"><span>The tension worth writing about</span><textarea rows={3} value={workspace.brief.problem} onChange={(event) => props.onUpdateBrief("problem", event.target.value)} /></label>
              </div>
              <div className="onboarding-action"><button className="button button--primary" onClick={props.onCreateCast} disabled={busy === "cast"}>{busy === "cast" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Approve and cast five creators</button><span>Live mode uses five image generations.</span></div>
            </div>
          ) : null}

          {workspace.step === 2 ? (
            <div className="onboarding-stage onboarding-stage--wide">
              <StageHeader step="03 / 03" eyebrow="CAST" title="Who should tell these stories?" description="Choose the person who feels native to the audience—not the most polished face. Their appearance and character bible anchor future assets." />
              <div className="onboarding-cast-grid">
                {workspace.creators.map((creator) => (
                  <button key={creator.id} className={`onboarding-cast-card ${workspace.selectedCreatorId === creator.id ? "is-selected" : ""}`} onClick={() => creator.imageStatus === "ready" && props.onChooseCreator(creator.id)} disabled={creator.imageStatus !== "ready"}>
                    <div className="creator-image">{creator.imageDataUrl ? <img src={creator.imageDataUrl} alt={creator.name} /> : <div className="loading-tile"><LoaderCircle className={creator.imageStatus === "generating" ? "spin" : ""} /><span>{creator.imageStatus === "failed" ? "Image failed" : "Casting…"}</span></div>}{workspace.selectedCreatorId === creator.id ? <span className="selected-stamp"><Check size={14} /> YOUR CAST</span> : null}</div>
                    <div><span>{creator.archetype}</span><h3>{creator.name}</h3><p>{creator.energy} · {creator.wardrobe}</p></div>
                  </button>
                ))}
              </div>
              <div className="onboarding-action"><button className="button button--primary" onClick={props.onOpenStudio} disabled={!selectedCreator}><ArrowRight size={17} /> Open {selectedCreator?.name.split(" ")[0] || "cast"}&apos;s studio</button><span>The chosen portrait is reused. No new image or video call.</span></div>
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
  onDismissError: () => void;
  onReset: () => void;
  onOpenProject: (clientProjectId: string) => void;
  onSelectReel: (id: string) => void;
  onSelectAsset: (id: string) => void;
  onUpdateStory: (reel: Reel, text: string) => void;
  onUpdateReel: (id: string, patch: Partial<Reel>) => void;
  onSelectBatch: (id: string) => void;
  onBuildReels: () => void;
  onExport: (reel: Reel) => void;
};

function CastStudio(props: CastStudioProps) {
  const { workspace, creator, selectedReel } = props;
  const [editingReelId, setEditingReelId] = useState<string | null>(null);
  const story = selectedReel?.cards[0]?.text || "";
  const wordCount = story.trim() ? story.trim().split(/\s+/).length : 0;
  const exporting = selectedReel ? Boolean(props.exportProgress[selectedReel.id] && props.exportProgress[selectedReel.id] < 100) : false;
  const isEditing = Boolean(selectedReel && editingReelId === selectedReel.id);

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
        <header className="cast-topbar"><div><span>CAST STUDIO / {creator.name.toUpperCase()}</span><h1>Make the next reel.</h1></div><div className="cast-topbar-status"><span className="signal signal--live" />{props.clerkEnabled ? <Show when="signed-in" fallback={<>Saved on this device</>}>Cloud autosave on</Show> : "Saved on this device"}</div></header>
        {props.error ? <Notice message={props.error} onDismiss={props.onDismissError} /> : null}
        <div className="cast-workbench" id="cast-studio">
          <section className="cast-assets-panel" id="cast-backgrounds">
            <div className="cast-profile"><img src={creator.imageDataUrl} alt={creator.name} /><div><span>YOUR CAST</span><h2>{creator.name}</h2><p>{creator.archetype}</p></div></div>
            <div className="cast-character-note"><span>CONTINUITY</span><p>{creator.characterBible}</p></div>
            <div className="asset-heading"><div><span>BACKGROUND LIBRARY</span><strong>Choose one image or video</strong></div><button title="Video generation is planned for run two" disabled><Plus size={15} /></button></div>
            <div className="asset-list">
              {workspace.clips.map((clip) => <button key={clip.id} className={props.selectedAssetId === clip.id || selectedReel?.clipId === clip.id ? "is-selected" : ""} onClick={() => props.onSelectAsset(clip.id)}><div>{clip.videoUrl ? <video src={clip.videoUrl} muted playsInline /> : <img src={clip.posterUrl} alt="" />}{clip.videoUrl ? <FileVideo size={13} /> : <ImageIcon size={13} />}</div><span>{clip.label}</span><small>{clip.provider === "still" ? "$0 · subtle push-in" : `${clip.provider} · reusable`}</small></button>)}
            </div>
            <div className="motion-note"><Plus size={14} /><div><strong>Add motion in run two</strong><span>Generate once, then reuse it across many stories.</span></div></div>
          </section>

          <section className="cast-preview-stage">
            <div className="cast-preview-head"><span>LIVE OUTPUT</span><strong>9:16 · 15 sec · sound off</strong></div>
            <ReelPreview reel={props.previewReel} clip={props.activeClip} />
            {workspace.reels.length ? <div className="studio-reel-tabs">{workspace.reels.map((reel, index) => <button key={reel.id} className={selectedReel?.id === reel.id ? "is-active" : ""} onClick={() => props.onSelectReel(reel.id)}><span>0{index + 1}</span><strong>{reel.title}</strong></button>)}</div> : <div className="preview-empty-note">Your selected cast asset is ready. Write the first batch to fill the canvas.</div>}
          </section>

          <section className="story-panel" id="cast-reels">
            <div className="story-panel-head"><div><span>STORY DESK</span><h2>{selectedReel ? selectedReel.title : "Write the first batch"}</h2></div><span className="draft-pill">{workspace.mode === "demo" ? "DEMO" : "AI DRAFT"}</span></div>
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
                  <label className="story-editor"><textarea aria-label="Edit final story copy" value={story} rows={17} onChange={(event) => props.onUpdateStory(selectedReel, event.target.value)} /><small>Changes save automatically and update the reel preview · {wordCount} words</small></label>
                ) : (
                  <div className="story-review"><p>{story}</p><small>{wordCount} words · product facts should be checked before posting</small></div>
                )}
                <div className="story-controls">
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

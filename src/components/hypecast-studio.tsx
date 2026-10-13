"use client";
/* eslint-disable @next/next/no-img-element */

import {
  Check,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Download,
  ExternalLink,
  Film,
  ImageIcon,
  LoaderCircle,
  LogIn,
  Play,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { demoBrief, demoClips, demoCreators, demoReels, demoReferences } from "@/lib/demo-data";
import { exportReel } from "@/lib/reel-export";
import type {
  AppCapabilities,
  CreatorCandidate,
  ProductBrief,
  Reel,
  ReferenceImage,
  VideoClip,
  WorkspaceSnapshot,
} from "@/lib/types";
import { ReelPreview } from "@/components/reel-preview";
import { CloudProjectSync } from "@/components/cloud-project-sync";

const STORAGE_KEY = "hypecast-project-v1";

const steps = [
  ["Brief", "Know the product"],
  ["Persona", "Approve the angle"],
  ["Cast", "Choose one creator"],
  ["References", "Lock the look"],
  ["Clips", "Generate motion"],
  ["Reels", "Edit and export"],
];

const emptyWorkspace: WorkspaceSnapshot = {
  mode: "demo",
  step: 0,
  productUrl: "",
  creators: [],
  references: [],
  clips: [],
  reels: [],
  updatedAt: Date.now(),
};

const motionDirections = [
  ["Deep work", "The creator types naturally at a laptop, pauses to read the screen, then makes a tiny satisfied nod. Subtle handheld camera drift, realistic breathing and blinking, quiet candid energy. No speaking, no lip movement, no text, no camera morphing."],
  ["The notification", "The creator checks a phone, scrolls once, gives a restrained eyebrow raise, and sets it beside the laptop. Natural hand movement, soft window light, subtle handheld camera. No speaking, no lip movement, no text."],
  ["Between meetings", "The creator walks slowly through a simple daylight interior, pauses near a window, then glances toward camera. Calm candid movement, stable facial identity, phone-camera realism. No speaking, no lip movement, no text."],
];

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function statusLabel(status: VideoClip["status"]) {
  if (status === "generating") return "Generating";
  if (status === "queued") return "Queued";
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return "Not started";
}

function StudioAuthBoundary({ children }: { children: React.ReactNode }) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!clerkEnabled) return children;
  return (
    <>
      <SignedOut>
        <div className="auth-screen">
          <div className="auth-card">
            <div className="brand-mark">H</div>
            <span className="eyebrow">HYPECAST STUDIO</span>
            <h1>Your creator account starts with one link.</h1>
            <p>Sign in to keep expensive generations private and resume your reel batch later.</p>
            <SignInButton mode="modal">
              <button className="button button--primary button--wide">
                <LogIn size={17} /> Sign in to build
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>{children}</SignedIn>
    </>
  );
}

export function HypecastStudio() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(emptyWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [capabilities, setCapabilities] = useState<(AppCapabilities & { openrouter?: boolean }) | null>(null);
  const [videoEstimate, setVideoEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [selectedReelId, setSelectedReelId] = useState("");
  const [exportProgress, setExportProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setWorkspace(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setHydrated(true);
    }, 0);
    apiRequest<AppCapabilities & { openrouter?: boolean }>("/api/health")
      .then(setCapabilities)
      .catch(() => null);
    apiRequest<{ models: Array<{ estimatedBatchUsd: number }> }>("/api/video/models")
      .then(({ models }) => setVideoEstimate(models[0]?.estimatedBatchUsd ?? null))
      .catch(() => null);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...workspace, updatedAt: Date.now() }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, workspace]);

  const selectedCreator = useMemo(
    () => workspace.creators.find((creator) => creator.id === workspace.selectedCreatorId),
    [workspace.creators, workspace.selectedCreatorId],
  );
  const selectedReel = useMemo(
    () => workspace.reels.find((reel) => reel.id === selectedReelId) || workspace.reels[0],
    [selectedReelId, workspace.reels],
  );
  const activeClip = useMemo(() => {
    const clip = workspace.clips.find((item) => item.id === selectedReel?.clipId) || workspace.clips[0];
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
  }, [selectedCreator, selectedReel?.clipId, workspace.clips]);

  function updateWorkspace(patch: Partial<WorkspaceSnapshot>) {
    setWorkspace((current) => ({ ...current, ...patch, updatedAt: Date.now() }));
  }

  const handleAssetStored = useCallback((kind: "candidate" | "reference", id: string, url: string) => {
    setWorkspace((current) => {
      if (kind === "candidate") {
        return {
          ...current,
          creators: current.creators.map((creator) =>
            creator.id === id ? { ...creator, imageDataUrl: url } : creator,
          ),
          updatedAt: Date.now(),
        };
      }
      return {
        ...current,
        references: current.references.map((reference) =>
          reference.id === id ? { ...reference, imageDataUrl: url } : reference,
        ),
        clips: current.clips.map((clip) =>
          clip.referenceImageId === id ? { ...clip, posterUrl: url } : clip,
        ),
        updatedAt: Date.now(),
      };
    });
  }, []);

  function resetProject() {
    setWorkspace({ ...emptyWorkspace, updatedAt: Date.now() });
    setSelectedReelId("");
    setError("");
  }

  async function analyzeProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!workspace.productUrl) return;
    setBusy("analyzing");
    try {
      const { brief } = await apiRequest<{ brief: ProductBrief }>("/api/analyze", { url: workspace.productUrl });
      updateWorkspace({ mode: "live", brief, step: 1, creators: [], references: [], clips: [], reels: [] });
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
    });
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
      await pause(500);
      updateWorkspace({ creators: demoCreators, step: 2 });
      setBusy("");
      return;
    }
    try {
      const { creators } = await apiRequest<{ creators: CreatorCandidate[] }>("/api/creators", {
        brief: workspace.brief,
      });
      updateWorkspace({ creators, step: 2 });
      await Promise.allSettled(
        creators.map(async (creator) => {
          setWorkspace((current) => ({
            ...current,
            creators: current.creators.map((item) =>
              item.id === creator.id ? { ...item, imageStatus: "generating" } : item,
            ),
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
              creators: current.creators.map((item) =>
                item.id === creator.id ? { ...item, imageDataUrl, imageStatus: "ready" } : item,
              ),
            }));
          } catch {
            setWorkspace((current) => ({
              ...current,
              creators: current.creators.map((item) =>
                item.id === creator.id ? { ...item, imageStatus: "failed" } : item,
              ),
            }));
          }
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the creator cast.");
    } finally {
      setBusy("");
    }
  }

  function chooseCreator(id: string) {
    updateWorkspace({ selectedCreatorId: id });
  }

  async function createReferences() {
    if (!selectedCreator?.imageDataUrl) {
      setError("Choose a creator with a finished portrait first.");
      return;
    }
    setBusy("references");
    setError("");
    if (workspace.mode === "demo") {
      await pause(550);
      updateWorkspace({ references: demoReferences(selectedCreator), step: 3 });
      setBusy("");
      return;
    }
    const definitions: ReferenceImage[] = [
      { id: "ref-front", label: "Character anchor", direction: "Front-facing medium portrait, relaxed shoulders, direct natural eye contact", status: "generating" },
      { id: "ref-laptop", label: "Work mode", direction: "Three-quarter view seated at a laptop, hands visible, focused but relaxed expression", status: "generating" },
      { id: "ref-phone", label: "Phone moment", direction: "Standing casually with a phone in one hand, looking at the screen with subtle curiosity", status: "generating" },
    ];
    updateWorkspace({ references: definitions, step: 3 });
    await Promise.allSettled(
      definitions.map(async (reference) => {
        try {
          const { imageDataUrl } = await apiRequest<{ imageDataUrl: string }>("/api/image", {
            kind: "reference",
            name: selectedCreator.name,
            characterBible: selectedCreator.characterBible,
            direction: reference.direction,
            sourceDataUrl: selectedCreator.imageDataUrl,
          });
          setWorkspace((current) => ({
            ...current,
            references: current.references.map((item) =>
              item.id === reference.id ? { ...item, imageDataUrl, status: "ready" } : item,
            ),
          }));
        } catch {
          setWorkspace((current) => ({
            ...current,
            references: current.references.map((item) =>
              item.id === reference.id ? { ...item, status: "failed" } : item,
            ),
          }));
        }
      }),
    );
    setBusy("");
  }

  async function pollClip(clipId: string, requestId: string) {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await pause(attempt === 0 ? 2_000 : 10_000);
      const job = await apiRequest<{
        status: VideoClip["status"];
        videoUrl?: string;
        error?: string;
      }>("/api/video/status", { requestId });
      setWorkspace((current) => ({
        ...current,
        clips: current.clips.map((clip) =>
          clip.id === clipId ? { ...clip, status: job.status, videoUrl: job.videoUrl, error: job.error } : clip,
        ),
      }));
      if (job.status === "ready" || job.status === "failed") return;
    }
    setWorkspace((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        clip.id === clipId ? { ...clip, status: "failed", error: "Timed out while waiting for the provider." } : clip,
      ),
    }));
  }

  async function generateClips() {
    if (workspace.references.some((reference) => reference.status !== "ready" || !reference.imageDataUrl)) {
      setError("All three reference images must be ready before video generation.");
      return;
    }
    setBusy("clips");
    setError("");
    const clips: VideoClip[] = motionDirections.map(([label, motionPrompt], index) => ({
      id: `clip-${index + 1}`,
      label,
      motionPrompt,
      referenceImageId: workspace.references[index].id,
      provider: workspace.mode === "demo" ? "demo" : capabilities?.videoProvider === "fal.ai" ? "fal" : "openrouter",
      status: workspace.mode === "demo" ? "ready" : "idle",
      posterUrl: workspace.references[index].imageDataUrl,
    }));
    if (workspace.mode === "demo") {
      await pause(800);
      updateWorkspace({ clips: demoClips(workspace.references), step: 4 });
      setBusy("");
      return;
    }
    if (!capabilities?.openrouter && !capabilities?.fal) {
      setError("Video generation is wired, but this environment still needs an OpenRouter API key.");
      setBusy("");
      return;
    }
    updateWorkspace({ clips, step: 4 });
    const referenceUrls = workspace.references.map((reference) => reference.imageDataUrl as string);
    try {
      const jobs: Array<Promise<void>> = [];
      for (const clip of clips) {
        const reference = workspace.references.find((item) => item.id === clip.referenceImageId);
        if (!reference?.imageDataUrl) continue;
        const result = await apiRequest<{ requestId: string; status: VideoClip["status"] }>("/api/video/submit", {
          prompt: clip.motionPrompt,
          startImageUrl: reference.imageDataUrl,
          referenceImageUrls: referenceUrls,
        });
        setWorkspace((current) => ({
          ...current,
          clips: current.clips.map((item) =>
            item.id === clip.id ? { ...item, requestId: result.requestId, status: result.status } : item,
          ),
        }));
        jobs.push(pollClip(clip.id, result.requestId));
      }
      setBusy("");
      await Promise.allSettled(jobs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The video provider could not start this batch.");
      setBusy("");
    }
  }

  async function buildReels() {
    const readyClips = workspace.clips.filter((clip) => clip.status === "ready");
    if (readyClips.length < 3 || !workspace.brief) {
      setError("Wait until all three clips are genuinely ready.");
      return;
    }
    setBusy("reels");
    setError("");
    try {
      if (workspace.mode === "demo") {
        const reels = demoReels(readyClips);
        updateWorkspace({ reels, step: 5 });
        setSelectedReelId(reels[0].id);
      } else {
        const { hooks } = await apiRequest<{ hooks: Array<{ title: string; hook: string; followUp: string }> }>(
          "/api/hooks",
          workspace.brief,
        );
        const reels: Reel[] = hooks.map((item, index) => ({
          id: `reel-${index + 1}`,
          title: item.title,
          clipId: readyClips[index % readyClips.length].id,
          hook: item.hook,
          cards: [
            { id: `card-${index + 1}-a`, text: item.hook, start: 0, end: 7.5 },
            { id: `card-${index + 1}-b`, text: item.followUp, start: 7.5, end: 15 },
          ],
          position: index % 3 === 0 ? "top" : index % 3 === 1 ? "center" : "bottom",
          style: index % 3 === 0 ? "glass" : index % 3 === 1 ? "clean" : "highlight",
        }));
        updateWorkspace({ reels, step: 5 });
        setSelectedReelId(reels[0].id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not write the reel hooks.");
    } finally {
      setBusy("");
    }
  }

  function updateReel(reelId: string, patch: Partial<Reel>) {
    setWorkspace((current) => ({
      ...current,
      reels: current.reels.map((reel) => (reel.id === reelId ? { ...reel, ...patch } : reel)),
    }));
  }

  function updateCard(reelId: string, cardId: string, patch: Partial<Reel["cards"][number]>) {
    setWorkspace((current) => ({
      ...current,
      reels: current.reels.map((reel) =>
        reel.id === reelId
          ? { ...reel, cards: reel.cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card)) }
          : reel,
      ),
    }));
  }

  function addTextCard(reel: Reel) {
    if (reel.cards.length >= 3) return;
    const start = reel.cards.length === 1 ? 7.5 : 10;
    const cards = reel.cards.length === 1
      ? [{ ...reel.cards[0], end: 7.5 }, { id: `${reel.id}-card-2`, text: "Add the next beat…", start, end: 15 }]
      : [...reel.cards, { id: `${reel.id}-card-3`, text: "Finish the story…", start: 10, end: 15 }];
    if (cards.length === 3) {
      cards[0] = { ...cards[0], end: 5 };
      cards[1] = { ...cards[1], start: 5, end: 10 };
    }
    updateReel(reel.id, { cards });
  }

  async function exportOne(reel: Reel) {
    const clip = workspace.clips.find((item) => item.id === reel.clipId);
    if (!clip) return;
    setError("");
    setExportProgress((current) => ({ ...current, [reel.id]: 1 }));
    try {
      await exportReel(reel, clip, (progress) =>
        setExportProgress((current) => ({ ...current, [reel.id]: progress })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This browser could not export the reel.");
      setExportProgress((current) => ({ ...current, [reel.id]: 0 }));
    }
  }

  const previewReel = selectedReel ||
    (workspace.brief
      ? ({
          id: "preview",
          title: "Preview",
          clipId: activeClip?.id || "",
          hook: workspace.brief.hookAngles[0] || workspace.brief.oneLiner,
          cards: [{ id: "preview-card", text: workspace.brief.hookAngles[0] || workspace.brief.oneLiner, start: 0, end: 15 }],
          position: "center",
          style: "glass",
        } satisfies Reel)
      : undefined);

  return (
    <StudioAuthBoundary>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CONVEX_URL ? (
        <CloudProjectSync workspace={workspace} onAssetStored={handleAssetStored} />
      ) : null}
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={resetProject} aria-label="Start a new Hypecast project">
            <span className="brand-mark">H</span>
            <span>HYPECAST</span>
          </button>
          <div className="sidebar-kicker">BUILD WEEK / 01</div>
          <nav className="step-list" aria-label="Project steps">
            {steps.map(([name, hint], index) => {
              const isDone = workspace.step > index;
              const isActive = workspace.step === index;
              return (
                <button
                  key={name}
                  className={`step-item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                  onClick={() => index <= workspace.step && updateWorkspace({ step: index })}
                  disabled={index > workspace.step}
                >
                  <span className="step-index">{isDone ? <Check size={13} /> : index + 1}</span>
                  <span><strong>{name}</strong><small>{hint}</small></span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <span className={`signal ${workspace.mode === "live" ? "signal--live" : ""}`} />
            <div><strong>{workspace.mode === "live" ? "Live project" : "Demo project"}</strong><small>Saved in this browser</small></div>
          </div>
        </aside>

        <main className="studio-main">
          <header className="topbar">
            <div className="crumbs"><span>Hypecast</span><ChevronRight size={14} /><strong>{workspace.brief?.productName || "New project"}</strong></div>
            <div className="topbar-actions">
              <span className="status-pill"><span className="signal signal--live" /> Autosaved</span>
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <UserButton /> : <span className="status-pill">Local demo session</span>}
            </div>
          </header>

          <div className="workspace-grid">
            <section className="workspace-panel">
              {error ? (
                <div className="notice notice--error"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError("")}><X size={15} /></button></div>
              ) : null}

              {workspace.step === 0 ? (
                <div className="intro-view">
                  <span className="eyebrow">ONE LINK → ONE CREATOR → FIVE REELS</span>
                  <h1>Make your product<br /><em>impossible to scroll past.</em></h1>
                  <p className="intro-copy">Hypecast reads your product, casts a consistent AI creator, and turns three silent background clips into five editable vertical reels.</p>
                  <form className="url-form" onSubmit={analyzeProduct}>
                    <label htmlFor="product-url">Your public product URL</label>
                    <div className="url-input-wrap">
                      <input
                        id="product-url"
                        type="url"
                        value={workspace.productUrl}
                        placeholder="https://yourproduct.com"
                        onChange={(event) => updateWorkspace({ productUrl: event.target.value })}
                        required
                      />
                      <button className="button button--primary" disabled={busy === "analyzing"}>
                        {busy === "analyzing" ? <LoaderCircle className="spin" size={17} /> : <WandSparkles size={17} />}
                        Build my brief
                      </button>
                    </div>
                  </form>
                  <div className="demo-row">
                    <button className="text-button" onClick={startDemo}><Play size={15} /> Try the zero-credit demo</button>
                    <span>No generation calls. Export uses motion mocks.</span>
                  </div>
                  <div className="promise-grid">
                    <div><strong>05</strong><span>editable reels</span></div>
                    <div><strong>03</strong><span>background clips</span></div>
                    <div><strong>15s</strong><span>silent & vertical</span></div>
                    <div><strong>{videoEstimate === null ? "≈$0.90" : `≈$${videoEstimate.toFixed(2)}`}</strong><span>validation video batch</span></div>
                  </div>
                </div>
              ) : null}

              {workspace.step === 1 && workspace.brief ? (
                <div className="stage-view">
                  <StageHeader number="01" eyebrow="PRODUCT PERSONA" title="Make sure the story is true." description="This approved brief grounds every hook and visual decision. Edit anything that feels invented or generic." />
                  <div className="source-chip"><ExternalLink size={14} /><span>{workspace.brief.source.title || workspace.brief.source.url}</span><a href={workspace.brief.source.url} target="_blank" rel="noreferrer">View source</a></div>
                  <div className="form-grid">
                    <label><span>Product name</span><input value={workspace.brief.productName} onChange={(e) => updateBrief("productName", e.target.value)} /></label>
                    <label><span>Tone</span><input value={workspace.brief.tone} onChange={(e) => updateBrief("tone", e.target.value)} /></label>
                    <label className="span-2"><span>What it is</span><textarea rows={2} value={workspace.brief.oneLiner} onChange={(e) => updateBrief("oneLiner", e.target.value)} /></label>
                    <label className="span-2"><span>Who stops scrolling</span><textarea rows={2} value={workspace.brief.audience} onChange={(e) => updateBrief("audience", e.target.value)} /></label>
                    <label className="span-2"><span>Pain worth naming</span><textarea rows={2} value={workspace.brief.problem} onChange={(e) => updateBrief("problem", e.target.value)} /></label>
                  </div>
                  <div className="hook-board">
                    <div className="section-label"><span>HOOK TERRITORIES</span><small>Grounded in the landing page</small></div>
                    {workspace.brief.hookAngles.map((hook, index) => <div className="hook-row" key={hook}><span>{String(index + 1).padStart(2, "0")}</span><p>{hook}</p></div>)}
                  </div>
                  <div className="stage-actions"><button className="button button--primary" onClick={createCast} disabled={busy === "cast"}>{busy === "cast" ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Approve & cast five creators</button><small>Live mode uses 1 text + 5 image generations.</small></div>
                </div>
              ) : null}

              {workspace.step === 2 ? (
                <div className="stage-view">
                  <StageHeader number="02" eyebrow="CREATOR CAST" title="Pick the face of the account." description="One creator becomes the continuity anchor for every reference, clip, and future batch." />
                  <div className="creator-grid">
                    {workspace.creators.map((creator) => (
                      <button key={creator.id} className={`creator-card ${workspace.selectedCreatorId === creator.id ? "is-selected" : ""}`} onClick={() => creator.imageStatus === "ready" && chooseCreator(creator.id)} disabled={creator.imageStatus !== "ready"}>
                        <div className="creator-image">
                          {creator.imageDataUrl ? <img src={creator.imageDataUrl} alt={creator.name} /> : <div className="loading-tile"><LoaderCircle className={creator.imageStatus === "generating" ? "spin" : ""} /><span>{creator.imageStatus === "failed" ? "Image failed" : "Casting…"}</span></div>}
                          {workspace.selectedCreatorId === creator.id ? <span className="selected-stamp"><Check size={15} /> LOCKED</span> : null}
                        </div>
                        <div className="creator-copy"><span>{creator.archetype}</span><h3>{creator.name}</h3><p>{creator.description}</p><small>{creator.wardrobe}</small></div>
                      </button>
                    ))}
                  </div>
                  <div className="stage-actions"><button className="button button--primary" onClick={createReferences} disabled={!selectedCreator || busy === "references"}>{busy === "references" ? <LoaderCircle className="spin" size={17} /> : <ImageIcon size={17} />} Lock creator & build references</button><small>Regenerate individual references later without recasting.</small></div>
                </div>
              ) : null}

              {workspace.step === 3 ? (
                <div className="stage-view">
                  <StageHeader number="03" eyebrow="IDENTITY REFERENCES" title="Three angles. One recognizable human." description="These images keep the face, styling, and mood stable when motion generation begins." />
                  <div className="reference-grid">
                    {workspace.references.map((reference, index) => (
                      <article className="reference-card" key={reference.id}>
                        <div className="reference-image">{reference.imageDataUrl ? <img src={reference.imageDataUrl} alt={reference.label} /> : <div className="loading-tile"><LoaderCircle className={reference.status === "generating" ? "spin" : ""} /><span>{reference.status === "failed" ? "Generation failed" : "Generating reference"}</span></div>}<span className="reference-number">0{index + 1}</span></div>
                        <div><strong>{reference.label}</strong><p>{reference.direction}</p><span className={`mini-status mini-status--${reference.status}`}>{reference.status}</span></div>
                      </article>
                    ))}
                  </div>
                  <div className="quality-callout"><Check size={17} /><div><strong>Continuity check</strong><p>Approve only if face shape, hair, age, wardrobe palette, and skin tone read as the same person.</p></div></div>
                  <div className="stage-actions"><button className="button button--primary" onClick={generateClips} disabled={workspace.references.some((reference) => reference.status !== "ready") || busy === "clips"}>{busy === "clips" ? <LoaderCircle className="spin" size={17} /> : <Clapperboard size={17} />} Generate three 15s clips</button><small>{workspace.mode === "demo" ? "Creates labelled motion mocks." : `Economy estimate: ${videoEstimate === null ? "~$0.90" : `~$${videoEstimate.toFixed(2)}`} before retries.`}</small></div>
                </div>
              ) : null}

              {workspace.step === 4 ? (
                <div className="stage-view">
                  <StageHeader number="04" eyebrow="BACKGROUND CLIPS" title="Motion that leaves room for the words." description="Silent, simple actions keep the creator believable without competing with the hook." />
                  <div className="clip-list">
                    {workspace.clips.map((clip, index) => (
                      <article className="clip-row" key={clip.id}>
                        <div className="clip-thumb">{clip.videoUrl ? <video src={clip.videoUrl} muted loop autoPlay playsInline /> : clip.posterUrl ? <img src={clip.posterUrl} alt="" /> : null}<span>0{index + 1}</span></div>
                        <div className="clip-copy"><span>{clip.label}</span><h3>{clip.motionPrompt.split(".")[0]}</h3><p>{clip.provider === "demo" ? "Motion mock — no AI video claim" : `${clip.provider} · 9:16 · 15 seconds · audio off`}</p>{clip.error ? <small className="error-copy">{clip.error}</small> : null}</div>
                        <div className={`job-status job-status--${clip.status}`}>{clip.status === "queued" || clip.status === "generating" ? <LoaderCircle className="spin" size={15} /> : clip.status === "ready" ? <Check size={15} /> : <CircleAlert size={15} />} {statusLabel(clip.status)}</div>
                      </article>
                    ))}
                  </div>
                  <div className="stage-actions"><button className="button button--primary" onClick={buildReels} disabled={workspace.clips.filter((clip) => clip.status === "ready").length < 3 || busy === "reels"}>{busy === "reels" ? <LoaderCircle className="spin" size={17} /> : <Film size={17} />} Write five reels</button><small>Only available after all three assets are playable.</small></div>
                </div>
              ) : null}

              {workspace.step === 5 && selectedReel ? (
                <div className="stage-view editor-view">
                  <StageHeader number="05" eyebrow="REEL EDITOR" title="Five hooks. Ready to earn attention." description="Every change below is reflected in the preview and burned into the exported MP4." />
                  <div className="reel-tabs">{workspace.reels.map((reel, index) => <button key={reel.id} className={selectedReel.id === reel.id ? "is-active" : ""} onClick={() => setSelectedReelId(reel.id)}><span>0{index + 1}</span>{reel.title}</button>)}</div>
                  <div className="editor-form">
                    <div className="section-label"><span>TEXT STORY</span><small>{selectedReel.cards.length}/3 timed cards</small></div>
                    {selectedReel.cards.map((card, index) => (
                      <div className="text-card-editor" key={card.id}>
                        <span className="card-index">0{index + 1}</span>
                        <textarea value={card.text} onChange={(event) => updateCard(selectedReel.id, card.id, { text: event.target.value })} rows={2} />
                        <label>FROM<input type="number" min="0" max="15" step="0.5" value={card.start} onChange={(event) => updateCard(selectedReel.id, card.id, { start: Number(event.target.value) })} /></label>
                        <label>TO<input type="number" min="0" max="15" step="0.5" value={card.end} onChange={(event) => updateCard(selectedReel.id, card.id, { end: Number(event.target.value) })} /></label>
                      </div>
                    ))}
                    <button className="text-button" onClick={() => addTextCard(selectedReel)} disabled={selectedReel.cards.length >= 3}><Plus size={15} /> Add timed text change</button>
                    <div className="editor-controls">
                      <label><span>Background clip</span><select value={selectedReel.clipId} onChange={(event) => updateReel(selectedReel.id, { clipId: event.target.value })}>{workspace.clips.map((clip) => <option key={clip.id} value={clip.id}>{clip.label}</option>)}</select></label>
                      <label><span>Position</span><select value={selectedReel.position} onChange={(event) => updateReel(selectedReel.id, { position: event.target.value as Reel["position"] })}><option value="top">Top safe zone</option><option value="center">Center</option><option value="bottom">Bottom safe zone</option></select></label>
                      <label><span>Text treatment</span><select value={selectedReel.style} onChange={(event) => updateReel(selectedReel.id, { style: event.target.value as Reel["style"] })}><option value="glass">Smoked glass</option><option value="clean">Clean outline</option><option value="highlight">Hype orange</option></select></label>
                    </div>
                  </div>
                  <div className="stage-actions"><button className="button button--primary" onClick={() => exportOne(selectedReel)} disabled={Boolean(exportProgress[selectedReel.id] && exportProgress[selectedReel.id] < 100)}>{exportProgress[selectedReel.id] && exportProgress[selectedReel.id] < 100 ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />} {exportProgress[selectedReel.id] && exportProgress[selectedReel.id] < 100 ? `Encoding ${exportProgress[selectedReel.id]}%` : "Export MP4"}</button><small>{workspace.mode === "demo" ? "Demo exports are labelled motion mocks built from stills." : "Silent H.264 MP4, text burned in."}</small></div>
                </div>
              ) : null}
            </section>

            <aside className="preview-panel">
              <div className="preview-head"><div><span>LIVE PREVIEW</span><strong>Sound off by design</strong></div><span className="format-chip">9:16 · 15s</span></div>
              <ReelPreview reel={previewReel} clip={activeClip} />
              <div className="preview-meta">
                <div><span>CREATOR</span><strong>{selectedCreator?.name || "Not cast yet"}</strong></div>
                <div><span>BATCH</span><strong>{workspace.reels.length ? `${workspace.reels.length}/5 ready` : "Not composed"}</strong></div>
              </div>
              <div className="system-status">
                <span className="section-label">SYSTEM CHECK</span>
                <div><span>OpenAI</span><strong className={capabilities?.openai ? "ok" : "muted"}>{capabilities?.openai ? "Ready" : "Missing"}</strong></div>
                <div><span>Video</span><strong className={capabilities?.openrouter || capabilities?.fal ? "ok" : "muted"}>{capabilities?.openrouter ? "OpenRouter" : capabilities?.fal ? "fal.ai" : "Demo only"}</strong></div>
                <div><span>Database</span><strong className={capabilities?.convex ? "ok" : "muted"}>{capabilities?.convex ? "Convex ready" : "Local only"}</strong></div>
                <div><span>Login</span><strong className={capabilities?.clerk ? "ok" : "muted"}>{capabilities?.clerk ? "Protected" : "Not connected"}</strong></div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </StudioAuthBoundary>
  );
}

function StageHeader({ number, eyebrow, title, description }: { number: string; eyebrow: string; title: string; description: string }) {
  return (
    <header className="stage-header">
      <div className="stage-number">{number}</div>
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
    </header>
  );
}

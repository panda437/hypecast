"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PendingExport, SavedProject, SaveStatus, WorkspaceSnapshot } from "@/lib/types";

type CloudProjectSyncProps = {
  workspace: WorkspaceSnapshot;
  workspaceOpen: boolean;
  hydrated: boolean;
  pendingExports: PendingExport[];
  onAssetStored: (kind: "candidate" | "reference", id: string, url: string) => void;
  onClipStored: (id: string, url: string) => void;
  onExportStored: (id: string, url: string) => void;
  onProjectsChanged: (projects: SavedProject[]) => void;
  onProjectsReady: (ready: boolean) => void;
  onSaveStatus: (status: SaveStatus) => void;
};

function withoutInlineMedia(workspace: WorkspaceSnapshot) {
  return {
    ...workspace,
    creators: workspace.creators.map((creator) => ({
      ...creator,
      imageDataUrl: creator.imageDataUrl?.startsWith("data:") ? undefined : creator.imageDataUrl,
    })),
    references: workspace.references.map((reference) => ({
      ...reference,
      imageDataUrl: reference.imageDataUrl?.startsWith("data:") ? undefined : reference.imageDataUrl,
    })),
    clips: workspace.clips.map((clip) => ({
      ...clip,
      posterUrl: clip.posterUrl?.startsWith("data:") ? undefined : clip.posterUrl,
      videoUrl: clip.videoUrl?.startsWith("data:") ? undefined : clip.videoUrl,
    })),
  };
}

function isBlank(workspace: WorkspaceSnapshot) {
  return workspace.step === 0 && !workspace.productUrl && !workspace.brief;
}

export function CloudProjectSync({
  workspace,
  workspaceOpen,
  hydrated,
  pendingExports,
  onAssetStored,
  onClipStored,
  onExportStored,
  onProjectsChanged,
  onProjectsReady,
  onSaveStatus,
}: CloudProjectSyncProps) {
  const { isSignedIn } = useAuth();
  const projects = useQuery(api.projects.listMine, isSignedIn ? {} : "skip");
  const saveSnapshot = useMutation(api.projects.saveSnapshot);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveGenerated = useMutation(api.assets.saveGenerated);
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);
  const [projectClientId, setProjectClientId] = useState("");
  const [ready, setReady] = useState(false);
  const uploading = useRef(new Set<string>());
  const saveSequence = useRef(0);

  useEffect(() => {
    if (isSignedIn) return;
    const timer = window.setTimeout(() => {
      setProjectId(null);
      setProjectClientId("");
      setReady(false);
      onProjectsChanged([]);
      onProjectsReady(false);
      onSaveStatus({ state: "idle", target: "cloud" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, onProjectsChanged, onProjectsReady, onSaveStatus]);

  useEffect(() => {
    if (!isSignedIn || !hydrated || projects === undefined) return;

    const savedProjects: SavedProject[] = projects
      .filter((project) => project.snapshot && typeof project.snapshot === "object")
      .map((project) => ({
        clientProjectId: project.clientProjectId,
        productName: project.productName || "Untitled product",
        updatedAt: project.updatedAt,
        snapshot: {
          ...(project.snapshot as WorkspaceSnapshot),
          clientProjectId: project.clientProjectId,
          updatedAt: project.updatedAt,
        },
        source: "cloud" as const,
      }));
    onProjectsChanged(savedProjects);
    onProjectsReady(true);
    if (!workspaceOpen) return;
    const matching = projects.find((project) => project.clientProjectId === workspace.clientProjectId);
    const timer = window.setTimeout(() => {
      setProjectId(matching?._id || null);
      setProjectClientId(workspace.clientProjectId);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, isSignedIn, onProjectsChanged, onProjectsReady, projects, workspace.clientProjectId, workspaceOpen]);

  useEffect(() => {
    saveSequence.current += 1;
  }, [workspace.clientProjectId]);

  useEffect(() => {
    if (!ready || !isSignedIn || isBlank(workspace) || !workspace.clientProjectId || projectClientId !== workspace.clientProjectId) return;
    const sequence = ++saveSequence.current;
    onSaveStatus({ state: "saving", target: "cloud" });
    const timer = window.setTimeout(async () => {
      try {
        const id = await saveSnapshot({
          clientProjectId: workspace.clientProjectId,
          productName: workspace.brief?.productName,
          productUrl: workspace.productUrl || undefined,
          stage: workspace.step,
          snapshot: withoutInlineMedia(workspace),
        });
        if (sequence === saveSequence.current) {
          setProjectId(id);
          onSaveStatus({ state: "saved", target: "cloud", savedAt: Date.now() });
        }
      } catch (cause) {
        if (sequence === saveSequence.current) {
          onSaveStatus({ state: "error", target: "cloud", message: cause instanceof Error ? cause.message : "Cloud save failed" });
        }
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, onSaveStatus, projectClientId, ready, saveSnapshot, workspace]);

  useEffect(() => {
    if (!projectId || !isSignedIn || projectClientId !== workspace.clientProjectId) return;
    const candidates = workspace.creators
      .filter((item) => item.imageDataUrl?.startsWith("data:"))
      .map((item) => ({ kind: "candidate" as const, id: item.id, dataUrl: item.imageDataUrl as string }));
    const references = workspace.references
      .filter((item) => item.imageDataUrl?.startsWith("data:"))
      .map((item) => ({ kind: "reference" as const, id: item.id, dataUrl: item.imageDataUrl as string }));

    for (const asset of [...candidates, ...references]) {
      const key = `${workspace.clientProjectId}:${asset.kind}:${asset.id}`;
      if (uploading.current.has(key)) continue;
      uploading.current.add(key);
      void (async () => {
        try {
          const uploadUrl = await generateUploadUrl();
          const blob = await fetch(asset.dataUrl).then((response) => response.blob());
          const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
          if (!result.ok) throw new Error("Convex asset upload failed");
          const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
          const url = await saveGenerated({
            projectId,
            clientAssetId: asset.id,
            kind: asset.kind,
            provider: workspace.mode === "demo" ? "demo" : "openai",
            storageId,
            metadata: {},
          });
          onAssetStored(asset.kind, asset.id, url);
        } catch (cause) {
          console.error("Cloud asset upload failed", cause);
        } finally {
          uploading.current.delete(key);
        }
      })();
    }
  }, [generateUploadUrl, isSignedIn, onAssetStored, projectClientId, projectId, saveGenerated, workspace]);

  useEffect(() => {
    if (!projectId || !isSignedIn || projectClientId !== workspace.clientProjectId) return;
    const clips = workspace.clips.filter(
      (clip) => clip.status === "ready" && clip.videoUrl && clip.storageStatus !== "stored",
    );

    for (const clip of clips) {
      const key = `${workspace.clientProjectId}:clip:${clip.id}`;
      if (uploading.current.has(key)) continue;
      uploading.current.add(key);
      void (async () => {
        try {
          const blob = await fetch(clip.videoUrl as string).then((response) => {
            if (!response.ok) throw new Error("Generated video could not be read for cloud storage");
            return response.blob();
          });
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type || "video/mp4" },
            body: blob,
          });
          if (!result.ok) throw new Error("Convex clip upload failed");
          const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
          const url = await saveGenerated({
            projectId,
            clientAssetId: clip.id,
            kind: "clip",
            provider: clip.provider,
            storageId,
            metadata: {
              requestId: clip.requestId,
              referenceImageId: clip.referenceImageId,
              duration: clip.duration || 15,
              motionPrompt: clip.motionPrompt,
              generationPrompt: clip.generationPrompt,
            },
          });
          onClipStored(clip.id, url);
        } catch (cause) {
          console.error("Cloud clip upload failed", cause);
        } finally {
          uploading.current.delete(key);
        }
      })();
    }
  }, [generateUploadUrl, isSignedIn, onClipStored, projectClientId, projectId, saveGenerated, workspace]);

  useEffect(() => {
    if (!projectId || !isSignedIn || projectClientId !== workspace.clientProjectId) return;
    for (const item of pendingExports.filter((pending) => pending.clientProjectId === workspace.clientProjectId)) {
      const key = `${workspace.clientProjectId}:export:${item.id}`;
      if (uploading.current.has(key)) continue;
      uploading.current.add(key);
      void (async () => {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "video/mp4" },
            body: item.blob,
          });
          if (!result.ok) throw new Error("Convex export upload failed");
          const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
          const url = await saveGenerated({
            projectId,
            clientAssetId: item.id,
            kind: "export",
            provider: "browser",
            storageId,
            metadata: {
              reelId: item.reelId,
              title: item.title,
              story: item.story,
              createdAt: item.createdAt,
            },
          });
          onExportStored(item.id, url);
        } catch (cause) {
          console.error("Cloud export upload failed", cause);
        } finally {
          uploading.current.delete(key);
        }
      })();
    }
  }, [generateUploadUrl, isSignedIn, onExportStored, pendingExports, projectClientId, projectId, saveGenerated, workspace.clientProjectId]);

  return null;
}

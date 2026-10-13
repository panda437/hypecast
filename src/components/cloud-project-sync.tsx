"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { WorkspaceSnapshot } from "@/lib/types";

type CloudProjectSyncProps = {
  workspace: WorkspaceSnapshot;
  onAssetStored: (kind: "candidate" | "reference", id: string, url: string) => void;
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
    })),
  };
}

export function CloudProjectSync({ workspace, onAssetStored }: CloudProjectSyncProps) {
  const { isSignedIn } = useAuth();
  const saveSnapshot = useMutation(api.projects.saveSnapshot);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const saveGenerated = useMutation(api.assets.saveGenerated);
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);
  const uploading = useRef(new Set<string>());

  useEffect(() => {
    if (!isSignedIn) return;
    const timer = window.setTimeout(async () => {
      const id = await saveSnapshot({
        clientProjectId: "hypecast-primary",
        productName: workspace.brief?.productName,
        productUrl: workspace.productUrl || undefined,
        stage: workspace.step,
        snapshot: withoutInlineMedia(workspace),
      });
      setProjectId(id);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, saveSnapshot, workspace]);

  useEffect(() => {
    if (!projectId || !isSignedIn) return;
    const candidates = workspace.creators
      .filter((item) => item.imageDataUrl?.startsWith("data:"))
      .map((item) => ({ kind: "candidate" as const, id: item.id, dataUrl: item.imageDataUrl as string }));
    const references = workspace.references
      .filter((item) => item.imageDataUrl?.startsWith("data:"))
      .map((item) => ({ kind: "reference" as const, id: item.id, dataUrl: item.imageDataUrl as string }));

    for (const asset of [...candidates, ...references]) {
      const key = `${asset.kind}:${asset.id}`;
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
  }, [generateUploadUrl, isSignedIn, onAssetStored, projectId, saveGenerated, workspace.creators, workspace.mode, workspace.references]);

  return null;
}

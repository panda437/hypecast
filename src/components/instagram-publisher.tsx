"use client";

import { Camera, Check, CircleAlert, LoaderCircle, Send, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { InstagramPublishingStatus, Reel, WorkspaceSnapshot } from "@/lib/types";

type InstagramPublisherProps = {
  workspace: WorkspaceSnapshot;
  reel: Reel;
  onExport: (reel: Reel) => void;
};

type PublicationResponse = {
  publicationId: string;
  status: "queued" | "processing" | "published" | "failed";
  instagramMediaId?: string;
  error?: string;
};

export function InstagramPublisher({ workspace, reel, onExport }: InstagramPublisherProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InstagramPublishingStatus | null>(null);
  const [caption, setCaption] = useState(reel.cards[0]?.text || "");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [busy, setBusy] = useState<"" | "status" | "preference" | "disconnect" | "publishing">("status");
  const [notice, setNotice] = useState("");
  const [published, setPublished] = useState(false);
  const pollTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setBusy((current) => current || "status");
    try {
      setStatus(await apiRequest<InstagramPublishingStatus>("/api/instagram/status"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instagram status could not be loaded.");
    } finally {
      setBusy((current) => current === "status" ? "" : current);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, [refresh]);

  const latestExport = useMemo(
    () => workspace.exports.find((item) => item.reelId === reel.id && item.status === "saved" && item.url),
    [reel.id, workspace.exports],
  );
  const pendingExport = workspace.exports.some((item) => item.reelId === reel.id && item.status === "downloaded");
  const connection = status?.connection;
  const available = Boolean(status?.globallyEnabled && status.configured);

  async function updatePreference(enabled: boolean) {
    if (!connection?.connected) return;
    setBusy("preference");
    setNotice("");
    try {
      await apiRequest<{ ok: true }>("/api/instagram/preferences", { enabled });
      setStatus((current) => current ? { ...current, connection: { ...current.connection, publishingEnabled: enabled } } : current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instagram publishing preference could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this Instagram account from CueFace?")) return;
    setBusy("disconnect");
    setNotice("");
    try {
      const response = await fetch("/api/instagram/preferences", { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Instagram could not be disconnected.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instagram could not be disconnected.");
    } finally {
      setBusy("");
    }
  }

  async function pollPublication(publicationId: string) {
    try {
      const result = await apiRequest<PublicationResponse>(`/api/instagram/publish/status?publicationId=${encodeURIComponent(publicationId)}`);
      if (result.status === "published") {
        setPublished(true);
        setBusy("");
        setNotice("Published to Instagram without leaving CueFace.");
        return;
      }
      if (result.status === "failed") {
        setBusy("");
        setNotice(result.error || "Instagram could not publish this reel.");
        return;
      }
      pollTimer.current = window.setTimeout(() => void pollPublication(publicationId), 4_000);
    } catch (error) {
      setBusy("");
      setNotice(error instanceof Error ? error.message : "Instagram publishing could not be confirmed.");
    }
  }

  async function publish() {
    if (!latestExport) return;
    setBusy("publishing");
    setNotice("");
    setPublished(false);
    try {
      const result = await apiRequest<PublicationResponse>("/api/instagram/publish", {
        clientProjectId: workspace.clientProjectId,
        exportId: latestExport.id,
        caption,
        shareToFeed,
      });
      void pollPublication(result.publicationId);
    } catch (error) {
      setBusy("");
      setNotice(error instanceof Error ? error.message : "Instagram could not start publishing this reel.");
    }
  }

  return (
    <section className="instagram-publisher" aria-label="Instagram publishing">
      <div className="instagram-publisher-head">
        <div><Camera size={14} /><span>PUBLISH TO INSTAGRAM</span></div>
        {connection?.connected ? (
          <label className="publishing-switch">
            <input
              type="checkbox"
              checked={connection.publishingEnabled}
              onChange={(event) => void updatePreference(event.target.checked)}
              disabled={!available || busy === "preference"}
            />
            <span>{connection.publishingEnabled ? "ON" : "OFF"}</span>
          </label>
        ) : null}
      </div>

      {busy === "status" && !status ? <p className="instagram-muted"><LoaderCircle className="spin" size={13} /> Checking publishing access…</p> : null}
      {status && !status.globallyEnabled ? <p className="instagram-muted">Publishing beta is paused globally. Exports and downloads still work normally.</p> : null}
      {status?.globallyEnabled && !status.configured ? <p className="instagram-muted">Publishing is waiting for the Meta app credentials.</p> : null}

      {available && !connection?.connected ? (
        <div className="instagram-connect">
          <p>Connect a professional Creator or Business account. CueFace never receives your Instagram password.</p>
          <button className="button button--primary button--wide" onClick={() => router.push("/api/instagram/connect")}><Camera size={14} /> Connect Instagram</button>
        </div>
      ) : null}

      {available && connection?.connected ? (
        <>
          <div className="instagram-account"><div><strong>@{connection.username}</strong><span>{connection.accountType || "Professional account"}</span></div><button onClick={() => void disconnect()} disabled={busy === "disconnect"}><Unplug size={12} /> Disconnect</button></div>
          <label className="instagram-caption"><span>CAPTION · EDIT BEFORE POSTING</span><textarea rows={5} maxLength={2_200} value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
          <label className="instagram-feed-option"><input type="checkbox" checked={shareToFeed} onChange={(event) => setShareToFeed(event.target.checked)} /><span>Also share this Reel to the main feed</span></label>
          {!latestExport ? (
            <button className="button button--wide" onClick={() => onExport(reel)} disabled={pendingExport || busy === "publishing"}>{pendingExport ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}{pendingExport ? "Saving the MP4 to cloud…" : "Prepare this reel for Instagram"}</button>
          ) : (
            <button className="button button--primary button--wide" onClick={() => void publish()} disabled={!connection.publishingEnabled || busy === "publishing"}>{busy === "publishing" ? <LoaderCircle className="spin" size={14} /> : published ? <Check size={14} /> : <Send size={14} />}{busy === "publishing" ? "Instagram is processing…" : published ? "Published" : "Publish this reel"}</button>
          )}
        </>
      ) : null}

      {notice ? <p className={`instagram-notice ${published ? "is-success" : ""}`}>{published ? <Check size={12} /> : <CircleAlert size={12} />}{notice}</p> : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Reel, VideoClip } from "@/lib/types";

type ReelPreviewProps = {
  reel?: Reel;
  clip?: VideoClip;
  compact?: boolean;
};

export function ReelPreview({ reel, clip, compact = false }: ReelPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (clip?.videoUrl) return;
    const started = performance.now();
    const timer = window.setInterval(() => setTime(((performance.now() - started) / 1000) % 15), 120);
    return () => window.clearInterval(timer);
  }, [clip?.videoUrl]);

  const activeCard = useMemo(() => {
    if (!reel) return undefined;
    return reel.cards.find((card) => time >= card.start && time < card.end) || reel.cards[0];
  }, [reel, time]);

  return (
    <div className={`reel-frame ${compact ? "reel-frame--compact" : ""}`} aria-label="Vertical reel preview">
      <div className="reel-media">
        {clip?.videoUrl ? (
          <video
            ref={videoRef}
            src={clip.videoUrl}
            muted
            loop
            autoPlay
            playsInline
            crossOrigin="anonymous"
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          />
        ) : clip?.posterUrl ? (
          // Generated image data is dynamic and intentionally bypasses Next image optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.posterUrl} alt="Creator motion mock" className="reel-poster" />
        ) : (
          <div className="reel-empty">
            <span>9:16</span>
            <p>Your selected creator will appear here.</p>
          </div>
        )}
        <div className="reel-shade" />
      </div>
      <div className="safe-zone" aria-hidden="true" />
      {activeCard ? (
        <div className={`reel-copy reel-copy--${reel?.position || "center"} reel-copy--${reel?.style || "glass"}`}>
          {activeCard.text}
        </div>
      ) : null}
      <div className="reel-brand">HYPECAST / SILENT CUT</div>
      <div className="reel-time">{Math.floor(time).toString().padStart(2, "0")}:15</div>
    </div>
  );
}

import type { Reel, VideoClip } from "@/lib/types";

const WIDTH = 720;
const HEIGHT = 1280;
const DURATION = 17;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}

function drawOverlay(ctx: CanvasRenderingContext2D, reel: Reel, time: number) {
  const card = reel.cards.find((item) => time >= item.start && time < item.end) || reel.cards[0];
  if (!card) return;
  const fontSize = card.text.length > 92 ? 50 : card.text.length > 58 ? 58 : 68;
  ctx.font = `800 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, card.text, WIDTH - 130);
  const lineHeight = fontSize * 1.1;
  const blockHeight = lines.length * lineHeight + 58;
  const centerY = reel.position === "top" ? 310 : reel.position === "bottom" ? 900 : 625;
  const top = centerY - blockHeight / 2;

  if (reel.style === "glass") {
    ctx.fillStyle = "rgba(8, 8, 10, .64)";
    roundedRect(ctx, 48, top, WIDTH - 96, blockHeight, 28);
    ctx.fill();
  }
  if (reel.style === "highlight") {
    ctx.fillStyle = "#ff6b45";
    roundedRect(ctx, 42, top, WIDTH - 84, blockHeight, 18);
    ctx.fill();
  }
  ctx.lineWidth = reel.style === "clean" ? 8 : 0;
  ctx.strokeStyle = "rgba(0,0,0,.7)";
  ctx.fillStyle = "#fffdf7";
  lines.forEach((line, index) => {
    const y = top + 29 + lineHeight / 2 + index * lineHeight;
    if (reel.style === "clean") ctx.strokeText(line, WIDTH / 2, y);
    ctx.fillText(line, WIDTH / 2, y);
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, sourceWidth: number, sourceHeight: number, scale = 1) {
  const targetRatio = WIDTH / HEIGHT;
  const sourceRatio = sourceWidth / sourceHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  const zoomedW = sw / scale;
  const zoomedH = sh / scale;
  sx += (sw - zoomedW) / 2;
  sy += (sh - zoomedH) / 2;
  ctx.drawImage(image, sx, sy, zoomedW, zoomedH, 0, 0, WIDTH, HEIGHT);
}

async function imageFromUrl(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  return image;
}

function download(buffer: ArrayBuffer, reel: Reel) {
  const blob = new Blob([buffer], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hypecast-${reel.id}.mp4`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function exportReel(reel: Reel, clip: VideoClip, onProgress: (progress: number) => void) {
  const { ALL_FORMATS, BlobSource, BufferTarget, CanvasSource, Conversion, Input, Mp4OutputFormat, Output, Quality } =
    await import("mediabunny");
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export is unavailable in this browser.");
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });

  if (clip.videoUrl) {
    const response = await fetch(clip.videoUrl);
    if (!response.ok) throw new Error("The source clip could not be loaded for export.");
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(await response.blob()) });
    const conversion = await Conversion.init({
      input,
      output,
      trim: { start: 0, end: DURATION },
      copy: false,
      audio: { discard: true },
      video: {
        codec: "avc",
        quality: new Quality("high"),
        frameRate: 24,
        forceTranscode: true,
        processedWidth: WIDTH,
        processedHeight: HEIGHT,
        process: (sample) => {
          ctx.fillStyle = "#090909";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          sample.drawWithFit(ctx, { fit: "cover" });
          drawOverlay(ctx, reel, sample.timestamp);
          return canvas;
        },
      },
      tags: { title: `${reel.title} — Hypecast` },
    });
    if (!conversion.isValid) throw new Error("This browser cannot encode the selected clip as MP4.");
    conversion.onProgress = (progress) => onProgress(Math.round(progress * 100));
    await conversion.execute();
  } else if (clip.posterUrl) {
    const image = await imageFromUrl(clip.posterUrl);
    const source = new CanvasSource(canvas, { codec: "avc", quality: new Quality("high") });
    output.addVideoTrack(source, { frameRate: 24 });
    output.setMetadataTags({ title: `${reel.title} — Hypecast demo motion mock` });
    await output.start();
    const frameRate = 24;
    const frames = DURATION * frameRate;
    for (let frame = 0; frame < frames; frame += 1) {
      const time = frame / frameRate;
      ctx.fillStyle = "#090909";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawCover(ctx, image, image.naturalWidth, image.naturalHeight, 1 + time * 0.004);
      drawOverlay(ctx, reel, time);
      await source.add(time, 1 / frameRate, { keyFrame: frame % (frameRate * 2) === 0 });
      if (frame % 12 === 0) onProgress(Math.round((frame / frames) * 100));
    }
    await output.finalize();
  } else {
    throw new Error("This reel has no playable background.");
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("The browser encoder returned no MP4 data.");
  onProgress(100);
  download(buffer, reel);
}

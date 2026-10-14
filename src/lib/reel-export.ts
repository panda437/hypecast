import type { Reel, VideoClip } from "@/lib/types";

const WIDTH = 720;
const HEIGHT = 1280;
const DURATION = 15;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
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
    if (paragraph !== text.split(/\n+/).at(-1)) lines.push("");
  }
  return lines;
}

function drawOverlay(ctx: CanvasRenderingContext2D, reel: Reel, time: number) {
  const card = reel.cards.find((item) => time >= item.start && time < item.end) || reel.cards[0];
  if (!card) return;
  const isStory = card.text.length > 180;
  const sizeScale = reel.fontSize === "small" ? 0.82 : reel.fontSize === "large" ? 1.18 : 1;
  const fontFamily = reel.fontFamily === "serif"
    ? "Georgia, 'Times New Roman', serif"
    : reel.fontFamily === "mono"
      ? "'Geist Mono', 'Courier New', monospace"
      : "Geist, Arial, Helvetica, sans-serif";
  const fontWeight = reel.fontFamily === "mono" ? 700 : isStory ? 650 : reel.fontFamily === "serif" ? 700 : 800;
  let fontSize = Math.round((isStory ? 34 : card.text.length > 92 ? 48 : card.text.length > 58 ? 56 : 66) * sizeScale);
  let lines: string[] = [];
  const maxWidth = WIDTH - 132;
  const maxHeight = 880;
  do {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    lines = wrapText(ctx, card.text, maxWidth);
    if (lines.length * fontSize * (isStory ? 1.24 : 1.1) <= maxHeight) break;
    fontSize -= 2;
  } while (fontSize > 23);
  ctx.textAlign = isStory ? "left" : "center";
  ctx.textBaseline = "middle";
  const lineHeight = fontSize * (isStory ? 1.24 : 1.1);
  const blockHeight = Math.min(maxHeight + 54, lines.length * lineHeight + 58);
  const centerY = reel.position === "top" ? 310 : reel.position === "bottom" ? 900 : 625;
  const top = Math.max(122, Math.min(HEIGHT - 142 - blockHeight, centerY - blockHeight / 2));

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
    const x = isStory ? 70 : WIDTH / 2;
    if (reel.style === "clean") ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
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

function download(blob: Blob, reel: Reel) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hypecast-${reel.id}.mp4`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function exportReel(reel: Reel, clip: VideoClip, onProgress: (progress: number) => void) {
  const { ALL_FORMATS, BlobSource, BufferTarget, CanvasSource, Conversion, Input, Mp4OutputFormat, Output, Quality, VideoSampleSink } =
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
    if ((clip.duration || 15) < DURATION) {
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error("The generated clip contains no readable video track.");
      const source = new CanvasSource(canvas, { codec: "avc", quality: new Quality("high") });
      output.addVideoTrack(source, { frameRate: 24 });
      output.setMetadataTags({ title: `${reel.title} — Hypecast legacy motion with held ending` });
      await output.start();
      const frameRate = 24;
      const sourceDuration = clip.duration || 5;
      const outputFrames = DURATION * frameRate;
      const lastSourceFrame = Math.max(0, sourceDuration * frameRate - 1);
      const timestamps = Array.from(
        { length: outputFrames },
        (_, frame) => Math.min(frame, lastSourceFrame) / frameRate,
      );
      let outputFrame = 0;
      const sink = new VideoSampleSink(track);
      for await (const sample of sink.samplesAtTimestamps(timestamps)) {
        if (!sample) {
          outputFrame += 1;
          continue;
        }
        const time = outputFrame / frameRate;
        ctx.fillStyle = "#090909";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        sample.drawWithFit(ctx, { fit: "cover" });
        drawOverlay(ctx, reel, time);
        await source.add(time, 1 / frameRate, { keyFrame: outputFrame % (frameRate * 2) === 0 });
        sample.close();
        outputFrame += 1;
        if (outputFrame % 12 === 0) onProgress(Math.round((outputFrame / outputFrames) * 100));
      }
      await output.finalize();
    } else {
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
    }
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
  const blob = new Blob([buffer], { type: "video/mp4" });
  onProgress(100);
  download(blob, reel);
  return blob;
}

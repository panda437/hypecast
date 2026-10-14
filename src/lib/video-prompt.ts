export const VIDEO_IDENTITY_LOCK = `Use the reference image to preserve the same person's likeness throughout the video.`;

export function composeVideoPrompt(motionPrompt: string) {
  return `${VIDEO_IDENTITY_LOCK}

MOTION:
${motionPrompt.trim()}

Create one natural 15-second silent video. No extra people, speaking, text, logos, or watermarks.`;
}

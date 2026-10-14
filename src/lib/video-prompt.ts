export const VIDEO_IDENTITY_LOCK = `Use the supplied start image as the strict identity reference and first frame. Preserve the exact same single person, face, facial proportions, skin tone, age, hairstyle, body shape, wardrobe, lighting, camera angle, framing, and background for the full clip. The person in the input image is the only person allowed in the video.`;

export function composeVideoPrompt(motionPrompt: string) {
  return `${VIDEO_IDENTITY_LOCK}

MOTION DIRECTION:
${motionPrompt.trim()}

Keep the movement subtle, natural, silent, and suitable for a reusable UGC background. No speaking, lip-sync, identity drift, face morphing, wardrobe change, camera cut, scene change, new object, product, device, screen, interface, text, logo, watermark, or additional person. End close to the starting pose and composition so the clip can loop cleanly.`;
}

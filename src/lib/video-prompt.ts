export const VIDEO_IDENTITY_LOCK = `Use the supplied start image as the strict identity reference and first frame. Preserve the exact same single person, face, facial proportions, skin tone, age, hairstyle, body shape, and wardrobe for the full clip. Maintain visual continuity with the source lighting and physical setting. The person in the input image is the only person allowed in the video. A controlled camera move, reframing, or shift from front view to three-quarter/profile is allowed only when the motion direction explicitly asks for it.`;

export function composeVideoPrompt(motionPrompt: string, duration: 5 | 15 = 5) {
  return `${VIDEO_IDENTITY_LOCK}

MOTION DIRECTION:
${motionPrompt.trim()}

PERFORMANCE AND CAMERA:
Begin the specified action within the first half-second. Perform one clear physical action and one secondary facial or eye-line beat with natural phone-camera energy. Keep this a single continuous ${duration}-second shot with no cuts. Do not replace purposeful action with generic blinking or breathing. End close to the starting pose and composition during the final half-second so the clip can loop cleanly.

No speaking, lip-sync, identity drift, face morphing, wardrobe change, scene change, invented object, product, device, screen, interface, text, logo, watermark, or additional person.`;
}

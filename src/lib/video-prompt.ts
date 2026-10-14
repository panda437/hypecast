export const VIDEO_IDENTITY_LOCK = `Use the supplied start image as the strict identity reference and first frame. Preserve the exact same single person, face, facial proportions, skin tone, age, hairstyle, body shape, and wardrobe for the full clip. Maintain visual continuity with the source lighting and physical setting. The person in the input image is the only person allowed in the video. A controlled camera move, reframing, or shift from front view to three-quarter/profile is allowed only when the motion direction explicitly asks for it.`;

export function composeVideoPrompt(motionPrompt: string) {
  return `${VIDEO_IDENTITY_LOCK}

MOTION DIRECTION:
${motionPrompt.trim()}

PERFORMANCE AND CAMERA:
Begin the specified action within the first half-second. Keep this one continuous 15-second shot with no cuts, resets, repeated action, or recycled five-second segment. Pace the performance across the full duration: establish the physical action during seconds 0–5, let the reaction and camera movement develop during seconds 5–10, then land a secondary facial or eye-line beat during seconds 10–14. Settle naturally in the final second without returning to the opening pose. Use natural phone-camera energy and do not replace purposeful action with generic blinking or breathing.

No speaking, lip-sync, identity drift, face morphing, wardrobe change, scene change, invented object, product, device, screen, interface, text, logo, watermark, or additional person.`;
}

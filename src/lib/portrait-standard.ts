const PORTRAIT_ONLY_COMPOSITION = `
STRICT PORTRAIT-ONLY COMPOSITION:
- Render one uninterrupted vertical portrait photograph of exactly one fictional adult person.
- The person must be alone, centered, unobstructed, and clearly visible from the top of the hair through the upper torso. Keep the complete head, face, neck, and both shoulders inside the frame.
- The image is about the person only. Keep their hands empty and use a simple, softly defocused real-world background.
- Do not show a product, product packaging, merchandise, phone, laptop, tablet, monitor, television, projection, poster, book cover, document, dashboard, website, app interface, or any other screen.
- No screenshots, UI, mockups, floating graphics, picture-in-picture, split screen, collage, inset image, before-and-after layout, borders, or frames.
- No additional people, duplicated person, cropped-off head, text, caption, logo, badge, watermark, or branding.`;

export function candidatePortraitPrompt(name: string, characterBible: string) {
  return `Create a photorealistic 9:16 UGC creator casting portrait of ${name}, a fictional adult creator and not a real person or celebrity.

PERSON CONTINUITY:
${characterBible}

PHOTOGRAPHY:
Natural eye contact, soft window daylight, 35mm phone-camera realism, natural skin texture, relaxed posture, understated wardrobe, and no beauty-ad retouching.

${PORTRAIT_ONLY_COMPOSITION}`;
}

export function referencePortraitPrompt(name: string, characterBible: string, direction: string) {
  return `Create a new photorealistic 9:16 portrait of ${name}, using the input only as an identity reference for the fictional person.

IDENTITY CONTINUITY:
Keep the exact same face, hair, age, skin tone, build, and wardrobe palette. ${characterBible}

NEW PORTRAIT DIRECTION:
${direction}

Do not reproduce the input as a screenshot, framed image, poster, or image-within-an-image. Discard every non-person visual element from the input. Use soft daylight, phone-camera realism, and a natural motion-ready pose.

${PORTRAIT_ONLY_COMPOSITION}`;
}

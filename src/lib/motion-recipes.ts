export type MotionRecipe = {
  id: string;
  title: string;
  beat: string;
  description: string;
  intensity: "quiet" | "medium" | "bold";
  requiresNewImage: boolean;
  sourceNote: string;
  imageDirection: string;
  motionPrompt: string;
};

export const MOTION_RECIPES: MotionRecipe[] = [
  {
    id: "hair-tuck-glance",
    title: "Hair tuck + caught glance",
    beat: "hands + eye line",
    description: "A recognizable human adjustment begins immediately, then lands on an unplanned half-smile.",
    intensity: "medium",
    requiresNewImage: false,
    sourceNote: "Works with a clean front-facing or three-quarter portrait where one hand can enter frame.",
    imageDirection: "Front-facing waist-up portrait of the approved creator, hair visible and unobstructed, relaxed shoulders, soft daylight, simple lived-in room. The creator is alone with empty hands. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "Within the first half-second, the creator glances just past the camera and lifts one hand to tuck a loose section of hair behind one ear. Their eyes return to the lens as the hand falls out of frame, followed by a small caught-off-guard half-smile. Add a slight natural handheld drift, then settle close to the opening pose.",
  },
  {
    id: "car-seat-turn",
    title: "Car-seat sideways smile",
    beat: "setting + turn",
    description: "A windshield glance turns into a warm look toward camera, with the casual energy of a parked-car post.",
    intensity: "bold",
    requiresNewImage: true,
    sourceNote: "Needs a matching cast still in a parked car first. Video generation should not invent a new location from a room portrait. Creating that still is a separate image-credit call.",
    imageDirection: "Waist-up three-quarter portrait of the approved creator seated alone in the front seat of a parked car, daylight through the windshield, seatbelt visible, camera at passenger-seat height, clean car interior, relaxed expression. Empty hands. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "The creator begins by looking through the windshield, then turns their head and shoulders toward the passenger-side camera. Their expression shifts from thoughtful to an easy genuine smile, as if a friend just said something quietly funny. Let the handheld camera drift a few centimeters toward the side window, then return near the opening angle.",
  },
  {
    id: "profile-reveal",
    title: "Front to side profile",
    beat: "camera arc",
    description: "The camera earns a second composition in one shot instead of holding a locked head-on frame.",
    intensity: "bold",
    requiresNewImage: false,
    sourceNote: "Best with head-and-shoulders space around the creator and a simple background.",
    imageDirection: "Head-and-shoulders portrait of the approved creator with breathing room on both sides, neutral attentive expression, soft window light, simple lived-in background. The creator is alone. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "Start head-on. The creator notices something off to one side and turns into a clean three-quarter profile while the handheld camera makes a short matching arc in the opposite direction, creating clear parallax in the background. They pause with a knowing expression, then both subject and camera ease back toward the opening composition without a cut.",
  },
  {
    id: "sleeve-reset",
    title: "Sleeve reset + lean in",
    beat: "wardrobe + depth",
    description: "A quick wardrobe adjustment creates purposeful motion before a brief lean toward the viewer.",
    intensity: "medium",
    requiresNewImage: false,
    sourceNote: "Works when the creator's forearms or sleeves are visible in the source portrait.",
    imageDirection: "Waist-up seated portrait of the approved creator with forearms visible, simple long-sleeve top, soft daylight, uncluttered lived-in background. The creator is alone with empty hands. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "Immediately, the creator uses one hand to pull the opposite sleeve into place, looks down at the movement, then leans slightly closer to the lens and looks up with a quiet amused expression. The camera has a small imperfect handheld dip during the adjustment and recovers as the creator returns near the first pose.",
  },
  {
    id: "almost-laugh",
    title: "Trying not to laugh",
    beat: "expression change",
    description: "A suppressed laugh gives the face a real emotional transition without speaking.",
    intensity: "quiet",
    requiresNewImage: false,
    sourceNote: "Works with nearly any clean cast portrait.",
    imageDirection: "Close waist-up portrait of the approved creator, relaxed mouth and attentive eyes, soft natural daylight, simple home background. The creator is alone with empty hands. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "The creator holds eye contact for only a beat, looks down as if trying not to react, presses their lips together, then lets a real smile escape while looking back toward the lens. Their shoulders move slightly with the suppressed laugh. Use gentle handheld breathing rather than a locked camera and let the moment finish naturally.",
  },
  {
    id: "window-check",
    title: "Window check + reset",
    beat: "light + eyeline",
    description: "A shift toward the window changes the face and light, then brings attention back to camera.",
    intensity: "quiet",
    requiresNewImage: false,
    sourceNote: "Best when the portrait already has believable window light from one side.",
    imageDirection: "Three-quarter waist-up portrait of the approved creator beside a window, daylight falling across one side of the face, quiet home interior, generous negative space. The creator is alone with empty hands. No products, devices, screens, text, logos, or collage elements.",
    motionPrompt: "The creator's attention shifts toward the window immediately. They turn far enough for the daylight to slide across their face, inhale, then look back to the lens with a calmer expression. The camera makes a restrained side-to-side handheld correction that reveals a little background depth, finishing close to the original frame.",
  },
];

export const DEFAULT_MOTION_RECIPE = MOTION_RECIPES[0];

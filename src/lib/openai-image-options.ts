export function configuredImageInputFidelity(value = process.env.OPENAI_IMAGE_INPUT_FIDELITY) {
  return value === "high" || value === "low" ? value : undefined;
}

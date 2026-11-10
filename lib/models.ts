// Keep model IDs server-side and change them only after checking the live
// provider schema/pricing. These are fal queue model IDs.
export const VIDEO_MODELS = {
  balanced: {
    label: "Balanced",
    id: "fal-ai/kling-video/v3/standard/text-to-video",
    description: "A balance of quality and generation cost"
  },
  premium: {
    label: "Premium",
    id: "fal-ai/veo3.1",
    description: "High-fidelity cinematic generation"
  },
  fast: {
    label: "Fast",
    id: "bytedance/seedance-2.0/fast/text-to-video",
    description: "Faster creative iteration"
  }
} as const;

export type ModelTier = keyof typeof VIDEO_MODELS;

export function buildModelInput(model: ModelTier, prompt: string, ratio: string, seconds: number) {
  if (model === "balanced") {
    return { prompt, duration: String(seconds), aspect_ratio: ratio, generate_audio: true };
  }
  return { prompt };
}

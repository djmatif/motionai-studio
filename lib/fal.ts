import { fal } from "@fal-ai/client";
import { VIDEO_MODELS, buildModelInput } from "@/lib/models";

fal.config({ credentials: process.env.FAL_KEY ?? "" });

export function extractVideoUrl(payload: any): string | null {
  if (!payload) return null;

  const candidates: unknown[] = [
    payload.video?.url,
    payload.output?.video?.url,
    payload.output?.url,
    payload.data?.video?.url,
    payload.data?.url,
    payload.result?.video?.url,
    payload.result?.url,
    payload.url,
    payload.video,
    payload.output,
    payload.data,
    payload.result
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = extractVideoUrl(candidate);
      if (nested) return nested;
    }
  }

  return null;
}

export async function submitGenerationToFal({
  prompt,
  modelKey,
  aspectRatio,
  duration,
  imageUrl
}: {
  prompt: string;
  modelKey: string;
  aspectRatio: string;
  duration: number;
  imageUrl?: string;
}) {
  const model = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS] ?? VIDEO_MODELS.balanced;

  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not configured.");
  }

  const imageModelId = "fal-ai/kling-video/v3/standard/image-to-video";
  const modelId = imageUrl ? imageModelId : model.id;
  const input = imageUrl
    ? { prompt, start_image_url: imageUrl, duration: String(duration), generate_audio: true }
    : buildModelInput(modelKey as keyof typeof VIDEO_MODELS, prompt, aspectRatio, duration);
  const response = await fal.queue.submit(modelId, { input });

  const requestId =
    (response as any)?.requestId ??
    (response as any)?.id ??
    (response as any)?.request_id ??
    (response as any)?.data?.requestId ??
    "";

  return { requestId, modelId, raw: response };
}

export async function pollFalStatus(modelId: string, requestId: string) {
  if (!requestId) return null;

  const result = await fal.queue.status(modelId, { requestId });
  const normalizedStatus = String((result as any)?.status ?? (result as any)?.state ?? "queued").toLowerCase();
  const completed = normalizedStatus === "completed";
  const output = completed ? await fal.queue.result(modelId, { requestId }) : null;
  const videoUrl = extractVideoUrl(output ?? result);

  return {
    status: normalizedStatus,
    videoUrl,
    raw: result
  };
}

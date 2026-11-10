import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_MODELS } from "@/lib/models";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  const modelKey = String(body.model ?? "balanced");
  const aspectRatio = String(body.aspectRatio ?? "16:9");
  const duration = Number(body.duration ?? 5);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const selectedModel = VIDEO_MODELS[modelKey as keyof typeof VIDEO_MODELS] ?? VIDEO_MODELS.balanced;
  const generationId = crypto.randomUUID();

  try {
    await supabase.from("generations").insert([
      {
        id: generationId,
        user_id: user.id,
        prompt,
        model: modelKey,
        provider_model_id: selectedModel.id,
        provider_request_id: `demo-${generationId}`,
        status: "queued",
        aspect_ratio: aspectRatio,
        duration_seconds: duration,
        video_url: null,
        error_message: null,
        credits_charged: 0
      }
    ]);
  } catch {
    // Ignore database write failures in starter mode so the API still works
    // without a configured Supabase project.
  }

  return NextResponse.json({
    id: generationId,
    status: "queued",
    providerModelId: selectedModel.id,
    message: "Generation queued."
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitGenerationToFal } from "@/lib/fal";
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
  const adminClient = createAdminClient();

  try {
    const submitted = await submitGenerationToFal({
      prompt,
      modelKey,
      aspectRatio,
      duration
    });

    if (adminClient) {
      await adminClient.from("generations").insert([
        {
          id: generationId,
          user_id: user.id,
          prompt,
          model: modelKey,
          provider_model_id: selectedModel.id,
          provider_request_id: submitted.requestId || `demo-${generationId}`,
          status: "queued",
          aspect_ratio: aspectRatio,
          duration_seconds: duration,
          credits_charged: 0,
          video_url: null,
          error_message: null
        }
      ]);
    }

    return NextResponse.json({
      id: generationId,
      status: "queued",
      providerModelId: submitted.modelId,
      providerRequestId: submitted.requestId
    });
  } catch (error) {
    if (adminClient) {
      await adminClient.from("generations").insert([
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
          credits_charged: 0,
          video_url: null,
          error_message: error instanceof Error ? error.message : "Generation queue unavailable"
        }
      ]);
    }

    return NextResponse.json(
      {
        id: generationId,
        status: "queued",
        providerModelId: selectedModel.id,
        warning: error instanceof Error ? error.message : "Fal.ai is not configured yet."
      },
      { status: 200 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitGenerationToFal } from "@/lib/fal";
import { VIDEO_MODELS } from "@/lib/models";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  const modelKey = String(body.model ?? "balanced");
  const aspectRatio = String(body.aspectRatio ?? "16:9");
  const duration = Number(body.duration ?? 5);
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : undefined;

  if (!prompt || prompt.length < 12 || prompt.length > 1800) {
    return NextResponse.json({ error: "Prompt must be between 12 and 1,800 characters." }, { status: 400 });
  }
  if (!Object.hasOwn(VIDEO_MODELS, modelKey)) {
    return NextResponse.json({ error: "Choose a supported video model." }, { status: 400 });
  }
  if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) {
    return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
  }
  if (![5, 8, 10, 15].includes(duration)) {
    return NextResponse.json({ error: "Choose a supported duration." }, { status: 400 });
  }
  if (imageUrl && (!imageUrl.startsWith("https://") || !/\.fal\.media\//i.test(imageUrl))) {
    return NextResponse.json({ error: "Upload your reference image again before generating." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Your account profile is not initialized. Sign out and sign in again, then retry." }, { status: 503 });
  }

  const generationId = crypto.randomUUID();
  try {
    const submitted = await submitGenerationToFal({ prompt, modelKey, aspectRatio, duration, imageUrl });
    const { error } = await supabase.from("generations").insert({
      id: generationId,
      user_id: user.id,
      prompt,
      model: modelKey,
      provider_model_id: submitted.modelId,
      provider_request_id: submitted.requestId,
      status: "queued",
      aspect_ratio: aspectRatio,
      duration_seconds: duration,
      credits_charged: 0
    });
    if (error) throw new Error("Generation was submitted but could not be saved. Contact support with request ID: " + submitted.requestId);
    return NextResponse.json({ id: generationId, status: "queued", providerModelId: submitted.modelId, providerRequestId: submitted.requestId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Video provider unavailable." }, { status: 503 });
  }
}

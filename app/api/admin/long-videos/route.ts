import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/authz";
import { submitGenerationToFal } from "@/lib/fal";

const CLIP_MODEL = "balanced";
const CLIP_DURATION = 15;
const CLIP_COUNT = 4;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  const aspectRatio = String(body.aspectRatio ?? "16:9");
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : undefined;
  if (imageUrl && (!imageUrl.startsWith("https://") || !/\.fal\.media\//i.test(imageUrl))) return NextResponse.json({ error: "Upload your reference image again before generating." }, { status: 400 });
  if (prompt.length < 12 || prompt.length > 1800) return NextResponse.json({ error: "Prompt must be between 12 and 1,800 characters." }, { status: 400 });
  if (!["16:9", "9:16", "1:1"].includes(aspectRatio)) return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });

  const { data: job, error: insertError } = await supabase.from("admin_long_videos").insert({
    user_id: user.id, prompt, total_duration_seconds: 60, status: "submitting"
  }).select("id").single();
  if (insertError || !job) return NextResponse.json({ error: insertError?.message ?? "Could not create video job." }, { status: 500 });

  try {
    const requests: string[] = [];
    for (let index = 0; index < CLIP_COUNT; index++) {
      const segmentPrompt = prompt + " Create scene " + (index + 1) + " of 4 for a continuous one-minute film. This is a 15-second segment. " +
        (index === 0 ? "Establish the opening scene and visual style." :
         index === 3 ? "Create the concluding scene and resolve the action." :
         "Continue naturally from the preceding scene, maintaining the same characters, wardrobe, setting, lighting and visual style.");
      const submitted = await submitGenerationToFal({
        prompt: segmentPrompt, modelKey: CLIP_MODEL, aspectRatio, duration: CLIP_DURATION,
        ...(index === 0 && imageUrl ? { imageUrl } : {})
      });
      requests.push(submitted.requestId);
    }

    const { error: updateError } = await supabase.from("admin_long_videos").update({
      clip_request_ids: requests, clip_model_id: "fal-ai/kling-video/v3/standard/text-to-video",
      status: "generating", updated_at: new Date().toISOString()
    }).eq("id", job.id);
    if (updateError) throw updateError;
    return NextResponse.json({ id: job.id, status: "generating", duration: 60 });
  } catch (error) {
    await supabase.from("admin_long_videos").update({
      status: "failed", error_message: error instanceof Error ? error.message : "Could not submit the four scenes."
    }).eq("id", job.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start the long video." }, { status: 503 });
  }
}

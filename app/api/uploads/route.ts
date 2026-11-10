import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fal } from "@fal-ai/client";

export const runtime = "nodejs";

function safeProviderMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown provider error");
  // Keep diagnostics useful without returning credentials or large provider payloads.
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/(key|token|secret)=\S+/gi, "$1=[redacted]").slice(0, 400);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading." }, { status: 401 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "Video provider is not configured yet. Add FAL_KEY to the Vercel Production environment and redeploy." }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });

  try {
    fal.config({ credentials: process.env.FAL_KEY });
    const url = await fal.storage.upload(file);
    return NextResponse.json({ url });
  } catch (error) {
    const providerError = safeProviderMessage(error);
    console.error("[image-upload] fal.ai storage upload failed:", providerError);
    return NextResponse.json({
      error: "fal.ai image upload failed: " + providerError,
      code: "FAL_STORAGE_UPLOAD_FAILED"
    }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fal } from "@fal-ai/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading." }, { status: 401 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "Video provider is not configured yet." }, { status: 503 });

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
  } catch {
    return NextResponse.json({ error: "Image upload failed. Please try another image." }, { status: 502 });
  }
}

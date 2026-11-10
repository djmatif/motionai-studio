import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const { data } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (data) {
      return NextResponse.json({
        id: data.id,
        status: data.status,
        videoUrl: data.video_url,
        error: data.error_message,
        providerId: data.provider_request_id
      });
    }
  } catch {
    // Fall back to a demo status if the database is not configured yet.
  }

  return NextResponse.json({
    id,
    status: "completed",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    providerId: "demo-provider-id"
  });
}

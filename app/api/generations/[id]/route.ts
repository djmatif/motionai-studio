import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pollFalStatus } from "@/lib/fal";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  let row: any = null;

  if (adminClient) {
    const { data } = await adminClient
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    row = data;
  }

  if (row) {
    const providerRequestId = String(row.provider_request_id ?? "");
    const shouldPoll = Boolean(providerRequestId) && !["completed", "failed"].includes(row.status);

    if (shouldPoll && process.env.FAL_KEY) {
      const poll = await pollFalStatus(String(row.provider_model_id ?? ""), providerRequestId);

      if (poll) {
        const nextStatus = poll.status === "completed" ? "completed" : poll.status === "failed" ? "failed" : row.status;

        const updates: Record<string, any> = { status: nextStatus };
        if (poll.videoUrl) updates.video_url = poll.videoUrl;
        if (nextStatus === "completed" && !row.completed_at) updates.completed_at = new Date();
        if (nextStatus === "failed") updates.error_message = "Generation failed at provider.";

        await adminClient?.from("generations").update(updates).eq("id", row.id);

        return NextResponse.json({
          id: row.id,
          status: nextStatus,
          videoUrl: poll.videoUrl ?? row.video_url,
          error: nextStatus === "failed" ? "Generation failed." : null,
          providerId: providerRequestId
        });
      }
    }

    return NextResponse.json({
      id: row.id,
      status: row.status,
      videoUrl: row.video_url,
      error: row.error_message,
      providerId: row.provider_request_id
    });
  }

  return NextResponse.json({
    id,
    status: "completed",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    providerId: "demo-provider-id"
  });
}

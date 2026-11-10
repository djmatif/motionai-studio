import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pollFalStatus } from "@/lib/fal";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error: readError } = await supabase.from("generations")
    .select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Unable to read generation status." }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  const providerRequestId = String(row.provider_request_id ?? "");
  if (providerRequestId && !["completed", "failed"].includes(row.status) && process.env.FAL_KEY) {
    const poll = await pollFalStatus(String(row.provider_model_id ?? ""), providerRequestId);
    if (poll) {
      const nextStatus = poll.status === "completed" ? "completed" : poll.status === "failed" ? "failed" : row.status;
      const updates: Record<string, unknown> = { status: nextStatus };
      if (poll.videoUrl) updates.video_url = poll.videoUrl;
      if (nextStatus === "completed" && !row.completed_at) updates.completed_at = new Date().toISOString();
      if (nextStatus === "failed") updates.error_message = "Generation failed at provider.";
      const { error } = await supabase.from("generations").update(updates).eq("id", row.id).eq("user_id", user.id);
      if (error) return NextResponse.json({ error: "Unable to save generation status." }, { status: 500 });
      return NextResponse.json({ id: row.id, status: nextStatus, videoUrl: poll.videoUrl ?? row.video_url,
        error: nextStatus === "failed" ? "Generation failed." : null, providerId: providerRequestId });
    }
  }
  return NextResponse.json({ id: row.id, status: row.status, videoUrl: row.video_url, error: row.error_message, providerId: providerRequestId });
}

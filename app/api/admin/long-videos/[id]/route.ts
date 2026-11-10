import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/authz";
import { pollFalStatus, submitVideoMerge, pollVideoMerge } from "@/lib/fal";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const { data: job, error } = await supabase.from("admin_long_videos").select("*").eq("id", id).single();
  if (error || !job) return NextResponse.json({ error: "Video job not found." }, { status: 404 });

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ id, status: job.status, videoUrl: job.video_url, error: job.error_message });
  }

  try {
    if (job.status === "merging" && job.merge_request_id) {
      const merge = await pollVideoMerge(job.merge_request_id);
      if (merge.status === "completed" && merge.videoUrl) {
        await supabase.from("admin_long_videos").update({
          status: "completed", video_url: merge.videoUrl, updated_at: new Date().toISOString()
        }).eq("id", id);
        return NextResponse.json({ id, status: "completed", videoUrl: merge.videoUrl });
      }
      if (["failed", "cancelled", "canceled"].includes(merge.status)) {
        await supabase.from("admin_long_videos").update({
          status: "failed", error_message: "The MP4 merge job failed.", updated_at: new Date().toISOString()
        }).eq("id", id);
        return NextResponse.json({ id, status: "failed", error: "The MP4 merge job failed." });
      }
      return NextResponse.json({ id, status: "merging" });
    }

    const requestIds = Array.isArray(job.clip_request_ids) ? job.clip_request_ids as string[] : [];
    if (requestIds.length !== 4) {
      throw new Error("The long-video job does not contain all four scene request IDs.");
    }

    const modelIds = Array.isArray(job.clip_model_ids) ? job.clip_model_ids as string[] : [];
    const clips = await Promise.all(requestIds.map((requestId, index) =>
      pollFalStatus(modelIds[index] ?? job.clip_model_id, requestId)
    ));
    const failed = clips.find((clip) => clip && ["failed", "cancelled", "canceled"].includes(clip.status));
    if (failed) throw new Error("One of the four 15-second scenes failed to render.");

    const videoUrls = clips.map((clip) => clip?.videoUrl).filter((url): url is string => Boolean(url));
    if (videoUrls.length !== 4) return NextResponse.json({ id, status: "generating" });

    const merge = await submitVideoMerge(videoUrls);
    const { error: updateError } = await supabase.from("admin_long_videos").update({
      status: "merging", merge_request_id: merge.requestId, updated_at: new Date().toISOString()
    }).eq("id", id);
    if (updateError) throw updateError;
    return NextResponse.json({ id, status: "merging" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "The long video failed.";
    await supabase.from("admin_long_videos").update({
      status: "failed", error_message: message, updated_at: new Date().toISOString()
    }).eq("id", id);
    return NextResponse.json({ id, status: "failed", error: message });
  }
}

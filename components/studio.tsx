"use client";

import { useState } from "react";

type Props = { signedIn: boolean; credits: number; plan: string };

export function Studio({ signedIn, credits, plan }: Props) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"text" | "image">("text");
  const [tier, setTier] = useState("balanced");
  const [ratio, setRatio] = useState("16:9");
  const [seconds, setSeconds] = useState(5);
  const [style, setStyle] = useState("Cinematic");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [generationId, setGenerationId] = useState("");

  async function generate() {
    setMessage("");
    setVideoUrl("");

    if (!signedIn) {
      window.location.href = "/login";
      return;
    }
    if (prompt.trim().length < 12) {
      setMessage("Write a more detailed prompt (at least 12 characters).");
      return;
    }
    if (mode === "image") {
      setMessage("Image-to-video upload is prepared for the next integration step; text-to-video is enabled in this build.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${style} style. ${prompt}`,
          model: tier,
          aspectRatio: ratio,
          duration: seconds
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not submit generation.");

      setGenerationId(data.id);
      setMessage("Your video is in the generation queue. This can take a few minutes.");

      let ready = false;
      for (let i = 0; i < 90; i++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const poll = await fetch(`/api/generations/${data.id}`);
        const result = await poll.json();

        if (!poll.ok) throw new Error(result.error || "Could not check generation.");
        if (result.status === "completed" && result.videoUrl) {
          setVideoUrl(result.videoUrl);
          setMessage("Your video is ready.");
          ready = true;
          break;
        }
        if (result.status === "failed") {
          throw new Error(result.error || "The video provider could not complete this request.");
        }
      }

      if (!ready) {
        setMessage("Generation is taking longer than expected. Your job is saved; check your library shortly.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
      <div className="rounded-3xl border border-white/10 bg-[#111525] p-5 sm:p-7 shadow-2xl shadow-black/20">
        <div className="flex justify-between items-center gap-3 mb-5">
          <h2 className="text-xl font-bold">Create a video</h2>
          <span className="text-xs rounded-full bg-violet-500/15 text-violet-200 px-3 py-1">{plan.toUpperCase()} · {credits} credits</span>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setMode("text")} className={`rounded-xl px-4 py-2 text-sm ${mode === "text" ? "bg-violet-600" : "bg-white/5 text-slate-300"}`}>
            ✍ Text to video
          </button>
          <button onClick={() => setMode("image")} className={`rounded-xl px-4 py-2 text-sm ${mode === "image" ? "bg-violet-600" : "bg-white/5 text-slate-300"}`}>
            ▧ Image to video
          </button>
        </div>

        <label className="text-sm font-semibold">Describe your scene</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={1800}
          rows={5}
          placeholder="A cinematic drone shot flying over a futuristic Nairobi skyline at sunset, glowing city lights, smooth camera movement, realistic atmosphere..."
          className="w-full mt-2 rounded-xl bg-[#090e1b] border border-white/10 p-4 outline-none focus:border-violet-400 resize-y"
        />

        {mode === "image" && (
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Reference image URL (image-to-video adapter required)"
            className="w-full mt-3 rounded-xl bg-[#090e1b] border border-white/10 p-3"
          />
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <label className="text-sm">
            Visual style
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="block w-full mt-2 rounded-xl bg-[#090e1b] border border-white/10 p-3">
              <option>Cinematic</option>
              <option>3D animation</option>
              <option>Anime</option>
              <option>Cartoon</option>
              <option>Photorealistic</option>
              <option>Fantasy</option>
            </select>
          </label>

          <label className="text-sm">
            AI model
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="block w-full mt-2 rounded-xl bg-[#090e1b] border border-white/10 p-3">
              <option value="balanced">Balanced · Kling</option>
              <option value="premium">Premium · Veo</option>
              <option value="fast">Fast · Seedance</option>
            </select>
          </label>

          <label className="text-sm">
            Duration
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="block w-full mt-2 rounded-xl bg-[#090e1b] border border-white/10 p-3">
              <option value={5}>5 seconds</option>
              <option value={8}>8 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>
          </label>

          <label className="text-sm">
            Aspect ratio
            <select value={ratio} onChange={(e) => setRatio(e.target.value)} className="block w-full mt-2 rounded-xl bg-[#090e1b] border border-white/10 p-3">
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </label>
        </div>

        <button onClick={generate} disabled={busy} className="w-full mt-6 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-4 font-bold">
          {busy ? "Generating…" : "✦ Generate AI video"}
        </button>

        {message && <p className="mt-4 text-sm text-violet-200" role="status">{message}</p>}
        {generationId && <p className="text-xs text-slate-500 mt-2">Job ID: {generationId}</p>}
      </div>

      <aside className="rounded-3xl border border-white/10 bg-[#111525] p-5 sm:p-7">
        <h2 className="font-bold text-xl">Preview</h2>
        <div className="mt-5 aspect-video rounded-2xl bg-gradient-to-br from-[#171d3d] via-[#35205c] to-[#07516a] flex items-center justify-center overflow-hidden">
          {videoUrl ? (
            <video src={videoUrl} controls className="w-full h-full object-contain" />
          ) : (
            <div className="text-center px-5">
              <div className="text-5xl mb-3">▶</div>
              <p className="font-semibold">Your creation will appear here</p>
              <p className="text-xs text-slate-300 mt-2">Submit a prompt to start rendering</p>
            </div>
          )}
        </div>

        {videoUrl && (
          <a href={videoUrl} target="_blank" rel="noreferrer" className="block text-center rounded-xl bg-white text-black font-bold py-3 mt-4">
            Download / open video
          </a>
        )}

        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="font-semibold">Generation tips</h3>
          <ul className="text-sm text-slate-400 mt-3 space-y-2 list-disc pl-5">
            <li>Describe the subject and action.</li>
            <li>Include camera movement and lighting.</li>
            <li>Specify the mood, setting and visual style.</li>
            <li>Keep each clip focused on one clear scene.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

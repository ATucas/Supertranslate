import {
  FfmpegAudioSource,
  GeminiLiveProvider,
  SimulatedProvider,
  VideoDemoProvider,
} from "@subtitle/providers";
import type { Session } from "@subtitle/contracts";
const api = process.env.API_URL ?? "http://localhost:3000";
const intervalMs = Number(process.env.PROVIDER_INTERVAL_MS ?? 700);
const provider =
  process.env.GEMINI_API_KEY && process.env.DEMO_VIDEO_PATH
    ? new GeminiLiveProvider(
        process.env.GEMINI_API_KEY,
        new FfmpegAudioSource(process.env.DEMO_VIDEO_PATH),
        process.env.GEMINI_LIVE_MODEL ?? "gemini-3.5-transcribe-live",
        process.env.GEMINI_TARGET_LANGUAGE ?? "es",
      )
    : process.env.DEMO_VIDEO_PATH
      ? new VideoDemoProvider(process.env.DEMO_VIDEO_PATH, intervalMs)
      : new SimulatedProvider(intervalMs);
const active = new Set<string>();
async function tick() {
  const response = await fetch(`${api}/sessions`);
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const sessions = (await response.json()) as Session[];
  for (const session of sessions.filter((x) => x.status === "active"))
    if (!active.has(session.id)) {
      active.add(session.id);
      void provider
        .stream(session.id, async (segment) => {
          const response = await fetch(
            `${api}/internal/sessions/${session.id}/events`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ type: "subtitle.segment", ...segment }),
            },
          );
          if (!response.ok)
            throw new Error(`API event returned ${response.status}`);
        })
        .catch((err) => {
          active.delete(session.id);
          console.error(`provider failed for ${session.id}`, err);
        });
    }
}
async function main() {
  await tick();
  setInterval(
    () => void tick().catch((err) => console.error("worker tick failed", err)),
    Number(process.env.POLL_INTERVAL_MS ?? 1000),
  );
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

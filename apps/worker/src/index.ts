import { SimulatedProvider } from "@subtitle/providers";
import type { Session } from "@subtitle/contracts";
const api = process.env.API_URL ?? "http://localhost:3000";
const provider = new SimulatedProvider(
  Number(process.env.PROVIDER_INTERVAL_MS ?? 700),
);
const active = new Set<string>();
async function tick() {
  const response = await fetch(`${api}/sessions`);
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const sessions = (await response.json()) as Session[];
  for (const session of sessions.filter((x) => x.status === "active"))
    if (!active.has(session.id)) {
      active.add(session.id);
      void provider.stream(session.id, async (segment) => {
        await fetch(`${api}/internal/sessions/${session.id}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "subtitle.segment", ...segment }),
        });
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

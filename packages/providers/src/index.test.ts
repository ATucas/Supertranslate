import test from "node:test";
import assert from "node:assert/strict";
import { SimulatedProvider, VideoDemoProvider } from "./index.js";
test("simulated provider is deterministic", async () => {
  const out: string[] = [];
  await new SimulatedProvider(0).stream("s", (x) => {
    out.push(x.source);
  });

  assert.deepEqual(out, [
    "Welcome to the show",
    "Live captions are arriving",
    "This provider is deterministic",
    "Thanks for watching",
  ]);
});

test("video demo provider requires a real source path", async () => {
  const provider = new VideoDemoProvider("/definitely/missing/video.mp4", 0);
  await assert.rejects(
    provider.stream("session", () => undefined),
    /ENOENT/,
  );
});

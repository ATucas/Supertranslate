import test from "node:test";
import assert from "node:assert/strict";
import { SimulatedProvider } from "./index.js";
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

import test from "node:test";
import assert from "node:assert/strict";
import { isCreateSessionInput } from "./index.js";
test("validates session title", () => {
  assert.equal(isCreateSessionInput({ title: "Talk" }), true);
  assert.equal(isCreateSessionInput({ title: " " }), false);
});

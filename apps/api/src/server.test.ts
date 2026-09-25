import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./server.js";
test("session CRUD", async () => {
  const app = buildApp();
  const bad = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: {},
  });
  assert.equal(bad.statusCode, 400);
  const created = await app.inject({
    method: "POST",
    url: "/sessions",
    payload: { title: "Demo" },
  });
  assert.equal(created.statusCode, 201);
  const session = created.json();
  const list = await app.inject("/sessions");
  assert.equal(list.json().length, 1);
  assert.equal(
    (await app.inject({ method: "DELETE", url: `/sessions/${session.id}` }))
      .statusCode,
    204,
  );
  await app.close();
});

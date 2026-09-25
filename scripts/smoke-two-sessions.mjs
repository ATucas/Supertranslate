#!/usr/bin/env node
const api = process.env.API_URL ?? "http://localhost:3000";
const create = async (title) => {
  const response = await fetch(`${api}/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error(`create failed: ${response.status}`);
  return response.json();
};
const sessions = await Promise.all([
  create("Mock session A"),
  create("Mock session B"),
]);
const listed = await (await fetch(`${api}/sessions`)).json();
if (!sessions.every((session) => listed.some((item) => item.id === session.id)))
  throw new Error("not all sessions were listed");
console.log(
  `Created ${sessions.length} simultaneous sessions: ${sessions.map((s) => s.id).join(", ")}`,
);
console.log(
  "This proves API session isolation only; provider output remains mock unless a real worker is configured.",
);

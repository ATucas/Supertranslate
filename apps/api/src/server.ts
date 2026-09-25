import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import type {
  Session,
  SubtitleSegment,
  ClientEvent,
  SessionMetrics,
} from "@subtitle/contracts";
import { isCreateSessionInput } from "@subtitle/contracts";
import type { WebSocket } from "ws";
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const sessions = new Map<string, Session>();
  const segments = new Map<string, SubtitleSegment[]>();
  const sockets = new Map<string, Set<WebSocket>>();
  const metrics = new Map<string, SessionMetrics>();
  app.register(cors, { origin: true });
  app.register(websocket);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/sessions", async () => [...sessions.values()]);
  app.post("/sessions", async (req, reply) => {
    const body: unknown = req.body;
    if (!isCreateSessionInput(body))
      return reply.code(400).send({ error: "title is required" });
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      title: body.title.trim(),
      createdAt: now,
      status: "active" as const,
    };
    sessions.set(session.id, session);
    segments.set(session.id, []);
    metrics.set(session.id, {
      provider: process.env.GEMINI_API_KEY ? "gemini" : "simulated",
      latencyMs: 0,
      chunksProcessed: 0,
      errors: 0,
      updatedAt: now,
    });
    return reply.code(201).send(session);
  });
  app.get<{ Params: { id: string } }>(
    "/sessions/:id/metrics",
    async (req, reply) => {
      const value = metrics.get(req.params.id);
      if (!value) return reply.code(404).send({ error: "session not found" });
      return value;
    },
  );
  app.get<{ Params: { id: string; format: string } }>(
    "/sessions/:id/export/:format",
    async (req, reply) => {
      const list = segments.get(req.params.id);
      if (!list) return reply.code(404).send({ error: "session not found" });
      const format = req.params.format;
      if (!["vtt", "srt", "txt"].includes(format))
        return reply
          .code(400)
          .send({ error: "format must be vtt, srt, or txt" });
      const body =
        format === "vtt"
          ? `WEBVTT\n\n${list.map((x, i) => `${i + 1}\n${time(x.startMs)} --> ${time(x.endMs)}\n${x.source}\n${x.translation}\n`).join("\n")}`
          : format === "srt"
            ? list
                .map(
                  (x, i) =>
                    `${i + 1}\n${time(x.startMs, true)} --> ${time(x.endMs, true)}\n${x.source}\n${x.translation}\n`,
                )
                .join("\n")
            : list.map((x) => `${x.source} / ${x.translation}`).join("\n");
      return reply
        .type(format === "txt" ? "text/plain" : "text/" + format)
        .send(body);
    },
  );
  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const session = sessions.get(req.params.id);
    if (!session) return reply.code(404).send({ error: "session not found" });
    return { session, segments: segments.get(session.id) ?? [] };
  });
  app.patch<{ Params: { id: string }; Body: Partial<Session> }>(
    "/sessions/:id",
    async (req, reply) => {
      const session = sessions.get(req.params.id);
      if (!session) return reply.code(404).send({ error: "session not found" });
      const body = req.body as Partial<Session>;
      if (
        body.title !== undefined &&
        (typeof body.title !== "string" || !body.title.trim())
      )
        return reply.code(400).send({ error: "title must be non-empty" });
      if (
        body.status !== undefined &&
        body.status !== "active" &&
        body.status !== "ended"
      )
        return reply.code(400).send({ error: "invalid status" });
      const updated = {
        ...session,
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      };
      sessions.set(session.id, updated);
      if (body.status)
        broadcast(session.id, { type: "session.status", status: body.status });
      return updated;
    },
  );
  app.delete<{ Params: { id: string } }>(
    "/sessions/:id",
    async (req, reply) => {
      if (!sessions.delete(req.params.id))
        return reply.code(404).send({ error: "session not found" });
      segments.delete(req.params.id);
      sockets.get(req.params.id)?.forEach((s) => s.close());
      sockets.delete(req.params.id);
      return reply.code(204).send();
    },
  );
  app.post<{ Params: { id: string }; Body: SubtitleSegment }>(
    "/internal/sessions/:id/events",
    async (req, reply) => {
      const session = sessions.get(req.params.id);
      if (!session) return reply.code(404).send({ error: "session not found" });
      const event = req.body as SubtitleSegment & { type?: string };
      if (
        event.type !== "subtitle.segment" ||
        event.sessionId !== session.id ||
        typeof event.id !== "string"
      )
        return reply.code(400).send({ error: "invalid event" });
      const list = segments.get(session.id) ?? [];
      if (!list.some((x) => x.id === event.id)) list.push(event);
      segments.set(session.id, list);
      const current = metrics.get(session.id);
      if (current) {
        const updated = {
          ...current,
          chunksProcessed: current.chunksProcessed + 1,
          updatedAt: new Date().toISOString(),
        };
        metrics.set(session.id, updated);
        broadcast(session.id, { type: "session.metrics", metrics: updated });
      }
      broadcast(req.params.id, { type: "subtitle.segment", segment: event });
      return reply.code(202).send();
    },
  );
  app.after(() => {
    app.get<{ Params: { id: string } }>(
      "/sessions/:id/ws",
      { websocket: true },
      (socket, req) => {
        const id = req.params.id;
        const session = sessions.get(id);
        if (!session) {
          socket.close(1008, "session not found");
          return;
        }
        const set = sockets.get(id) ?? new Set<WebSocket>();
        set.add(socket);
        sockets.set(id, set);
        send(socket, {
          type: "session.snapshot",
          session,
          segments: segments.get(id) ?? [],
        });
        socket.on("close", () => set.delete(socket));
      },
    );
  });
  function broadcast(id: string, event: ClientEvent) {
    sockets.get(id)?.forEach((socket) => send(socket, event));
  }
  function send(socket: WebSocket, event: ClientEvent) {
    if (socket.readyState === 1) socket.send(JSON.stringify(event));
  }
  function time(ms: number, srt = false) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${srt ? "," : "."}${String(millis).padStart(3, "0")}`;
  }
  return app;
}
const port = Number(process.env.API_PORT ?? 3000);
if (process.env.NODE_ENV !== "test" && !process.argv.includes("--test")) {
  const app = buildApp();
  app.listen({ port, host: process.env.API_HOST ?? "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

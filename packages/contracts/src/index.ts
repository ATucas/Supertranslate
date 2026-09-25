export type SessionStatus = "active" | "ended";
export interface Session {
  id: string;
  title: string;
  createdAt: string;
  status: SessionStatus;
}
export interface CreateSessionInput {
  title: string;
}
export interface SubtitleSegment {
  id: string;
  sessionId: string;
  sequence: number;
  source: string;
  translation: string;
  startMs: number;
  endMs: number;
  final: boolean;
}
export interface SessionMetrics {
  provider: "simulated" | "gemini";
  latencyMs: number;
  chunksProcessed: number;
  errors: number;
  updatedAt: string;
}
export type ClientEvent =
  | { type: "session.snapshot"; session: Session; segments: SubtitleSegment[] }
  | { type: "subtitle.segment"; segment: SubtitleSegment }
  | {
      type: "subtitle.interim";
      sessionId: string;
      source: string;
      translation: string;
    }
  | { type: "session.status"; status: SessionStatus }
  | { type: "session.metrics"; metrics: SessionMetrics }
  | { type: "error"; message: string };
export type ServerEvent = {
  type: "subtitle.segment";
  segment: SubtitleSegment;
};
export const isCreateSessionInput = (
  value: unknown,
): value is CreateSessionInput =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { title?: unknown }).title === "string" &&
  (value as { title: string }).title.trim().length > 0;

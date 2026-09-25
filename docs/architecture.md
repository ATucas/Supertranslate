# Architecture

The repository uses npm workspaces with strict TypeScript:

- **packages/contracts** contains the session model and the WebSocket event union shared by every runtime.
- **packages/providers** defines `SubtitleProvider` and includes `SimulatedProvider`, which emits reproducible bilingual segments. A future Gemini provider can implement this interface without changing the API or UI.
- **apps/api** is a Fastify HTTP/WebSocket service. It keeps sessions and segments in memory, exposes CRUD, and broadcasts events to clients subscribed to `/sessions/:id/ws`. The worker-only event ingestion route is namespaced under `/internal`.
- **apps/worker** polls active sessions and streams provider output to the API. This keeps provider credentials out of the browser.
- **apps/web** is a Vite React audience client. It lists sessions, opens one WebSocket, and renders source and translated lines.

The MVP deliberately has no persistence, authentication, or external provider. Production work should add durable storage, authenticated worker ingestion, reconnect/backoff, observability, and a real provider adapter.

# Architecture

The MVP is a TypeScript workspace with independent API, worker, and audience
web applications.

## Providers and audio

`@subtitle/providers` defines the `SubtitleProvider` contract and contains:

- `SimulatedProvider`: deterministic mock used by tests and offline demos.
- `VideoDemoProvider`: validates a local video path and uses the mock provider.
- `FfmpegAudioSource`: runs FFmpeg, normalizes a video to mono signed 16-bit
  PCM at 16 kHz, and yields approximately 100 ms chunks.
- `GeminiLiveProvider`: uses the official `@google/genai` Live API for
  incremental audio transcription. Finalized input captions are translated
  with Gemini Flash and emitted through the same subtitle contract.

Only the worker receives `GEMINI_API_KEY`; the browser bundle has no provider
credentials. Gemini sessions are stateful per active stream, so the worker can
process multiple active sessions concurrently. The documented Live API
transcription session limit is ten minutes; longer production streams need
session rotation and overlap buffering.

## Events and observability

The API stores in-memory sessions and subtitle segments and fans out:

- `session.snapshot` on WebSocket connection.
- `subtitle.segment` for interim/final bilingual captions.
- `session.metrics` with provider, chunk count, errors, and timestamps.

Production users can download `vtt`, `srt`, or `txt` exports from the API. The
audience UI includes a production/latency panel and export links. State is
ephemeral in this increment and should be replaced with durable storage for
multi-instance deployment.

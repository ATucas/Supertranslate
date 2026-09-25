# Architecture

The repository uses npm workspaces with strict TypeScript:

- **packages/contracts** contains the session model and the WebSocket event union shared by every runtime.
- **packages/providers** defines `SubtitleProvider` and includes `SimulatedProvider`, which emits reproducible bilingual segments. A future Gemini provider can implement this interface without changing the API or UI.
- **apps/api** is a Fastify HTTP/WebSocket service. It keeps sessions and segments in memory, exposes CRUD, and broadcasts events to clients subscribed to `/sessions/:id/ws`. The worker-only event ingestion route is namespaced under `/internal`.
- **apps/worker** polls active sessions and streams provider output to the API. This keeps provider credentials out of the browser.
- **apps/web** is a Vite React audience client. It lists sessions, opens one WebSocket, and renders source and translated lines.

The MVP deliberately has no persistence, authentication, or external provider. Production work should add durable storage, authenticated worker ingestion, reconnect/backoff, observability, and a real provider adapter.

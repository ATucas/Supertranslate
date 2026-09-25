# Subtitle Audience

A TypeScript monorepo MVP for live bilingual subtitles. The API owns in-memory sessions and broadcasts subtitle events over WebSockets; a worker drives a deterministic simulated provider. The provider interface is intentionally ready for a future Gemini adapter, but this MVP has no external AI integration.

## Quick start

```bash
cp .env.example .env
npm install
npm run build
npm run test
# terminal 1
npm --workspace @subtitle/api start
# terminal 2
npm --workspace @subtitle/worker start
# terminal 3
npm --workspace @subtitle/web dev
```

Create a session (`curl -X POST localhost:3000/sessions -H 'content-type: application/json' -d '{"title":"Demo"}'`), then open the web app and select it. The worker discovers active sessions and emits four deterministic segments. Data is in-memory and resets when the API restarts.

Docker Compose starts all three services: `docker compose up --build`.

See [architecture](docs/architecture.md) and [deployment](docs/deployment.md).

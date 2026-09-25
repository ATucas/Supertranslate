# Repo para participar en un concurso


Un MVP de monorepo en TypeScript para subtítulos bilingües en tiempo real. La API gestiona sesiones en memoria y transmite eventos de subtítulos mediante WebSockets; el *worker* puede utilizar un proveedor simulado determinista o el adaptador real de Gemini.

El *worker* ahora también incluye un adaptador real para Gemini Live. Con la configuración adecuada de `GEMINI_API_KEY`, `DEMO_VIDEO_PATH` y FFmpeg, extrae fragmentos PCM a 16 kHz y los envía incrementalmente a Gemini para su transcripción en el idioma original; cada subtítulo finalizado se traduce al español utilizando el SDK oficial de Google Gen AI. Si no se dispone de dicha configuración, el proveedor simulado sigue estando disponible para pruebas y demostraciones sin conexión

## Requerimientos

- Node.js 22 or newer and npm 10 or newer for local development.
- Docker Engine 24 or newer and Docker Compose v2 for the containerized deployment.

## Inicio Rapido

The lockfile makes the local install reproducible:

```bash
cp .env.example .env
npm ci
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
For evaluation evidence, the real-demo script, and known gaps, see
[docs/evaluation.md](docs/evaluation.md) and [docs/demo.md](docs/demo.md).

## License freeeeee

This project is licensed under the Apache License, Version 2.0. See
[LICENSE](LICENSE) for the complete official license text. The SPDX identifier
for this project is `Apache-2.0`.

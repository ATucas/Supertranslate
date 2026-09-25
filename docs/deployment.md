# Deployment

The commands below are intended to be reproducible for a third party starting
from a clean checkout. The repository includes `package-lock.json`; use
`npm ci` rather than `npm install` when installing locally. No API keys or
provider credentials are needed for this MVP.

## Local

Install Node.js 22+ and npm 10+, then run:

```bash
cp .env.example .env
npm ci
npm run build
npm run test
```

Start the API, worker, and web in separate terminals:

```bash
npm --workspace @subtitle/api start
npm --workspace @subtitle/worker start
npm --workspace @subtitle/web dev
```

Open `http://localhost:5173`. Create a session with the API, then select it in
the web UI:

```bash
curl -X POST http://localhost:3000/sessions \
  -H 'content-type: application/json' \
  -d '{"title":"Demo"}'
```

`API_URL` controls worker-to-API communication; `VITE_API_URL` can point the
browser at a remote API at build time.

## Docker Compose

Copy `.env.example` to `.env` and run:

```bash
docker compose build
docker compose up
```

The API is exposed on port 3000, the web UI on 5173, and the worker talks to the API over the Compose network. Compose waits for the API health check before starting the worker and web services. The API has no database volume because session state is intentionally ephemeral in this increment.

Verify the deployment from another terminal:

```bash
curl --fail http://localhost:3000/health
curl --fail http://localhost:5173/
```

Stop the deployment with `Ctrl-C`, or run `docker compose down` from another
terminal. Rebuilding with `docker compose build --pull` refreshes the base
images; dependency versions are resolved from the committed npm lockfile during
each image build.

Do not put provider credentials in frontend environment variables. When a real provider is added, configure its secret only on the worker service (prefer a secret manager in production).

## Video demo evidence

The repository does not include the supplied MP4. Run the demo with the
attachment or another local video path:

```bash
npm run demo:video -- \
  /home/tuki/.copilot/attachments/1942f253-a669-4a07-a82c-0be0c9d0c986-istockphoto-1449608579-640_adpp_is.mp4 \
  demo-output
```

This creates `subtitles.vtt`, `subtitles.srt`, `subtitles.txt`, and a README in
`demo-output/`. If `ffmpeg` is installed, it also creates `audio.wav` as mono
16 kHz normalized audio. Without FFmpeg, the evidence explicitly records that
audio was not extracted. The current provider is simulated, so its bilingual
captions are deliberately marked as simulated and are not claimed to be
transcriptions or translations of the MP4 audio.

For real incremental Gemini transcription/translation, install FFmpeg and
provide the key only to the worker:

```bash
GEMINI_API_KEY=... \
DEMO_VIDEO_PATH=/absolute/path/video.mp4 \
GEMINI_TARGET_LANGUAGE=es \
npm --workspace @subtitle/worker start
```

The worker uses the official `@google/genai` Live API, sends mono signed
16-bit 16 kHz PCM in approximately 100 ms chunks, and emits finalized
original-language text plus Spanish translations through the existing API
WebSocket. Gemini Live transcription is real, but requires a valid API key and
has a documented ten-minute session limit; this implementation does not claim
offline transcription when the key or FFmpeg is unavailable. The translation
call uses the same official SDK with a text translation request per finalized
caption to keep the UI contract bilingual.

Required public configuration:

| Variable                 | Service     | Purpose                                                        |
| ------------------------ | ----------- | -------------------------------------------------------------- |
| `GEMINI_API_KEY`         | worker only | Google AI authentication; never expose to Vite/browser         |
| `GEMINI_LIVE_MODEL`      | worker      | Live transcription model, default `gemini-3.5-transcribe-live` |
| `GEMINI_TARGET_LANGUAGE` | worker      | Translation target, default `es`                               |
| `DEMO_VIDEO_PATH`        | worker      | Absolute local video path for FFmpeg                           |

To show the same demo flow in the audience UI, start the API, create an active
session, then start the worker with the source path:

```bash
DEMO_VIDEO_PATH=/path/to/video.mp4 API_URL=http://localhost:3000 \
  npm --workspace @subtitle/worker start
```

The worker validates that the source exists before emitting the existing
WebSocket subtitle events. A future speech-to-text provider can replace
`VideoDemoProvider` without changing the contracts or API.

## License

The project is distributed under the Apache License, Version 2.0. The complete
license text is in the repository root at [LICENSE](../LICENSE); the SPDX
identifier is `Apache-2.0`.

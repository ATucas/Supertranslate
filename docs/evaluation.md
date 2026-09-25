# Evaluation evidence and limits

This document records what is implemented and what was actually verified in
the build window **2026-09-24 through 2026-09-25 (UTC)**. It does not claim
history before that window. The repository commits made during the window can
be inspected with:

```bash
git log --format='%h %aI %s' --all
```

The relevant commits are `54f1d3e` (MVP), `985a9a8` (license/deployment),
`9112d05` (video demo), and the current Gemini/evaluation commit. Their commit
timestamps are the auditable evidence for this implementation window.

## Compliance matrix

| Criterion                               | Evidence                                                        | Status / gap                                                                  |
| --------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Audio/video file source                 | `FfmpegAudioSource`, `DEMO_VIDEO_PATH`, `scripts/demo-real.sh`  | Implemented; requires FFmpeg at runtime                                       |
| Real original-language transcription    | Gemini Live adapter using `@google/genai`                       | Implemented in code; not live-verified because no API key was available       |
| Real EN→ES translation                  | Gemini Flash request per finalized caption, default target `es` | Implemented in code; not live-verified without credentials                    |
| Visible subtitles                       | React audience UI, WebSocket events, VTT/SRT/TXT exports        | Verified with mock API/worker smoke                                           |
| Two simultaneous sessions               | `scripts/smoke-two-sessions.mjs`                                | API isolation verified; independent Gemini streams require runtime key/FFmpeg |
| 5/10+ scale guidance                    | Deployment section below                                        | Guidance only; no load test or persistence in this MVP                        |
| Public credentials/models documentation | README, `.env.example`, deployment docs                         | Implemented; key is worker-only                                               |
| License                                 | Complete official Apache-2.0 text in `LICENSE`                  | Verified byte-for-byte previously                                             |
| 1–2 minute demo procedure               | `docs/demo.md` and `scripts/demo-real.sh`                       | Reproducible procedure; real output requires a key                            |
| Devpost submission                      | Placeholder checklist below                                     | Human submission step remains                                                 |

## Mock versus real

Mock evidence is deterministic and safe to run without credentials:

```bash
npm ci
npm run build
npm run test
npm run demo:video -- /path/to/video.mp4 demo-output
API_URL=http://localhost:3000 node scripts/smoke-two-sessions.mjs
```

The mock captions are explicitly labeled and are not derived from audio.
Real captions require the Gemini configuration in `docs/deployment.md`.
Without a successful authenticated run, no real transcription or translation
result should be presented as verified.

## Scale guidance

For 5–10+ concurrent sessions, run one worker process per source/session or
use a supervisor that assigns sessions across workers. Set connection and
process limits, monitor `session.metrics`, cap FFmpeg/Gemini concurrency, and
replace the API's in-memory maps with durable storage plus a pub/sub fanout
before using multiple API replicas. This repository does not include a
production load test and does not claim 10-session throughput.

## Devpost checklist

- [ ] Run a credentialed real demo and keep the resulting VTT/TXT evidence.
- [ ] Record a 1–2 minute screen capture following `docs/demo.md`.
- [ ] Confirm the public repository URL and Apache-2.0 license.
- [ ] Add the final demo URL and repository URL to Devpost.
- [ ] Submit before **2026-09-25 15:00** (local contest deadline).

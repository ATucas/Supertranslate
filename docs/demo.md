# Two-minute demo procedure

This is a script for a 1–2 minute recording. Use a local MP4 with audible
speech; do not commit the media file.

## Real Gemini recording

1. Install Node.js 22+, FFmpeg, and dependencies with `npm ci`.
2. Set `GEMINI_API_KEY` only in the worker shell and set `DEMO_VIDEO_PATH` to
   the MP4. Use `scripts/demo-real.sh` as the command card.
3. Start API, worker, and web. Create two sessions with the API; select the
   first in the browser and show original text plus Spanish translation as
   they arrive.
4. Show the production panel (provider, chunks, errors), switch to the second
   session, and demonstrate that its WebSocket stream is independent.
5. Download VTT or SRT from the export links and open it briefly.
6. State on camera that the result is Gemini-backed only when the worker has a
   valid key; otherwise use the mock flow and label it as mock.

Optional: enable English captions in the recording tool. Those are recording
captions, not a Supertranslate product output.

## No-credential rehearsal

Run `npm run demo:video -- /path/to/video.mp4 demo-output`, use the API/worker
mock, and show the generated VTT/SRT/TXT. The evidence is intentionally marked
“simulated provider demo (not audio transcription)”; do not describe it as
real audio translation.

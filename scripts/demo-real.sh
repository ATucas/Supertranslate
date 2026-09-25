#!/usr/bin/env bash
set -euo pipefail

: "${GEMINI_API_KEY:?Set GEMINI_API_KEY in the worker environment}"
: "${DEMO_VIDEO_PATH:?Set DEMO_VIDEO_PATH to a local video file}"

API_URL="${API_URL:-http://localhost:3000}"
LANGUAGE="${GEMINI_TARGET_LANGUAGE:-es}"

echo "Starting the API and web app in separate terminals is required."
echo "Create a session with:"
echo "  curl -X POST ${API_URL}/sessions -H 'content-type: application/json' -d '{\"title\":\"Gemini real demo\"}'"
echo
echo "Start the real worker:"
echo "  GEMINI_API_KEY=*** DEMO_VIDEO_PATH=${DEMO_VIDEO_PATH} GEMINI_TARGET_LANGUAGE=${LANGUAGE} API_URL=${API_URL} npm --workspace @subtitle/worker start"
echo
echo "Open http://localhost:5173, select 'Gemini real demo', and observe finalized original text plus Spanish translations."
echo "Export after the run:"
echo "  curl ${API_URL}/sessions/<SESSION_ID>/export/vtt -o demo-output/real.vtt"

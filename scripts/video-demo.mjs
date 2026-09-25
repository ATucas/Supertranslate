#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";

const inputArgument = process.argv[2];
const input = inputArgument ? resolve(inputArgument) : "";
const output = resolve(process.argv[3] ?? "demo-output");
if (!input || !existsSync(input)) {
  console.error("Usage: npm run demo:video -- /path/to/video.mp4 [output-dir]");
  process.exit(1);
}

await mkdir(output, { recursive: true });
const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
const audioPath = resolve(output, "audio.wav");
let audioStatus;
if (ffmpeg.status === 0) {
  const extraction = spawnSync(
    "ffmpeg",
    ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", audioPath],
    { stdio: "inherit" },
  );
  audioStatus =
    extraction.status === 0
      ? "Audio extracted and normalized to mono 16 kHz WAV."
      : "FFmpeg was found, but audio extraction failed.";
} else {
  audioStatus =
    "FFmpeg is unavailable; no audio was extracted and no audio transcription was generated.";
}

const cues = [
  [
    "00:00:00.000",
    "00:00:03.000",
    "Demo caption (simulated)",
    "Subtítulo de demo (simulado)",
  ],
  [
    "00:00:03.000",
    "00:00:06.000",
    "Not transcribed from the video audio",
    "No transcrito del audio del video",
  ],
  [
    "00:00:06.000",
    "00:00:09.000",
    "Replace with a real provider for transcription",
    "Reemplaza el proveedor para transcribir",
  ],
];
const vtt = [
  "WEBVTT",
  "",
  "NOTE Supertranslate video demo",
  "NOTE These captions are simulated and are not derived from the source audio.",
  "",
  ...cues.flatMap(([start, end, source, translation], index) => [
    `${index + 1}`,
    `${start} --> ${end}`,
    `${source}`,
    `${translation}`,
    "",
  ]),
].join("\n");
const srt = cues
  .map(
    ([start, end, source, translation], index) =>
      `${index + 1}\n${start.replace(".", ",")} --> ${end.replace(".", ",")}\n${source}\n${translation}\n`,
  )
  .join("\n");
const txt = [
  `Source video: ${basename(input)}`,
  "Mode: simulated provider demo (not audio transcription)",
  `Audio: ${audioStatus}`,
  "",
  ...cues.map(([, , source, translation]) => `${source} / ${translation}`),
  "",
  "Run the API and worker with DEMO_VIDEO_PATH set to the source video, then select the active session in the web UI.",
].join("\n");

await writeFile(resolve(output, "subtitles.vtt"), vtt);
await writeFile(resolve(output, "subtitles.srt"), srt);
await writeFile(resolve(output, "subtitles.txt"), txt);
await writeFile(
  resolve(output, "README.txt"),
  [
    "Supertranslate video demo evidence",
    "",
    "The source video is intentionally not copied into the repository.",
    `Input: ${input}`,
    `Audio status: ${audioStatus}`,
    "",
    "The subtitle files are simulated provider output. They are visibly labeled and must not be treated as a transcription or translation of the video's audio.",
  ].join("\n"),
);
console.log(`Wrote demo evidence to ${output}`);

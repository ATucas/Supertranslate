import type { SubtitleSegment } from "@subtitle/contracts";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { GoogleGenAI, Modality } from "@google/genai";
import { createInterface } from "node:readline";
export interface SubtitleProvider {
  stream(
    sessionId: string,
    onSegment: (segment: SubtitleSegment) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void>;
}
export interface AudioChunk {
  data: Buffer;
  timestampMs: number;
}
export interface AudioSource {
  stream(signal?: AbortSignal): AsyncGenerator<AudioChunk>;
}
export class FfmpegAudioSource implements AudioSource {
  constructor(
    private readonly videoPath: string,
    private readonly chunkMs = 100,
  ) {}
  async *stream(signal?: AbortSignal): AsyncGenerator<AudioChunk> {
    const child = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      this.videoPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "s16le",
      "pipe:1",
    ]);
    const kill = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", kill, { once: true });
    let timestampMs = 0;
    const bytesPerChunk = 16000 * 2 * (this.chunkMs / 1000);
    let pending = Buffer.alloc(0);
    try {
      for await (const chunk of child.stdout) {
        pending = Buffer.concat([pending, chunk as Buffer]);
        while (pending.length >= bytesPerChunk) {
          yield {
            data: pending.subarray(0, bytesPerChunk),
            timestampMs,
          };
          pending = pending.subarray(bytesPerChunk);
          timestampMs += this.chunkMs;
        }
      }
      if (pending.length > 0) yield { data: pending, timestampMs };
      const exitCode = await new Promise<number>((resolve) =>
        child.once("close", (code) => resolve(code ?? 1)),
      );
      if (exitCode !== 0 && !signal?.aborted)
        throw new Error(`ffmpeg exited with code ${exitCode}`);
    } finally {
      signal?.removeEventListener("abort", kill);
      if (!child.killed) child.kill("SIGTERM");
    }
  }
}
const phrases: readonly [string, string][] = [
  ["Welcome to the show", "Bienvenidos al programa"],
  ["Live captions are arriving", "Los subtítulos llegan en directo"],
  ["This provider is deterministic", "Este proveedor es determinista"],
  ["Thanks for watching", "Gracias por mirar"],
];
export class SimulatedProvider implements SubtitleProvider {
  constructor(private readonly intervalMs = 700) {}
  async stream(
    sessionId: string,
    onSegment: (segment: SubtitleSegment) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    for (let sequence = 0; sequence < phrases.length; sequence++) {
      if (signal?.aborted) return;
      await new Promise<void>((resolve) =>
        setTimeout(resolve, this.intervalMs),
      );
      const pair = phrases[sequence];
      if (!pair) return;
      const [source, translation] = pair;
      await onSegment({
        id: `${sessionId}-${sequence}`,
        sessionId,
        sequence,
        source,
        translation,
        startMs: sequence * 3000,
        endMs: (sequence + 1) * 3000,
        final: true,
      });
    }
  }
}

export class VideoDemoProvider implements SubtitleProvider {
  private readonly simulated: SimulatedProvider;

  constructor(
    private readonly videoPath: string,
    intervalMs = 700,
  ) {
    this.simulated = new SimulatedProvider(intervalMs);
  }

  async stream(
    sessionId: string,
    onSegment: (segment: SubtitleSegment) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    await access(this.videoPath);
    return this.simulated.stream(sessionId, onSegment, signal);
  }
}

export class GeminiLiveProvider implements SubtitleProvider {
  constructor(
    private readonly apiKey: string,
    private readonly source: AudioSource,
    private readonly model = "gemini-3.5-transcribe-live",
    private readonly targetLanguage = "es",
  ) {}

  async stream(
    sessionId: string,
    onSegment: (segment: SubtitleSegment) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    let sequence = 0;
    let sourceText = "";
    const session = await ai.live.connect({
      model: this.model,
      config: {
        responseModalities: [Modality.TEXT],
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: async (message) => {
          const content = message.serverContent;
          const input = content?.inputTranscription?.text;
          const interim = (
            content as unknown as {
              interimInputTranscription?: { text?: string };
            }
          ).interimInputTranscription?.text;
          if (input) sourceText += input;
          const text = input ?? interim;
          if (!text) return;
          const translation = await this.translate(text);
          await onSegment({
            id: `${sessionId}-${sequence}`,
            sessionId,
            sequence: sequence++,
            source: input ? sourceText : text,
            translation,
            startMs: 0,
            endMs: 0,
            final: Boolean(input),
          });
        },
        onerror: (error) => {
          throw new Error(`Gemini Live error: ${String(error)}`);
        },
      },
    });
    try {
      for await (const chunk of this.source.stream(signal)) {
        if (signal?.aborted) break;
        session.sendRealtimeInput({
          audio: {
            data: chunk.data.toString("base64"),
            mimeType: "audio/pcm;rate=16000",
          },
        });
      }
      session.sendRealtimeInput({ audioStreamEnd: true });
    } finally {
      session.close();
    }
  }

  private async translate(text: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate this subtitle to ${this.targetLanguage}. Return only the translation:\n${text}`,
    });
    return response.text?.trim() ?? "";
  }
}

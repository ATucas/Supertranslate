import type { SubtitleSegment } from "@subtitle/contracts";
import { access } from "node:fs/promises";
export interface SubtitleProvider {
  stream(
    sessionId: string,
    onSegment: (segment: SubtitleSegment) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void>;
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

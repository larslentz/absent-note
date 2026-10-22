import type { Midi } from "@tonejs/midi";
import {
  harmonicFrequency,
  harmonicOffset,
  harmonicWeight,
  midiToFrequency,
  weightFromDecibels,
} from "./math";
import type { HarmonicSelectionPlan } from "./harmonic-selection";
import { sourceEventId } from "./harmonic-selection";
import type { RangePolicy } from "./math";

export type PreviewVariant = "absent" | "original" | "reference";
export type PreviewOptions = {
  tracks: number[];
  harmonics: number[];
  alpha: number;
  a4: number;
  variant: PreviewVariant;
  soloHarmonic?: number | null;
  mutedHarmonics?: number[];
  gain?: number;
  includeSustain?: boolean;
  loop?: boolean;
  loopStartSec?: number;
  loopEndSec?: number;
  selectionPlan?: HarmonicSelectionPlan;
  customDb?: Record<number, number>;
  normalization?: "off" | "sum-squares";
  rangePolicy?: RangePolicy;
  flattenDynamics?: boolean;
  globalVelocityScale?: number;
};

export type PreviewVoice = {
  frequency: number;
  start: number;
  duration: number;
  amplitude: number;
  harmonic: number;
  sourceNote: number;
};

export function buildPreviewVoices(midi: Midi, options: PreviewOptions) {
  const selectedTracks = new Set(options.tracks);
  const getWeight = (harmonic: number) => {
    const customDb = options.customDb?.[harmonic];
    return customDb === undefined
      ? harmonicWeight(harmonic, options.alpha)
      : weightFromDecibels(customDb);
  };
  const voices: PreviewVoice[] = [];
  midi.tracks.forEach((track, trackIndex) => {
    if (!selectedTracks.has(trackIndex)) return;
    for (const [noteIndex, note] of track.notes.entries()) {
      const dynamics = Math.min(1, (options.flattenDynamics ? 90 / 127 : note.velocity) * (options.globalVelocityScale ?? 1));
      if (options.variant === "original") {
        voices.push({
          frequency: midiToFrequency(note.midi, options.a4),
          start: note.time,
          duration: note.duration,
          amplitude: dynamics * (options.gain ?? 1),
          harmonic: 1,
          sourceNote: note.midi,
        });
        continue;
      }
      const eventId = sourceEventId(trackIndex, note, noteIndex);
      const requestedHarmonics =
        options.selectionPlan?.selections[eventId] ?? options.harmonics;
      const invalid =
        requestedHarmonics.some(
          (harmonic) => note.midi + harmonicOffset(harmonic).semitones > 127,
        );
      if (invalid && options.rangePolicy === "drop-source") continue;
      const eventHarmonics = requestedHarmonics.filter(
        (harmonic) => note.midi + harmonicOffset(harmonic).semitones <= 127,
      );
      const eventWeights = eventHarmonics.map(getWeight);
      const sumSquares = Math.sqrt(
        eventWeights.reduce((sum, weight) => sum + weight * weight, 0),
      );
      for (const harmonic of eventHarmonics) {
        if (options.mutedHarmonics?.includes(harmonic)) continue;
        if (options.soloHarmonic && options.soloHarmonic !== harmonic) continue;
        const weight = getWeight(harmonic);
        voices.push({
          frequency: harmonicFrequency(note.midi, harmonic, options.a4),
          start: note.time,
          duration: note.duration,
          amplitude: dynamics *
            weight *
            (options.gain ?? 1) /
            (options.normalization === "sum-squares" ? sumSquares || 1 : 1),
          harmonic,
          sourceNote: note.midi,
        });
      }
      if (options.variant === "reference") {
        voices.push({
          frequency: midiToFrequency(note.midi, options.a4),
          start: note.time,
          duration: note.duration,
          amplitude: dynamics * 0.08 * (options.gain ?? 1),
          harmonic: 1,
          sourceNote: note.midi,
        });
      }
    }
  });
  if (options.loopStartSec !== undefined || options.loopEndSec !== undefined) {
    const selectionStart = Math.max(0, options.loopStartSec ?? 0);
    const selectionEnd = Math.max(
      selectionStart,
      options.loopEndSec ?? midi.duration,
    );
    return voices
      .filter(
        (voice) =>
          voice.start < selectionEnd &&
          voice.start + voice.duration > selectionStart,
      )
      .map((voice) => {
        const noteStart = Math.max(voice.start, selectionStart);
        const noteEnd = Math.min(
          voice.start + voice.duration,
          selectionEnd,
        );
        return {
          ...voice,
          start: noteStart - selectionStart,
          duration: noteEnd - noteStart,
        };
      });
  }
  return voices;
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor {
  const constructor = window.AudioContext;
  if (!constructor) throw new Error("Web Audio is not available in this browser.");
  return constructor;
}

function scheduleVoices(
  context: BaseAudioContext,
  voices: PreviewVoice[],
  startAt: number,
  masterGain: GainNode,
) {
  const oscillators: OscillatorNode[] = [];
  for (const voice of voices) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = startAt + voice.start;
    const end = start + Math.max(0.02, voice.duration);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(voice.frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(
      Math.max(0.0001, voice.amplitude),
      start + 0.012,
    );
    envelope.gain.setValueAtTime(
      Math.max(0.0001, voice.amplitude),
      Math.max(start + 0.013, end - 0.045),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, end + 0.055);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(end + 0.06);
    oscillators.push(oscillator);
  }
  return oscillators;
}

export async function playPreview(midi: Midi, options: PreviewOptions) {
  const AudioContextClass = getAudioContextConstructor();
  const context = new AudioContextClass();
  await context.resume();
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(1, options.gain ?? 0.72));
  master.connect(context.destination);
  const voices = buildPreviewVoices(midi, {
    ...options,
    gain: 1,
  });
  const startAt = context.currentTime + 0.05;
  const oscillators: OscillatorNode[] = [];
  let loopTimer: number | undefined;
  const scheduleCycle = (cycleStart: number) => {
    oscillators.push(...scheduleVoices(context, voices, cycleStart, master));
  };
  scheduleCycle(startAt);
  const cycleDuration = Math.max(
    0,
    ...voices.map((voice) => voice.start + voice.duration),
  );
  if (options.loop && cycleDuration > 0) {
    let nextCycleStart = startAt + cycleDuration;
    loopTimer = window.setInterval(() => {
      while (nextCycleStart < context.currentTime + 1.5) {
        scheduleCycle(nextCycleStart);
        nextCycleStart += cycleDuration;
      }
    }, 250);
  }
  const duration = options.loop ? Number.POSITIVE_INFINITY : cycleDuration + 0.1;
  let stopped = false;
  return {
    duration,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (loopTimer !== undefined) window.clearInterval(loopTimer);
      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
        } catch {
          // It may already have completed.
        }
      }
      master.disconnect();
      await context.close();
    },
  };
}

function floatTo24BitWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 3;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 24, true);
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    let value = Math.round(clamped * 0x7fffff);
    if (value < 0) value += 0x1000000;
    view.setUint8(offset, value & 0xff);
    view.setUint8(offset + 1, (value >> 8) & 0xff);
    view.setUint8(offset + 2, (value >> 16) & 0xff);
    offset += bytesPerSample;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function renderPreviewWav(
  midi: Midi,
  options: PreviewOptions,
  sampleRate = 48_000,
) {
  const voices = buildPreviewVoices(midi, { ...options, gain: 1 });
  const duration =
    Math.max(0, ...voices.map((voice) => voice.start + voice.duration + 0.2)) ||
    0.2;
  const OfflineContext = window.OfflineAudioContext;
  if (!OfflineContext) {
    throw new Error("Offline WAV rendering is not available in this browser.");
  }
  const context = new OfflineContext(1, Math.ceil(duration * sampleRate), sampleRate);
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(1, options.gain ?? 0.72));
  master.connect(context.destination);
  scheduleVoices(context, voices, 0, master);
  const rendered = await context.startRendering();
  return floatTo24BitWav(rendered.getChannelData(0), sampleRate);
}

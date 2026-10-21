export type HarmonicOffset = {
  harmonic: number;
  semitones: number;
  cents: number;
};

export type PitchBend = {
  value14Bit: number;
  signed: number;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function midiToFrequency(note: number, a4 = 440): number {
  if (!Number.isInteger(note) || note < 0 || note > 127) {
    throw new RangeError("MIDI note must be an integer from 0 to 127.");
  }
  if (!Number.isFinite(a4) || a4 <= 0) {
    throw new RangeError("A4 tuning must be a positive frequency.");
  }
  return a4 * 2 ** ((note - 69) / 12);
}

export function harmonicFrequency(note: number, harmonic: number, a4 = 440) {
  if (!Number.isInteger(harmonic) || harmonic < 2) {
    throw new RangeError("Harmonic must be an integer of 2 or greater.");
  }
  return harmonic * midiToFrequency(note, a4);
}

export function harmonicOffset(harmonic: number): HarmonicOffset {
  if (!Number.isInteger(harmonic) || harmonic < 2) {
    throw new RangeError("Harmonic 1 is the missing fundamental and is never output.");
  }
  const exactSemitones = 12 * Math.log2(harmonic);
  const semitones = Math.round(exactSemitones);
  return {
    harmonic,
    semitones,
    cents: 100 * (exactSemitones - semitones),
  };
}

export function pitchBendForCents(cents: number, rangeSemitones = 2): PitchBend {
  if (!Number.isFinite(cents)) throw new RangeError("Pitch correction must be finite.");
  if (
    !Number.isFinite(rangeSemitones) ||
    rangeSemitones < 1 ||
    rangeSemitones > 24
  ) {
    throw new RangeError("Pitch-bend range must be between 1 and 24 semitones.");
  }
  const value14Bit = clamp(
    Math.round(8192 + (8192 * cents) / (100 * rangeSemitones)),
    0,
    16383,
  );
  return { value14Bit, signed: value14Bit - 8192 };
}

export function harmonicWeight(harmonic: number, alpha: number): number {
  if (!Number.isInteger(harmonic) || harmonic < 2) {
    throw new RangeError("Harmonic must be an integer of 2 or greater.");
  }
  if (!Number.isFinite(alpha) || alpha < 0) {
    throw new RangeError("Weighting alpha must be a non-negative number.");
  }
  return (2 / harmonic) ** alpha;
}

export function weightFromDecibels(decibels: number): number {
  if (!Number.isFinite(decibels)) {
    throw new RangeError("Layer gain must be a finite decibel value.");
  }
  return 10 ** (decibels / 20);
}

export function layerLevelDb(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new RangeError("Harmonic weight must be a positive number.");
  }
  return 20 * Math.log10(weight);
}

export function bakedVelocity(
  sourceVelocity: number,
  weight: number,
  gamma = 2,
  globalScale = 1,
): number {
  if (!Number.isFinite(sourceVelocity)) {
    throw new RangeError("Source velocity must be finite.");
  }
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new RangeError("Harmonic weight must be positive.");
  }
  if (!Number.isFinite(gamma) || gamma < 1 || gamma > 3) {
    throw new RangeError("Velocity gamma must be between 1 and 3.");
  }
  if (!Number.isFinite(globalScale) || globalScale <= 0) {
    throw new RangeError("Global velocity scale must be positive.");
  }
  return clamp(
    Math.round(sourceVelocity * globalScale * weight ** (1 / gamma)),
    1,
    127,
  );
}

export function midiChannelForHarmonicIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index > 14) {
    throw new RangeError("Harmonic layer index must be between 0 and 14.");
  }
  // MIDI channels are zero-based in SMF data; channel 9 is the GM drum channel.
  return index < 9 ? index : index + 1;
}

export type RangePolicy = "skip-harmonic" | "drop-source";
export type RangeResult =
  | { keepSource: true; outputNote: number }
  | { keepSource: false; reason: "out-of-range" };

export function applyRangePolicy(
  sourceNote: number,
  semitoneOffset: number,
  policy: RangePolicy,
): RangeResult {
  const outputNote = sourceNote + semitoneOffset;
  if (outputNote >= 0 && outputNote <= 127) {
    return { keepSource: true, outputNote };
  }
  return policy === "drop-source"
    ? { keepSource: false, reason: "out-of-range" }
    : { keepSource: false, reason: "out-of-range" };
}

import { Midi } from "@tonejs/midi";
import { midiToFrequency } from "./math";

export type CalibrationScheduleNote = {
  key: number;
  velocity: number;
  startSec: number;
  durationSec: number;
  silenceSec: number;
};

export type CalibrationSchedule = {
  version: 1;
  sampleRate: number;
  click: { key: number; startSec: number; durationSec: number };
  notes: CalibrationScheduleNote[];
};

export type CalibrationMeasurement = {
  key: number;
  velocity: number;
  wholeAttackDb: number;
  wholeSustainDb: number;
  fundamentalAttackDb: number;
  fundamentalSustainDb: number;
  measuredFrequency: number;
  tuningCents: number;
  decayDbPerSecond: number;
  spectralCentroid: number;
  onsetSec: number;
};

export type CalibrationProfile = {
  id: string;
  name: string;
  createdAt: string;
  measurements: CalibrationMeasurement[];
};

export type CalibrationWindows = {
  attackStartSec: number;
  attackEndSec: number;
  sustainStartSec: number;
  sustainEndSec: number;
};

export const DEFAULT_CALIBRATION_VELOCITIES = [32, 48, 64, 80, 96, 112];
export const DEFAULT_CALIBRATION_WINDOWS: CalibrationWindows = {
  attackStartSec: 0,
  attackEndSec: 0.15,
  sustainStartSec: 0.3,
  sustainEndSec: 1.5,
};

export function createCalibrationSchedule(
  keys: number[],
  velocities = DEFAULT_CALIBRATION_VELOCITIES,
  options: {
    durationSec?: number;
    silenceSec?: number;
    countInSec?: number;
    clickKey?: number;
    sampleRate?: number;
  } = {},
): CalibrationSchedule {
  if (!keys.length) throw new Error("Choose at least one piano key to measure.");
  if (keys.some((key) => !Number.isInteger(key) || key < 0 || key > 127)) {
    throw new RangeError("Calibration keys must be MIDI notes from 0 to 127.");
  }
  if (!velocities.length || velocities.some((v) => v < 1 || v > 127)) {
    throw new RangeError("Calibration velocities must be from 1 to 127.");
  }
  const durationSec = options.durationSec ?? 2;
  const silenceSec = options.silenceSec ?? 2;
  const countInSec = options.countInSec ?? 1;
  const clickKey =
    options.clickKey ??
    (keys.includes(127) ? 0 : 127);
  const notes: CalibrationScheduleNote[] = [];
  let startSec = countInSec;
  for (const key of keys) {
    for (const velocity of velocities) {
      notes.push({ key, velocity, startSec, durationSec, silenceSec });
      startSec += durationSec + silenceSec;
    }
  }
  return {
    version: 1,
    sampleRate: options.sampleRate ?? 48_000,
    click: { key: clickKey, startSec: 0, durationSec: countInSec },
    notes,
  };
}

export function createCalibrationMidi(schedule: CalibrationSchedule) {
  const midi = new Midi();
  midi.header.setTempo(120);
  const track = midi.addTrack();
  track.name = "Calibration alignment and sweep";
  track.channel = 0;
  track.addNote({
    midi: schedule.click.key,
    ticks: midi.header.secondsToTicks(schedule.click.startSec),
    durationTicks: midi.header.secondsToTicks(schedule.click.durationSec),
    velocity: 0.7,
  });
  for (const note of schedule.notes) {
    track.addNote({
      midi: note.key,
      ticks: midi.header.secondsToTicks(note.startSec),
      durationTicks: midi.header.secondsToTicks(note.durationSec),
      velocity: note.velocity / 127,
    });
  }
  return midi;
}

function rms(samples: Float32Array, start: number, end: number) {
  const first = Math.max(0, Math.floor(start));
  const last = Math.min(samples.length, Math.ceil(end));
  if (last <= first) return 0;
  let sum = 0;
  for (let index = first; index < last; index += 1) {
    sum += samples[index] * samples[index];
  }
  return Math.sqrt(sum / (last - first));
}

function db(amplitude: number) {
  return 20 * Math.log10(Math.max(amplitude, 1e-9));
}

function detectClickOnset(
  samples: Float32Array,
  sampleRate: number,
  expected: number,
  duration: number,
) {
  const step = Math.max(1, Math.floor(sampleRate * 0.005));
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.01));
  const from = Math.max(0, Math.floor((expected - 0.08) * sampleRate));
  const to = Math.min(
    samples.length - windowSize,
    Math.floor((expected + Math.min(duration, 0.25) + 0.08) * sampleRate),
  );
  let peak = 0;
  const values: { index: number; level: number }[] = [];
  for (let index = from; index <= to; index += step) {
    const level = rms(samples, index, index + windowSize);
    values.push({ index, level });
    peak = Math.max(peak, level);
  }
  const threshold = Math.max(1e-5, peak * 0.2);
  return (
    values.find((value) => value.level >= threshold)?.index ??
    Math.floor(expected * sampleRate)
  ) / sampleRate;
}

function refineOnset(
  samples: Float32Array,
  sampleRate: number,
  expected: number,
) {
  const search = Math.floor(sampleRate * 0.05);
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.01));
  const center = Math.floor(expected * sampleRate);
  let bestIndex = Math.max(0, center - search);
  let bestLevel = 0;
  for (
    let index = Math.max(0, center - search);
    index <= Math.min(samples.length - windowSize, center + search);
    index += Math.max(1, Math.floor(sampleRate * 0.002))
  ) {
    const level = rms(samples, index, index + windowSize);
    if (level > bestLevel) {
      bestLevel = level;
      bestIndex = index;
    }
  }
  return bestIndex / sampleRate;
}

function fftMagnitudes(samples: Float32Array) {
  let size = 1;
  while (size < samples.length) size <<= 1;
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  let windowSum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const window =
      samples.length <= 1
        ? 1
        : 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (samples.length - 1));
    real[index] = samples[index] * window;
    windowSum += window;
  }
  for (let index = 1, j = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (index < j) {
      [real[index], real[j]] = [real[j], real[index]];
      [imaginary[index], imaginary[j]] = [imaginary[j], imaginary[index]];
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < size; start += length) {
      let factorReal = 1;
      let factorImaginary = 0;
      for (let offset = 0; offset < length / 2; offset += 1) {
        const even = start + offset;
        const odd = even + length / 2;
        const productReal =
          factorReal * real[odd] - factorImaginary * imaginary[odd];
        const productImaginary =
          factorReal * imaginary[odd] + factorImaginary * real[odd];
        real[odd] = real[even] - productReal;
        imaginary[odd] = imaginary[even] - productImaginary;
        real[even] += productReal;
        imaginary[even] += productImaginary;
        const nextReal = factorReal * stepReal - factorImaginary * stepImaginary;
        factorImaginary =
          factorReal * stepImaginary + factorImaginary * stepReal;
        factorReal = nextReal;
      }
    }
  }
  const magnitudes = new Float64Array(size / 2);
  const scale = 2 / Math.max(1, windowSum);
  for (let index = 0; index < magnitudes.length; index += 1) {
    magnitudes[index] = Math.hypot(real[index], imaginary[index]) * scale;
  }
  return magnitudes;
}

function extractSegment(
  samples: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number,
) {
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  const end = Math.min(samples.length, Math.floor(endSec * sampleRate));
  return samples.slice(start, Math.max(start + 1, end));
}

function analyzeFundamental(
  samples: Float32Array,
  sampleRate: number,
  expectedFrequency: number,
) {
  const magnitudes = fftMagnitudes(samples);
  const resolution = sampleRate / (magnitudes.length * 2);
  const minFrequency = expectedFrequency * 2 ** (-40 / 1200);
  const maxFrequency = expectedFrequency * 2 ** (40 / 1200);
  const start = Math.max(1, Math.ceil(minFrequency / resolution));
  const end = Math.min(magnitudes.length - 2, Math.floor(maxFrequency / resolution));
  let peakIndex = start;
  for (let index = start + 1; index <= end; index += 1) {
    if (magnitudes[index] > magnitudes[peakIndex]) peakIndex = index;
  }
  const left = Math.log(Math.max(magnitudes[peakIndex - 1], 1e-14));
  const center = Math.log(Math.max(magnitudes[peakIndex], 1e-14));
  const right = Math.log(Math.max(magnitudes[peakIndex + 1], 1e-14));
  const denominator = left - 2 * center + right;
  const delta =
    denominator === 0
      ? 0
      : Math.max(-0.5, Math.min(0.5, 0.5 * (left - right) / denominator));
  const measuredFrequency = (peakIndex + delta) * resolution;
  const interpolatedMagnitude = Math.max(
    magnitudes[peakIndex],
    Math.exp(center - 0.25 * (left - right) * delta),
  );
  let total = 0;
  let centroidNumerator = 0;
  for (let index = 1; index < magnitudes.length; index += 1) {
    const frequency = index * resolution;
    const magnitude = magnitudes[index];
    if (frequency <= 8_000) {
      total += magnitude;
      centroidNumerator += frequency * magnitude;
    }
  }
  return {
    measuredFrequency,
    // The interpolated FFT peak estimates the partial's amplitude without
    // inflating it by summing adjacent Hann-window leakage bins.
    fundamentalDb: db(interpolatedMagnitude),
    spectralCentroid: total > 0 ? centroidNumerator / total : 0,
  };
}

export function analyzeCalibrationAudio(
  samples: Float32Array,
  sampleRate: number,
  schedule: CalibrationSchedule,
  options: {
    a4?: number;
    windows?: CalibrationWindows;
  } = {},
): CalibrationMeasurement[] {
  const a4 = options.a4 ?? 440;
  const windows = options.windows ?? DEFAULT_CALIBRATION_WINDOWS;
  const clickOnset = detectClickOnset(
    samples,
    sampleRate,
    schedule.click.startSec,
    schedule.click.durationSec,
  );
  const alignmentOffset = clickOnset - schedule.click.startSec;
  return schedule.notes.map((note) => {
    const predictedStart = note.startSec + alignmentOffset;
    const onsetSec = refineOnset(samples, sampleRate, predictedStart);
    const attack = extractSegment(
      samples,
      sampleRate,
      onsetSec + windows.attackStartSec,
      onsetSec + windows.attackEndSec,
    );
    const sustain = extractSegment(
      samples,
      sampleRate,
      onsetSec + windows.sustainStartSec,
      onsetSec + windows.sustainEndSec,
    );
    const expectedFrequency = midiToFrequency(note.key, a4);
    const spectral = analyzeFundamental(sustain, sampleRate, expectedFrequency);
    const early = extractSegment(samples, sampleRate, onsetSec + 0.3, onsetSec + 0.55);
    const late = extractSegment(samples, sampleRate, onsetSec + 1.3, onsetSec + 1.55);
    const earlyDb = db(rms(early, 0, early.length));
    const lateDb = db(rms(late, 0, late.length));
    return {
      key: note.key,
      velocity: note.velocity,
      wholeAttackDb: db(rms(attack, 0, attack.length)),
      wholeSustainDb: db(rms(sustain, 0, sustain.length)),
      fundamentalAttackDb: analyzeFundamental(
        attack,
        sampleRate,
        expectedFrequency,
      ).fundamentalDb,
      fundamentalSustainDb: spectral.fundamentalDb,
      measuredFrequency: spectral.measuredFrequency,
      tuningCents: 1200 * Math.log2(spectral.measuredFrequency / expectedFrequency),
      decayDbPerSecond: lateDb - earlyDb,
      spectralCentroid: spectral.spectralCentroid,
      onsetSec,
    };
  });
}

export type CalibrationMeasureMode =
  | "wholeAttackDb"
  | "wholeSustainDb"
  | "fundamentalAttackDb"
  | "fundamentalSustainDb"
  | "measuredFrequency";

export function interpolateProfile(
  profile: CalibrationProfile,
  key: number,
  velocity: number,
  mode: CalibrationMeasureMode,
) {
  const byKey = [...new Set(profile.measurements.map((item) => item.key))].sort(
    (a, b) => a - b,
  );
  if (!byKey.length) return null;
  const lowerKey = [...byKey].reverse().find((candidate) => candidate <= key) ?? byKey[0];
  const upperKey = byKey.find((candidate) => candidate >= key) ?? byKey[byKey.length - 1];
  const valueAtKey = (targetKey: number) => {
    const rows = profile.measurements
      .filter((item) => item.key === targetKey)
      .sort((a, b) => a.velocity - b.velocity);
    if (!rows.length) return null;
    const lower = [...rows].reverse().find((item) => item.velocity <= velocity) ?? rows[0];
    const upper = rows.find((item) => item.velocity >= velocity) ?? rows[rows.length - 1];
    if (lower.velocity === upper.velocity) return lower[mode];
    const ratio = (velocity - lower.velocity) / (upper.velocity - lower.velocity);
    return lower[mode] + (upper[mode] - lower[mode]) * ratio;
  };
  const lowValue = valueAtKey(lowerKey);
  const highValue = valueAtKey(upperKey);
  if (lowValue === null || highValue === null) return lowValue ?? highValue;
  if (lowerKey === upperKey) return lowValue;
  const ratio = (key - lowerKey) / (upperKey - lowerKey);
  return lowValue + (highValue - lowValue) * ratio;
}

export function detectVelocityLayerJumps(
  measurements: CalibrationMeasurement[],
  relativeCentroidChange = 0.2,
) {
  const jumps: { key: number; lowerVelocity: number; upperVelocity: number }[] = [];
  const keys = [...new Set(measurements.map((item) => item.key))];
  for (const key of keys) {
    const rows = measurements
      .filter((item) => item.key === key)
      .sort((a, b) => a.velocity - b.velocity);
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1].spectralCentroid;
      const current = rows[index].spectralCentroid;
      if (previous > 0 && Math.abs(current - previous) / previous >= relativeCentroidChange) {
        jumps.push({
          key,
          lowerVelocity: rows[index - 1].velocity,
          upperVelocity: rows[index].velocity,
        });
      }
    }
  }
  return jumps;
}

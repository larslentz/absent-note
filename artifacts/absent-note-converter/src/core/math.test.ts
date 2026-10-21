import { describe, expect, it } from "vitest";
import {
  applyRangePolicy,
  bakedVelocity,
  harmonicFrequency,
  harmonicOffset,
  harmonicWeight,
  layerLevelDb,
  midiToFrequency,
  pitchBendForCents,
  weightFromDecibels,
} from "./math";

describe("harmonic pitch math", () => {
  it("matches the specified offset and cent corrections for harmonics 2–8", () => {
    const expected = [
      [2, 12, 0],
      [3, 19, 1.955],
      [4, 24, 0],
      [5, 28, -13.686],
      [6, 31, 1.955],
      [7, 34, -31.174],
      [8, 36, 0],
    ] as const;
    for (const [harmonic, semitones, cents] of expected) {
      const actual = harmonicOffset(harmonic);
      expect(actual.semitones).toBe(semitones);
      expect(actual.cents).toBeCloseTo(cents, 2);
    }
  });

  it("maps A2 to the specified harmonic notes and frequencies", () => {
    const note = 45;
    const expected = [
      [2, 57, 220],
      [3, 64, 330],
      [4, 69, 440],
      [5, 73, 550],
    ] as const;
    expect(midiToFrequency(note)).toBeCloseTo(110, 8);
    for (const [harmonic, midiNote, frequency] of expected) {
      expect(note + harmonicOffset(harmonic).semitones).toBe(midiNote);
      expect(harmonicFrequency(note, harmonic)).toBeCloseTo(frequency, 8);
    }
  });

  it("does not permit harmonic 1", () => {
    expect(() => harmonicOffset(1)).toThrow(/never output/);
    expect(() => harmonicFrequency(60, 1)).toThrow(/2 or greater/);
  });
});

describe("pitch bend math", () => {
  it.each([2, 12])("returns correct 14-bit bends for R=%i", (range) => {
    for (let harmonic = 2; harmonic <= 8; harmonic += 1) {
      const bend = pitchBendForCents(harmonicOffset(harmonic).cents, range);
      const expected = Math.min(
        16383,
        Math.max(
          0,
          Math.round(
            8192 +
              (8192 * harmonicOffset(harmonic).cents) / (100 * range),
          ),
        ),
      );
      expect(bend.value14Bit).toBe(expected);
      expect(bend.signed).toBe(expected - 8192);
    }
  });

  it("clamps the bend at both 14-bit limits", () => {
    expect(pitchBendForCents(100_000, 2).value14Bit).toBe(16383);
    expect(pitchBendForCents(-100_000, 2).value14Bit).toBe(0);
  });
});

describe("weight and velocity math", () => {
  it("matches the baked velocity example 90 → 90, 73, 64, 57", () => {
    const result = [2, 3, 4, 5].map((harmonic) =>
      bakedVelocity(90, harmonicWeight(harmonic, 1), 2),
    );
    expect(result).toEqual([90, 73, 64, 57]);
  });

  it("converts layer weights to decibels and custom decibels back to weights", () => {
    expect(layerLevelDb(1)).toBeCloseTo(0, 8);
    expect(layerLevelDb(0.5)).toBeCloseTo(-6.0206, 3);
    expect(weightFromDecibels(-6.0206)).toBeCloseTo(0.5, 4);
  });

  it("clamps baked velocity to the MIDI range", () => {
    expect(bakedVelocity(127, 4, 2)).toBe(127);
    expect(bakedVelocity(1, 0.01, 2)).toBe(1);
  });
});

describe("range and channel helpers", () => {
  it("never wraps a harmonic note past MIDI 127", () => {
    expect(applyRangePolicy(127, 12, "skip-harmonic")).toEqual({
      keepSource: false,
      reason: "out-of-range",
    });
    expect(applyRangePolicy(127, 12, "drop-source")).toEqual({
      keepSource: false,
      reason: "out-of-range",
    });
    expect(applyRangePolicy(100, 12, "skip-harmonic")).toEqual({
      keepSource: true,
      outputNote: 112,
    });
  });
});

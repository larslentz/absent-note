import { describe, expect, it } from "vitest";
import {
  analyzeCalibrationAudio,
  createCalibrationSchedule,
  createCalibrationMidi,
  interpolateProfile,
  type CalibrationProfile,
} from "./calibration";

describe("calibration schedule", () => {
  it("creates a one-second count-in and two-second notes with two-second gaps", () => {
    const schedule = createCalibrationSchedule([69], [48, 80]);
    expect(schedule.click.durationSec).toBe(1);
    expect(schedule.notes).toEqual([
      { key: 69, velocity: 48, startSec: 1, durationSec: 2, silenceSec: 2 },
      { key: 69, velocity: 80, startSec: 5, durationSec: 2, silenceSec: 2 },
    ]);
    const midi = createCalibrationMidi(schedule);
    expect(midi.tracks[0].notes).toHaveLength(3);
    expect(midi.tracks[0].notes[0].midi).toBe(schedule.click.key);
    expect(midi.tracks[0].notes[1].ticks).toBe(midi.header.secondsToTicks(1));
  });
});

describe("calibration analysis", () => {
  it("recovers synthetic level within 0.5 dB and tuning within 1 cent", () => {
    const sampleRate = 48_000;
    const schedule = createCalibrationSchedule(
      [69],
      [80],
      { countInSec: 1, durationSec: 2, silenceSec: 0 },
    );
    const samples = new Float32Array(sampleRate * 3);
    const clickStart = 0.2;
    const noteStart = 1.2;
    const amplitude = 0.2;
    const detuneCents = 3.25;
    const frequency = 440 * 2 ** (detuneCents / 1200);
    for (let index = 0; index < samples.length; index += 1) {
      const time = index / sampleRate;
      let envelope = 0;
      if (time >= clickStart && time < clickStart + 0.4) {
        envelope = Math.min(1, (time - clickStart) / 0.015);
        samples[index] += 0.5 * envelope * Math.sin(2 * Math.PI * 880 * time);
      }
      if (time >= noteStart && time < noteStart + 2) {
        envelope = Math.min(1, (time - noteStart) / 0.02);
        samples[index] += amplitude * envelope * Math.sin(2 * Math.PI * frequency * time);
      }
    }
    const result = analyzeCalibrationAudio(samples, sampleRate, schedule)[0];
    expect(result.fundamentalSustainDb).toBeCloseTo(20 * Math.log10(amplitude), 0);
    expect(Math.abs(result.tuningCents - detuneCents)).toBeLessThan(1);
    expect(result.wholeSustainDb).toBeCloseTo(
      20 * Math.log10(amplitude / Math.sqrt(2)),
      0,
    );
  });

  it("interpolates between measured velocities and keys", () => {
    const profile: CalibrationProfile = {
      id: "profile",
      name: "Test",
      createdAt: new Date(0).toISOString(),
      measurements: [
        { key: 60, velocity: 40, wholeAttackDb: -40 } as never,
        { key: 60, velocity: 80, wholeAttackDb: -20 } as never,
        { key: 64, velocity: 40, wholeAttackDb: -32 } as never,
        { key: 64, velocity: 80, wholeAttackDb: -12 } as never,
      ],
    };
    expect(interpolateProfile(profile, 62, 60, "wholeAttackDb")).toBeCloseTo(-26);
  });
});

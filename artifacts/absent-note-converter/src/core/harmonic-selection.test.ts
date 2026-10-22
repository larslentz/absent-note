import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import {
  buildBarTiming, collectSourceNoteEvents, createHarmonicSelectionPlan,
  greatestCommonDivisor, midiBarTiming, summarizeGcdGroups,
  type HarmonicSelectionSettings,
} from "./harmonic-selection";
import { buildPreviewVoices } from "./preview";
import { convertMidi, midiToBytes, parseMidi, settingsSidecar } from "./midi";
import { harmonicOffset } from "./math";

const timing = buildBarTiming(480, []);
const events = Array.from({ length: 40 }, (_, index) => ({ id: `note-${index}`, ticks: index * 240 }));
const settings: HarmonicSelectionSettings = {
  mode: "constrained-random", seed: "repeatable", scope: "source-note",
  candidatePool: [2, 3, 4, 5, 6, 7, 8], selectedCount: 4, minimumCount: 3,
};
const planFor = (overrides: Partial<HarmonicSelectionSettings> = {}) =>
  createHarmonicSelectionPlan(events, { ...settings, ...overrides }, timing);

describe("harmonic selection", () => {
  it.each([
    ["reference", undefined, [2, 3, 4, 5], 1],
    ["odd", 9, [3, 5, 7, 9], 1],
    ["even", 8, [2, 4, 6, 8], 2],
    ["custom", undefined, [3, 6, 9], 3],
  ] as const)("%s has its exact default set and mathematical GCD", (mode, maximumHarmonic, expected, gcd) => {
    const plan = planFor({ mode, maximumHarmonic, customSet: [...expected] });
    expect(plan.groups[0].harmonics).toEqual(expected);
    expect(plan.groups[0].gcd).toBe(gcd);
    expect(plan.groups[0].intervalSemitones).toBeCloseTo(12 * Math.log2(gcd), 9);
  });

  it("handles the higher-base examples without a perceptual guarantee", () => {
    expect(greatestCommonDivisor([4, 8])).toBe(4);
    expect(12 * Math.log2(greatestCommonDivisor([3, 6, 9]))).toBeCloseTo(19.01955, 5);
    expect(greatestCommonDivisor([])).toBe(0);
  });

  it("every constrained selection obeys count, pool, uniqueness and GCD", () => {
    const plan = planFor();
    for (const set of Object.values(plan.selections)) {
      expect(set).toHaveLength(4);
      expect(new Set(set).size).toBe(4);
      expect(set.every(h => settings.candidatePool!.includes(h))).toBe(true);
      expect(greatestCommonDivisor(set)).toBe(1);
      expect(set).not.toContain(1);
    }
  });

  it("retains anchors, removes duplicate pool values, and applies the safeguard", () => {
    const plan = planFor({ mode: "anchored-random", anchors: [2, 3, 2],
      optionalPool: [2, 4, 5, 6, 7, 8, 8], optionalCount: 2, gcdSafeguard: true });
    for (const set of Object.values(plan.selections)) {
      expect(set).toHaveLength(4);
      expect(set).toEqual(expect.arrayContaining([2, 3]));
      expect(greatestCommonDivisor(set)).toBe(1);
    }
  });

  it("does not impose a GCD safeguard in free mode", () => {
    const plan = planFor({ mode: "free-random", candidatePool: [2, 4, 6, 8], selectedCount: 4 });
    expect(plan.groups.every(group => group.gcd === 2)).toBe(true);
    expect(summarizeGcdGroups(plan.groups)).toEqual([{ gcd: 2, count: 40, baseMultiplier: 2, intervalSemitones: 12 }]);
  });

  it("is reproducible regardless of event iteration order", () => {
    expect(planFor()).toEqual(planFor());
    const reversed = createHarmonicSelectionPlan([...events].reverse(), settings, timing);
    expect(reversed).toEqual(planFor());
  });

  it("produces several valid outputs across a collection of seeds", () => {
    const sets = new Set(Array.from({ length: 32 }, (_, seed) =>
      JSON.stringify(planFor({ seed: String(seed), scope: "conversion" }).groups[0].harmonics)));
    expect(sets.size).toBeGreaterThan(1);
  });

  it.each([
    { candidatePool: [] },
    { candidatePool: [1, 2, 3, 4] },
    { candidatePool: [2, 3.5, 4, 5] },
    { candidatePool: [2, 3], selectedCount: 4 },
    { selectedCount: 2, minimumCount: 3 },
    { candidatePool: [2, 4, 6, 8] },
    { mode: "anchored-random", anchors: [], optionalPool: [4, 5] },
    { mode: "anchored-random", anchors: [2, 4], optionalPool: [6, 8], optionalCount: 2 },
    { seed: "" },
  ] as Partial<HarmonicSelectionSettings>[])("rejects impossible settings %j without retries", overrides => {
    expect(() => planFor(overrides)).toThrow();
  });
});

describe("bar timing and source-event ownership", () => {
  it("uses PPQ and meter changes, not tempo or render order", () => {
    const meter = buildBarTiming(480, [
      { ticks: 0, numerator: 4, denominator: 4 },
      { ticks: 3840, numerator: 3, denominator: 4 },
    ]);
    expect(meter.supported).toBe(true);
    const at = [0, 1800, 1920, 3839, 3840, 5279, 5280];
    const plan = createHarmonicSelectionPlan(at.map((ticks, i) => ({ id: String(i), ticks })),
      { ...settings, scope: "bar" }, meter);
    expect(plan.groups.map(group => group.eventIds)).toEqual([["0", "1"], ["2", "3"], ["4", "5"], ["6"]]);
  });

  it("disables unsupported meter maps instead of guessing", () => {
    for (const meter of [
      buildBarTiming(0, []),
      buildBarTiming(480, [{ ticks: 123, numerator: 3, denominator: 4 }]),
      buildBarTiming(1, [{ ticks: 0, numerator: 1, denominator: 64 }]),
    ]) {
      expect(meter.supported).toBe(false);
      expect(() => createHarmonicSelectionPlan(events, { ...settings, scope: "bar" }, meter)).toThrow();
    }
  });
});

function musicalInput(note = 45) {
  const midi = new Midi();
  midi.header.setTempo(120);
  const track = midi.addTrack();
  track.addNote({ midi: note, ticks: 1800, durationTicks: 2300, velocity: 0.8 });
  track.addNote({ midi: note + 2, ticks: 1920, durationTicks: 240, velocity: 0.6 });
  return midi;
}

describe("shared preview/export plan", () => {
  it("uses identical selections and exact corrections, retaining notes crossing bars", () => {
    const source = musicalInput();
    const inputEvents = collectSourceNoteEvents(source, [0]);
    const plan = createHarmonicSelectionPlan(inputEvents, { ...settings, scope: "bar" }, midiBarTiming(source));
    const options = { selectedTracks: [0], harmonics: [2, 3, 4, 5], harmonicSelectionPlan: plan, preserveUnconvertedTracks: false };
    const result = convertMidi(source, options);
    const preview = buildPreviewVoices(source, { tracks: [0], harmonics: [], alpha: 0, a4: 440, variant: "absent", selectionPlan: plan });
    expect(result.harmonicSelectionPlan.selections).toEqual(plan.selections);
    for (const event of inputEvents) {
      const selected = plan.selections[event.id];
      expect(preview.filter(voice => voice.sourceNote === event.midi).map(voice => voice.harmonic)).toEqual(selected);
      for (const h of selected) {
        const offset = harmonicOffset(h);
        const track = result.midi.tracks.find(track => track.name.startsWith(`H${h} (`))!;
        const note = track.notes.find(note => note.ticks === event.ticks)!;
        expect(note.midi).toBe(event.midi + offset.semitones);
        expect(note.durationTicks).toBe(event.durationTicks);
        expect(track.pitchBends[0].value * 200).toBeCloseTo(offset.cents, 1);
      }
    }
    expect(preview.every(voice => voice.harmonic >= 2)).toBe(true);
    expect(midiToBytes(convertMidi(source, options).midi)).toEqual(midiToBytes(result.midi));
    const report = JSON.parse(settingsSidecar(result));
    expect(report.harmonicSelectionPlan.selections).toEqual(plan.selections);
  });

  it.each([0, 0.5, 1])("normalizes squared sine amplitudes for alpha %s", alpha => {
    const source = musicalInput();
    const plan = createHarmonicSelectionPlan(collectSourceNoteEvents(source, [0]), { ...settings, normalization: "sum-squares" }, timing);
    const voices = buildPreviewVoices(source, { tracks: [0], harmonics: [], alpha, a4: 440, variant: "absent", selectionPlan: plan, normalization: "sum-squares", gain: 0.4 });
    for (const note of source.tracks[0].notes) {
      const energy = voices.filter(voice => voice.sourceNote === note.midi).reduce((sum, voice) => sum + voice.amplitude ** 2, 0);
      expect(energy).toBeCloseTo((note.velocity * 0.4) ** 2, 12);
    }
  });

  it("recalculates effective GCD and normalization after range skips", () => {
    const source = new Midi();
    source.addTrack().addNote({ midi: 100, ticks: 0, durationTicks: 480, velocity: 1 });
    const plan = createHarmonicSelectionPlan(collectSourceNoteEvents(source, [0]),
      { ...settings, mode: "custom", customSet: [2, 4, 5] }, timing);
    const result = convertMidi(source, { selectedTracks: [0], harmonics: [2, 4, 5], harmonicSelectionPlan: plan, rangePolicy: "skip-harmonic" });
    const eventId = plan.sourceEventIds[0];
    expect(result.harmonicSelectionPlan.selections[eventId]).toEqual([2, 4]);
    expect(result.harmonicSelectionPlan.skippedLayers[eventId]).toEqual([5]);
    expect(result.harmonicSelectionPlan.groups[0].gcd).toBe(2);
    expect(result.warnings.some(warning => warning.message.includes("differs from requested"))).toBe(true);
    const voices = buildPreviewVoices(source, { tracks: [0], harmonics: [], alpha: 0, a4: 440, variant: "absent", selectionPlan: plan, normalization: "sum-squares", gain: 0.5 });
    expect(voices.map(voice => voice.harmonic)).toEqual([2, 4]);
    expect(voices.reduce((sum, voice) => sum + voice.amplitude ** 2, 0)).toBeCloseTo(0.25, 12);
    expect(buildPreviewVoices(source, { tracks: [0], harmonics: [], alpha: 0, a4: 440, variant: "absent", selectionPlan: plan, rangePolicy: "drop-source" })).toEqual([]);
  });

  it("keeps overlapping same-pitch events on independent channels through MIDI round-trip", () => {
    const source = new Midi();
    const track = source.addTrack();
    track.addNote({ midi: 45, ticks: 0, durationTicks: 480, velocity: 0.8 });
    track.addNote({ midi: 45, ticks: 120, durationTicks: 120, velocity: 0.6 });
    const result = convertMidi(source, { selectedTracks: [0], harmonics: [2, 3] });
    const roundTrip = parseMidi(midiToBytes(result.midi));
    expect(new Set(roundTrip.tracks.map(track => track.channel)).size).toBe(4);
    expect(roundTrip.tracks.flatMap(track => track.notes).map(note => note.durationTicks).sort((a,b) => a-b)).toEqual([120, 120, 480, 480]);
    expect(result.warnings.some(warning => warning.type === "channel-conflict")).toBe(true);
    expect(() => convertMidi(source, { selectedTracks: [0], harmonics: Array.from({ length: 15 }, (_, i) => i + 2) })).toThrow(/Insufficient MIDI channels/);
  });

  it("retains legacy fixed-set behavior without new settings", () => {
    const source = musicalInput();
    const result = convertMidi(source, { selectedTracks: [0], harmonics: [3, 7] });
    expect(Object.values(result.harmonicSelectionPlan.selections).every(set => set.join() === "3,7")).toBe(true);
  });
});

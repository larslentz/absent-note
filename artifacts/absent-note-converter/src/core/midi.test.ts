import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import type { CalibrationProfile } from "./calibration";
import { convertMidi, midiToBytes, parseMidi, summarizeTracks } from "./midi";

function sourceMidi() {
  const midi = new Midi();
  const melody = midi.addTrack();
  melody.name = "A2 melody";
  melody.channel = 0;
  melody.addNote({
    midi: 45,
    ticks: 120,
    durationTicks: 240,
    velocity: 90 / 127,
  });
  melody.addCC({ number: 64, value: 1, ticks: 100 });
  melody.addCC({ number: 64, value: 0, ticks: 500 });
  const accompaniment = midi.addTrack();
  accompaniment.name = "Passthrough";
  accompaniment.channel = 1;
  accompaniment.addNote({
    midi: 60,
    ticks: 180,
    durationTicks: 120,
    velocity: 0.6,
  });
  return midi;
}

describe("local MIDI analysis", () => {
  it("summarizes track metadata and excludes channel-10 drums by default", () => {
    const midi = sourceMidi();
    const drums = midi.addTrack();
    drums.name = "Kit";
    drums.channel = 9;
    drums.instrument.number = 0;
    drums.addNote({ midi: 36, ticks: 0, durationTicks: 30, velocity: 0.8 });
    const summaries = summarizeTracks(midi);
    expect(summaries[0]).toMatchObject({
      name: "A2 melody",
      channel: 1,
      noteCount: 1,
      lowestNote: 45,
      highestNote: 45,
      hasSustain: true,
      isDrumTrack: false,
      selectedByDefault: true,
    });
    expect(summaries[2]).toMatchObject({
      channel: 10,
      isDrumTrack: true,
      selectedByDefault: false,
    });
  });
});

describe("fixed harmonic MIDI conversion", () => {
  it("round-trips as type 1 with correct notes, ticks, channels, RPN, and no fundamental", () => {
    const source = sourceMidi();
    const before = JSON.stringify(source.toJSON());
    const converted = convertMidi(
      source,
      {
        selectedTracks: [0],
        harmonics: [2, 3, 4, 5],
        bendRange: 2,
        alpha: 0,
        dynamicsMode: "external",
        sustainMode: "copy",
        preserveUnconvertedTracks: true,
      },
      "tune.mid",
    );
    const bytes = midiToBytes(converted.midi);
    expect([...bytes.slice(8, 10)]).toEqual([0, 1]);
    const reparsed = parseMidi(bytes);
    expect(reparsed.header.ppq).toBe(source.header.ppq);
    expect(reparsed.tracks).toHaveLength(5);
    const harmonicTracks = reparsed.tracks.slice(0, 4);
    expect(harmonicTracks.map((track) => track.channel)).toEqual([0, 1, 2, 3]);
    expect(harmonicTracks.map((track) => track.notes[0]?.midi)).toEqual([
      57, 64, 69, 73,
    ]);
    expect(harmonicTracks.map((track) => track.notes[0]?.ticks)).toEqual([
      120, 120, 120, 120,
    ]);
    expect(harmonicTracks.every((track) => track.notes.length === 1)).toBe(true);
    expect(harmonicTracks.flatMap((track) => track.notes).some((note) => note.midi === 45)).toBe(false);

    for (const track of harmonicTracks) {
      const rpn = [101, 100, 6, 38, 101, 100].map(
        (number) => track.controlChanges[number]?.[0]?.ticks,
      );
      expect(rpn).toEqual([0, 0, 0, 0, 0, 0]);
      expect(track.controlChanges[101]?.map((event) => event.value)).toEqual([0, 1]);
      expect(track.controlChanges[100]?.map((event) => event.value)).toEqual([0, 1]);
      expect(track.controlChanges[6]?.[0]?.value).toBeCloseTo(2 / 127);
      expect(track.controlChanges[38]?.[0]?.value).toBe(0);
      expect(track.pitchBends.some((bend) => bend.ticks === 0)).toBe(true);
      expect(track.controlChanges[64]?.length).toBe(2);
    }
    expect(reparsed.tracks[4].notes[0]?.midi).toBe(60);
    expect(reparsed.tracks[4].notes[0]?.ticks).toBe(180);
    expect(JSON.stringify(source.toJSON())).toBe(before);
  });

  it("honors range skip and drop-whole-source policies without octave wrapping", () => {
    const source = new Midi();
    const track = source.addTrack();
    track.name = "High";
    track.addNote({ midi: 100, ticks: 20, durationTicks: 90, velocity: 0.8 });
    const common = {
      selectedTracks: [0],
      harmonics: [2, 5],
      dynamicsMode: "external" as const,
      preserveUnconvertedTracks: false,
    };

    const skip = convertMidi(source, {
      ...common,
      rangePolicy: "skip-harmonic",
    });
    expect(skip.midi.tracks.flatMap((item) => item.notes).map((note) => note.midi)).toEqual([112]);
    expect(skip.warnings.some((warning) => warning.harmonic === 5)).toBe(true);

    const drop = convertMidi(source, {
      ...common,
      rangePolicy: "drop-source",
    });
    expect(drop.midi.tracks.flatMap((item) => item.notes)).toHaveLength(0);
    expect(drop.warnings.some((warning) => warning.message.includes("Dropped source note"))).toBe(true);
  });

  it("bakes sustain through the pedal-up tick when requested", () => {
    const source = new Midi();
    const track = source.addTrack();
    track.addNote({ midi: 45, ticks: 0, durationTicks: 120, velocity: 0.8 });
    track.addCC({ number: 64, value: 1, ticks: 60 });
    track.addCC({ number: 64, value: 0, ticks: 300 });
    const result = convertMidi(source, {
      selectedTracks: [0],
      harmonics: [2],
      sustainMode: "bake",
      preserveUnconvertedTracks: false,
    });
    expect(result.midi.tracks[0].notes[0].durationTicks).toBe(300);
    expect(result.midi.tracks[0].controlChanges[64]).toBeUndefined();
  });

  it("uses a saved calibration profile for per-note tuning and velocity", () => {
    const source = new Midi();
    const track = source.addTrack();
    track.name = "A4";
    track.addNote({ midi: 69, ticks: 100, durationTicks: 240, velocity: 80 / 127 });
    const detunedA5 = 880 * 2 ** (2 / 1200);
    const profile: CalibrationProfile = {
      id: "piano",
      name: "Test piano",
      createdAt: "2025-01-01T00:00:00.000Z",
      measurements: [
        { key: 69, velocity: 80, wholeSustainDb: -10, measuredFrequency: 440 } as never,
        { key: 81, velocity: 40, wholeSustainDb: -20, measuredFrequency: detunedA5 } as never,
        { key: 81, velocity: 80, wholeSustainDb: -10, measuredFrequency: detunedA5 } as never,
      ],
    };
    const result = convertMidi(source, {
      selectedTracks: [0],
      harmonics: [2],
      calibrationEnabled: true,
      calibrationProfile: profile,
      calibrationMeasureMode: "wholeSustainDb",
      calibratedChannelCount: 2,
      preserveUnconvertedTracks: false,
      bendRange: 2,
    });
    const output = parseMidi(midiToBytes(result.midi));
    const assignedTrack = output.tracks.find((item) => item.notes.length > 0);
    expect(assignedTrack).toBeDefined();
    expect(assignedTrack?.channel).not.toBe(9);
    expect(assignedTrack?.notes[0].midi).toBe(81);
    expect(assignedTrack?.notes[0].velocity).toBeCloseTo(80 / 127, 4);
    expect(assignedTrack?.pitchBends.some((bend) => bend.ticks === 100)).toBe(true);
    expect(output.tracks.flatMap((item) => item.notes).some((note) => note.midi === 69)).toBe(false);
  });
});

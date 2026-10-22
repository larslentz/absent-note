import { Midi, type Track } from "@tonejs/midi";
import {
  allocateDynamicVoices,
  type DynamicVoiceRequest,
} from "./allocator";
import {
  interpolateProfile,
  type CalibrationMeasureMode,
  type CalibrationProfile,
} from "./calibration";
import {
  applyRangePolicy,
  bakedVelocity,
  harmonicOffset,
  harmonicWeight,
  layerLevelDb,
  midiChannelForHarmonicIndex,
  midiToFrequency,
  pitchBendForCents,
  weightFromDecibels,
  type RangePolicy,
} from "./math";
import {
  collectSourceNoteEvents,
  greatestCommonDivisor,
  sourceEventId,
  type HarmonicSelectionPlan,
  type HarmonicSelectionSettings,
} from "./harmonic-selection";

export type TrackSummary = {
  index: number;
  name: string;
  channel: number;
  noteCount: number;
  lowestNote: number | null;
  highestNote: number | null;
  hasPitchBend: boolean;
  hasSustain: boolean;
  isDrumTrack: boolean;
  selectedByDefault: boolean;
};

export type ConversionOptions = {
  selectedTracks: number[];
  harmonics: number[];
  a4?: number;
  bendRange?: number;
  alpha?: number;
  customDb?: Record<number, number>;
  dynamicsMode?: "external" | "baked";
  gamma?: number;
  globalVelocityScale?: number;
  flattenDynamics?: boolean;
  flattenedVelocity?: number;
  rangePolicy?: RangePolicy;
  sustainMode?: "copy" | "bake";
  preserveUnconvertedTracks?: boolean;
  sourcePitchBend?: "ignore" | "add";
  sourcePitchBendRange?: number;
  programNumber?: number;
  calibrationProfile?: CalibrationProfile;
  calibrationEnabled?: boolean;
  calibrationMeasureMode?: CalibrationMeasureMode;
  calibratedChannelCount?: number;
  calibrationExhaustion?: "steal-oldest" | "nearest-correction";
  releaseGuardTicks?: number;
  mpe?: boolean;
  harmonicSelectionPlan?: HarmonicSelectionPlan;
};

export type ConversionWarning = {
  type: "range" | "pitch-bend" | "channel-conflict";
  message: string;
  trackIndex?: number;
  note?: number;
  harmonic?: number;
  ticks?: number;
  bar?: number;
  beat?: number;
};

export type ConversionResult = {
  midi: Midi;
  warnings: ConversionWarning[];
  noteCount: number;
  outputTrackCount: number;
  outputFileName: string;
  settings: ConversionOptions;
  harmonicSelectionPlan: HarmonicSelectionPlan;
};

function assertOptions(options: ConversionOptions) {
  if (!options.selectedTracks.length) {
    throw new Error("Choose at least one MIDI track to convert.");
  }
  const selectedHarmonics = options.harmonicSelectionPlan
    ? Object.values(options.harmonicSelectionPlan.selections).flat()
    : options.harmonics;
  if (
    !selectedHarmonics.length ||
    selectedHarmonics.some(
      (harmonic) =>
        !Number.isInteger(harmonic) || harmonic < 2 || harmonic > 16,
    )
  ) {
    throw new Error("Choose one or more harmonics from 2 through 16.");
  }
  if (new Set(options.harmonics).size !== options.harmonics.length) {
    throw new Error("Harmonic selections must be unique.");
  }
}

export function parseMidi(bytes: ArrayBuffer | Uint8Array): Midi {
  try {
    return new Midi(bytes);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown MIDI error.";
    throw new Error(`Could not read this Standard MIDI File: ${detail}`);
  }
}

export function summarizeTracks(midi: Midi): TrackSummary[] {
  return midi.tracks.map((track, index) => {
    const pitches = track.notes.map((note) => note.midi);
    const isDrumTrack = track.channel === 9 || track.instrument.percussion;
    return {
      index,
      name: track.name.trim() || `Track ${index + 1}`,
      channel: track.channel + 1,
      noteCount: track.notes.length,
      lowestNote: pitches.length ? Math.min(...pitches) : null,
      highestNote: pitches.length ? Math.max(...pitches) : null,
      hasPitchBend: track.pitchBends.length > 0,
      hasSustain: (track.controlChanges[64]?.length ?? 0) > 0,
      isDrumTrack,
      selectedByDefault: !isDrumTrack && track.notes.length > 0,
    };
  });
}

function barAndBeatAtTicks(midi: Midi, ticks: number) {
  const signatures = [...midi.header.timeSignatures].sort(
    (a, b) => a.ticks - b.ticks,
  );
  let signature = signatures[0]?.timeSignature ?? [4, 4];
  let measureStartTick = 0;
  let completedBars = 0;
  for (let index = 0; index < signatures.length; index += 1) {
    const next = signatures[index + 1];
    const event = signatures[index];
    if (ticks < event.ticks) break;
    if (index > 0) {
      completedBars += Math.floor(
        (event.ticks - measureStartTick) /
          ((midi.header.ppq * 4 * signature[0]) / signature[1]),
      );
    }
    measureStartTick = event.ticks;
    signature = event.timeSignature;
    if (!next || ticks < next.ticks) break;
  }
  const ticksPerBeat = (midi.header.ppq * 4) / (signature[1] || 4);
  const ticksPerBar = ticksPerBeat * (signature[0] || 4);
  const localTicks = Math.max(0, ticks - measureStartTick);
  return {
    bar: completedBars + Math.floor(localTicks / ticksPerBar) + 1,
    beat: Math.floor((localTicks % ticksPerBar) / ticksPerBeat) + 1,
  };
}

function noteReleaseTick(track: Track, noteStart: number, noteEnd: number) {
  const sustainEvents = [...(track.controlChanges[64] ?? [])].sort(
    (a, b) => a.ticks - b.ticks,
  );
  let pedalDown = false;
  for (const event of sustainEvents) {
    if (event.ticks > noteEnd) break;
    pedalDown = event.value >= 0.5;
  }
  if (!pedalDown) return noteEnd;
  const pedalUp = sustainEvents.find(
    (event) => event.ticks > noteEnd && event.value < 0.5,
  );
  if (pedalUp) return Math.max(noteEnd, pedalUp.ticks);
  return Math.max(noteEnd, track.durationTicks, noteStart);
}

function addRpnSetup(track: Track, range: number) {
  const cc = (number: number, value: number) =>
    track.addCC({ number, value: value / 127, ticks: 0 });
  cc(101, 0);
  cc(100, 0);
  cc(6, range);
  cc(38, 0);
  cc(101, 127);
  cc(100, 127);
}

function settingWeight(harmonic: number, options: ConversionOptions) {
  const customDb = options.customDb?.[harmonic];
  if (customDb !== undefined) return weightFromDecibels(customDb);
  return harmonicWeight(harmonic, options.alpha ?? 0);
}

function calibratedVelocityForNote(
  sourceMidiNote: number,
  sourceVelocity: number,
  outputMidiNote: number,
  harmonicWeightValue: number,
  profile: CalibrationProfile,
  mode: CalibrationMeasureMode,
) {
  const sourceLevel = interpolateProfile(profile, sourceMidiNote, sourceVelocity, mode);
  if (sourceLevel === null) {
    throw new Error("The selected calibration profile has no usable level measurements.");
  }
  const targetLevel = sourceLevel + layerLevelDb(harmonicWeightValue);
  const candidates = [...new Set(profile.measurements.map((item) => item.velocity))];
  let bestVelocity = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const velocity of candidates) {
    const measured = interpolateProfile(profile, outputMidiNote, velocity, mode);
    if (measured === null) continue;
    const distance = Math.abs(measured - targetLevel);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestVelocity = velocity;
    }
  }
  if (!Number.isFinite(bestDistance)) {
    throw new Error("The calibration profile cannot estimate the target key level.");
  }
  return { velocity: bestVelocity, targetLevel };
}

function sourcePitchCents(track: Track, ticks: number, bendRange: number) {
  let currentValue = 0;
  for (const bend of track.pitchBends) {
    if (bend.ticks > ticks) break;
    currentValue = bend.value;
  }
  return currentValue * bendRange * 100;
}

export function convertMidi(
  source: Midi,
  options: ConversionOptions,
  sourceName = "tune.mid",
): ConversionResult {
  assertOptions(options);
  const bendRange = options.bendRange ?? 2;
  const output = new Midi();
  output.header.fromJSON(source.header.toJSON());
  const warnings: ConversionWarning[] = [];
  const selected = new Set(options.selectedTracks);
  const selectedTrackIndexes = [...selected].sort((a, b) => a - b);
  const selectedTracks = source.tracks.filter((_, index) => selected.has(index));
  if (selectedTracks.length !== selected.size) {
    throw new Error("A selected MIDI track no longer exists.");
  }
  const sourceEvents = collectSourceNoteEvents(source, selectedTrackIndexes);
  const suppliedPlan = options.harmonicSelectionPlan;
  const fallbackSettings: HarmonicSelectionSettings = {
    mode: "custom",
    customSet: [...options.harmonics],
    seed: "legacy-fixed-set",
    scope: "conversion",
  };
  const harmonicSelectionPlan: HarmonicSelectionPlan =
    suppliedPlan ??
    (() => {
      const selectedSet = [...options.harmonics].sort((a, b) => a - b);
      return {
        settings: fallbackSettings,
        sourceEventIds: sourceEvents.map((event) => event.id),
        selections: Object.fromEntries(
          sourceEvents.map((event) => [event.id, selectedSet]),
        ),
        groups: sourceEvents.length
          ? [
              {
                id: "conversion",
                eventIds: sourceEvents.map((event) => event.id),
                harmonics: selectedSet,
                requestedHarmonics: selectedSet,
                gcd: greatestCommonDivisor(selectedSet),
                baseMultiplier: greatestCommonDivisor(selectedSet),
                intervalSemitones:
                  12 * Math.log2(greatestCommonDivisor(selectedSet)),
              },
            ]
          : [],
        requestedSelections: Object.fromEntries(
          sourceEvents.map((event) => [event.id, selectedSet]),
        ),
        skippedLayers: {},
      };
    })();
  const requestedSelections =
    harmonicSelectionPlan.requestedSelections ??
    harmonicSelectionPlan.selections;
  const plannedUnion = [
    ...new Set(Object.values(harmonicSelectionPlan.selections).flat()),
  ].sort((a, b) => a - b);
  const harmonics = plannedUnion.length
    ? plannedUnion
    : [...options.harmonics].sort((a, b) => a - b);
  for (const event of sourceEvents) {
    if (!harmonicSelectionPlan.selections[event.id]) {
      throw new Error(`The harmonic plan is missing source event ${event.id}.`);
    }
  }
  const actualSelections: Record<string, number[]> = {};
  const calibrated = options.calibrationEnabled ?? false;
  if (calibrated && !options.calibrationProfile) {
    throw new Error("Choose a saved calibration profile before calibrated conversion.");
  }
  const outputTracks = new Map<number, Track>();
  const dynamicTracks = new Map<number, Track>();
  const dynamicChannels = options.mpe
    ? Array.from({ length: 15 }, (_, index) => index + 1)
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
  const dynamicRequests: DynamicVoiceRequest[] = [];
  const dynamicRequestDetails = new Map<
    string,
    { midiNote: number; velocity: number; trackIndex: number; harmonic: number }
  >();
  if (calibrated) {
    const pool = dynamicChannels.slice(
      0,
      Math.max(1, Math.min(15, options.calibratedChannelCount ?? 15)),
    );
    for (const channel of pool) {
      const track = output.addTrack();
      track.name = `${options.mpe ? "MPE" : "Calibrated"} voice · channel ${channel + 1}`;
      track.channel = channel;
      track.instrument.number = options.programNumber ?? 0;
      addRpnSetup(track, bendRange);
      dynamicTracks.set(channel, track);
    }
  } else {
    harmonics.forEach((harmonic, index) => {
      const offset = harmonicOffset(harmonic);
      const track = output.addTrack();
      track.name = `H${harmonic} (+${offset.semitones}, ${offset.cents >= 0 ? "+" : ""}${offset.cents.toFixed(3)}c)`;
      track.channel = midiChannelForHarmonicIndex(index);
      track.instrument.number = options.programNumber ?? 0;
      addRpnSetup(track, bendRange);
      const fixedBend = pitchBendForCents(offset.cents, bendRange);
      track.addPitchBend({
        ticks: 0,
        value: fixedBend.signed / 8192,
      });
      outputTracks.set(harmonic, track);
    });
  }

  const sourceBendTracks = selectedTracks.filter(
    (track) => track.pitchBends.length > 0,
  );
  if (sourceBendTracks.length && (options.sourcePitchBend ?? "ignore") === "ignore") {
    warnings.push({
      type: "pitch-bend",
      message: `Ignored pitch bends on ${sourceBendTracks.length} selected source track(s).`,
    });
  }
  if (
    sourceBendTracks.length > 1 &&
    (options.sourcePitchBend ?? "ignore") === "add"
  ) {
    warnings.push({
      type: "channel-conflict",
      message:
        "Several source tracks contain pitch bends. One output channel per harmonic cannot preserve independent overlapping bend streams.",
    });
  }

  let outputNoteCount = 0;
  let voiceSequence = 0;
  selectedTracks.forEach((sourceTrack, selectedTrackIndex) => {
    const trackIndex = selectedTrackIndexes[selectedTrackIndex];
    sourceTrack.notes.forEach((note, noteIndex) => {
      const eventId = sourceEventId(trackIndex, note, noteIndex);
      const eventHarmonics = harmonicSelectionPlan.selections[eventId] ?? [];
      const actualForEvent: number[] = [];
      actualSelections[eventId] = actualForEvent;
      const invalidHarmonics = eventHarmonics.filter((harmonic) => {
        const offset = harmonicOffset(harmonic);
        return note.midi + offset.semitones > 127;
      });
      if (invalidHarmonics.length && options.rangePolicy === "drop-source") {
        const position = barAndBeatAtTicks(source, note.ticks);
        warnings.push({
          type: "range",
          message: `Dropped source note ${note.midi}; at least one selected harmonic exceeds MIDI note 127.`,
          trackIndex,
          note: note.midi,
          ticks: note.ticks,
          bar: position.bar,
          beat: position.beat,
        });
        warnings.push({
          type: "range",
          message: `The effective harmonic set for this source note is empty after the range policy; requested {${eventHarmonics.join(", ")}}.`,
          trackIndex,
          note: note.midi,
          ticks: note.ticks,
        });
        continue;
      }
      for (const harmonic of eventHarmonics) {
        const offset = harmonicOffset(harmonic);
        const rangeResult = applyRangePolicy(
          note.midi,
          offset.semitones,
          options.rangePolicy ?? "skip-harmonic",
        );
        if (!rangeResult.keepSource) {
          const position = barAndBeatAtTicks(source, note.ticks);
          warnings.push({
            type: "range",
            message: `Skipped H${harmonic} for source note ${note.midi}; output would be MIDI note ${note.midi + offset.semitones}.`,
            trackIndex,
            note: note.midi,
            harmonic,
            ticks: note.ticks,
            bar: position.bar,
            beat: position.beat,
          });
          continue;
        }
        actualForEvent.push(harmonic);
        const weight = settingWeight(harmonic, options);
        const sourceVelocity = options.flattenDynamics
          ? (options.flattenedVelocity ?? 90)
          : Math.round(note.velocity * 127);
        const scaledSourceVelocity = sourceVelocity * (options.globalVelocityScale ?? 1);
        const velocity =
          options.dynamicsMode === "baked"
            ? bakedVelocity(
                scaledSourceVelocity,
                weight,
                options.gamma ?? 2,
              ) / 127
            : Math.min(127, Math.max(1, Math.round(scaledSourceVelocity))) / 127;
        const durationTicks =
          options.sustainMode === "bake"
            ? noteReleaseTick(
                sourceTrack,
                note.ticks,
                note.ticks + note.durationTicks,
              ) - note.ticks
            : note.durationTicks;
        if (calibrated) {
          const profile = options.calibrationProfile!;
          const mode = options.calibrationMeasureMode ?? "wholeSustainDb";
          const sourceVelocityForProfile = Math.max(1, Math.min(127, Math.round(scaledSourceVelocity)));
          const calibratedVelocity = calibratedVelocityForNote(
            note.midi,
            sourceVelocityForProfile,
            rangeResult.outputNote,
            weight,
            profile,
            mode,
          ).velocity;
          const measuredFrequency = interpolateProfile(
            profile,
            rangeResult.outputNote,
            calibratedVelocity,
            "measuredFrequency",
          );
          if (!measuredFrequency || measuredFrequency <= 0) {
            throw new Error(`No measured piano frequency is available for MIDI note ${rangeResult.outputNote}.`);
          }
          let correctionCents =
            1200 *
            Math.log2(
              (harmonic * midiToFrequency(note.midi, options.a4 ?? 440)) /
                measuredFrequency,
            );
          if ((options.sourcePitchBend ?? "ignore") === "add") {
            correctionCents += sourcePitchCents(
              sourceTrack,
              note.ticks,
              options.sourcePitchBendRange ?? 2,
            );
          }
          const id = `voice-${voiceSequence++}`;
          dynamicRequests.push({
            id,
            note: rangeResult.outputNote,
            startTicks: note.ticks,
            endTicks: note.ticks + durationTicks,
            correctionCents,
          });
          dynamicRequestDetails.set(id, {
            midiNote: rangeResult.outputNote,
            velocity: calibratedVelocity / 127,
            trackIndex,
            harmonic,
          });
          continue;
        }
        outputTracks.get(harmonic)!.addNote({
          midi: rangeResult.outputNote,
          ticks: note.ticks,
          durationTicks,
          velocity,
          noteOffVelocity: note.noteOffVelocity,
        });
        outputNoteCount += 1;
      }
      if (actualForEvent.length < eventHarmonics.length) {
        const effectiveGcd = greatestCommonDivisor(actualForEvent);
        warnings.push({
          type: "range",
          message: `Effective set {${actualForEvent.join(", ")}} differs from requested {${eventHarmonics.join(", ")}} after range skips; GCD ${effectiveGcd}.`,
          trackIndex,
          note: note.midi,
          ticks: note.ticks,
        });
      }
    });
  });

  if (calibrated) {
    const allocation = allocateDynamicVoices(dynamicRequests, {
      channels: [...dynamicTracks.keys()],
      releaseGuardTicks: options.releaseGuardTicks ?? 0,
      exhaustion: options.calibrationExhaustion ?? "steal-oldest",
    });
    for (const event of allocation.events) {
      warnings.push({
        type: "channel-conflict",
        message:
          event.type === "voice-stolen"
            ? `Voice pool full; stole the oldest voice for ${event.noteId}.`
            : `Voice pool full; used the nearest available bend for ${event.noteId}.`,
      });
    }
    for (const assignment of allocation.assignments) {
      const detail = dynamicRequestDetails.get(assignment.id)!;
      const target = dynamicTracks.get(assignment.channel)!;
      const bend = pitchBendForCents(assignment.appliedCorrectionCents, bendRange);
      if (bend.value14Bit === 0 || bend.value14Bit === 16383) {
        warnings.push({
          type: "pitch-bend",
          harmonic: detail.harmonic,
          ticks: assignment.startTicks,
          message: `Calibrated correction for H${detail.harmonic} reached the ±${bendRange} semitone limit at tick ${assignment.startTicks}.`,
        });
      }
      target.addPitchBend({ ticks: assignment.startTicks, value: bend.signed / 8192 });
      target.addNote({
        midi: detail.midiNote,
        ticks: assignment.startTicks,
        durationTicks: Math.max(1, assignment.endTicks - assignment.startTicks),
        velocity: detail.velocity,
      });
      outputNoteCount += 1;
    }
    if ((options.sustainMode ?? "copy") === "copy") {
      for (const target of dynamicTracks.values()) {
        for (const sourceTrack of selectedTracks) {
          for (const cc of sourceTrack.controlChanges[64] ?? []) {
            target.addCC({ number: 64, ticks: cc.ticks, value: cc.value });
          }
        }
      }
    }
  } else {
    for (const harmonic of harmonics) {
      const target = outputTracks.get(harmonic)!;
      if ((options.sustainMode ?? "copy") === "copy") {
        for (const sourceTrack of selectedTracks) {
          for (const cc of sourceTrack.controlChanges[64] ?? []) {
            target.addCC({ number: 64, ticks: cc.ticks, value: cc.value });
          }
        }
      }
      if ((options.sourcePitchBend ?? "ignore") === "add") {
        for (const sourceTrack of sourceBendTracks) {
          const baseCents = harmonicOffset(harmonic).cents;
          for (const bend of sourceTrack.pitchBends) {
            const summedCents =
              baseCents +
              bend.value * (options.sourcePitchBendRange ?? 2) * 100;
            const converted = pitchBendForCents(summedCents, bendRange);
            if (converted.value14Bit === 0 || converted.value14Bit === 16383) {
              warnings.push({
                type: "pitch-bend",
                message: `Combined bend for H${harmonic} reached the ±${bendRange} semitone limit at tick ${bend.ticks}.`,
                ticks: bend.ticks,
                harmonic,
              });
            }
            target.addPitchBend({
              ticks: bend.ticks,
              value: converted.signed / 8192,
            });
          }
        }
      }
    }
  }

  if (options.preserveUnconvertedTracks ?? true) {
    source.tracks.forEach((track, index) => {
      if (selected.has(index)) return;
      const passthrough = output.addTrack();
      passthrough.fromJSON(track.toJSON());
    });
  }

  const eventGroupId = new Map<string, string>();
  for (const group of harmonicSelectionPlan.groups) {
    for (const eventId of group.eventIds) eventGroupId.set(eventId, group.id);
  }
  const effectiveGroups = new Map<
    string,
    { eventIds: string[]; harmonics: number[]; requestedHarmonics: number[] }
  >();
  const skippedLayers: Record<string, number[]> = {};
  for (const event of sourceEvents) {
    const actual = [...(actualSelections[event.id] ?? [])].sort((a, b) => a - b);
    const requested = [...(requestedSelections[event.id] ?? [])].sort((a, b) => a - b);
    skippedLayers[event.id] = requested.filter((harmonic) => !actual.includes(harmonic));
    const groupId = eventGroupId.get(event.id) ?? "unassigned";
    const key = `${groupId}:${actual.join(",")}`;
    const existing = effectiveGroups.get(key);
    if (existing) {
      existing.eventIds.push(event.id);
    } else {
      effectiveGroups.set(key, {
        eventIds: [event.id],
        harmonics: actual,
        requestedHarmonics: requested,
      });
    }
  }
  const effectivePlan: HarmonicSelectionPlan = {
    ...harmonicSelectionPlan,
    selections: actualSelections,
    requestedSelections,
    skippedLayers,
    groups: [...effectiveGroups.entries()].map(([id, group]) => {
      const divisor = greatestCommonDivisor(group.harmonics);
      return {
        id,
        eventIds: group.eventIds,
        harmonics: group.harmonics,
        requestedHarmonics: group.requestedHarmonics,
        gcd: divisor,
        baseMultiplier: divisor,
        intervalSemitones: divisor ? 12 * Math.log2(divisor) : 0,
      };
    }),
  };
  const weightSummary = harmonics
    .map((harmonic) => {
      const weight = settingWeight(harmonic, options);
      return `h${harmonic}_${layerLevelDb(weight).toFixed(0)}dB`;
    })
    .join("-");
  const baseName = sourceName.replace(/\.(mid|midi)$/i, "");
  const outputFileName =
    `${baseName}_absent_${harmonics[0]}-${harmonics[harmonics.length - 1]}_` +
    `${weightSummary}_bend${bendRange}.mid`;
  return {
    midi: output,
    warnings,
    noteCount: outputNoteCount,
    outputTrackCount: output.tracks.length,
    outputFileName,
    settings: {
      ...options,
      harmonics,
      bendRange,
      harmonicSelectionPlan: effectivePlan,
    },
    harmonicSelectionPlan: effectivePlan,
  };
}

export function midiToBytes(midi: Midi) {
  return midi.toArray();
}

export function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType = "audio/midi",
) {
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  const blob = new Blob([payload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function settingsSidecar(result: ConversionResult) {
  return JSON.stringify(
    {
      app: "Absent Note Converter",
      version: 1,
      sourceFileName: result.outputFileName.replace(/_absent_.*$/, ""),
      outputFileName: result.outputFileName,
      parameters: result.settings,
      harmonicSelectionPlan: result.harmonicSelectionPlan,
      warnings: result.warnings,
      convertedNoteCount: result.noteCount,
      outputTrackCount: result.outputTrackCount,
    },
    null,
    2,
  );
}

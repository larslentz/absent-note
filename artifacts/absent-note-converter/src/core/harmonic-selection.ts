import type { Midi, Note } from "@tonejs/midi";

export const SUPPORTED_HARMONICS = Array.from({ length: 15 }, (_, index) => index + 2);

export type HarmonicSelectionMode =
  | "reference"
  | "odd"
  | "even"
  | "constrained-random"
  | "anchored-random"
  | "free-random"
  | "custom";

export type RandomizationScope = "conversion" | "source-note" | "bar";

export type HarmonicSelectionSettings = {
  mode: HarmonicSelectionMode;
  customSet?: number[];
  maximumHarmonic?: number;
  candidatePool?: number[];
  selectedCount?: number;
  minimumCount?: number;
  anchors?: number[];
  optionalPool?: number[];
  optionalCount?: number;
  gcdSafeguard?: boolean;
  seed: string;
  scope: RandomizationScope;
  normalization?: "off" | "sum-squares";
};

export type SelectionEvent = {
  id: string;
  ticks: number;
};

export type SourceNoteEvent = SelectionEvent & {
  trackIndex: number;
  noteIndex: number;
  midi: number;
  durationTicks: number;
  velocity: number;
};

export type TimeSignaturePoint = {
  ticks: number;
  numerator: number;
  denominator: number;
};

export type BarTiming = {
  supported: boolean;
  reason?: string;
  signatures: TimeSignaturePoint[];
  ticksPerQuarter: number;
};

export type HarmonicSelectionGroup = {
  id: string;
  eventIds: string[];
  harmonics: number[];
  requestedHarmonics?: number[];
  gcd: number;
  baseMultiplier: number;
  intervalSemitones: number;
};

export type HarmonicSelectionPlan = {
  settings: HarmonicSelectionSettings;
  sourceEventIds: string[];
  selections: Record<string, number[]>;
  requestedSelections: Record<string, number[]>;
  skippedLayers: Record<string, number[]>;
  groups: HarmonicSelectionGroup[];
};

export function sourceEventId(
  trackIndex: number,
  note: Pick<Note, "ticks" | "midi" | "durationTicks" | "velocity">,
  noteIndex: number,
) {
  const velocity = Math.round(note.velocity * 127);
  return `track-${trackIndex}-note-${note.ticks}-${note.midi}-${note.durationTicks}-${velocity}-${noteIndex}`;
}

export function collectSourceNoteEvents(
  midi: Midi,
  selectedTracks: number[],
): SourceNoteEvent[] {
  const selected = new Set(selectedTracks);
  return midi.tracks.flatMap((track, trackIndex) => {
    if (!selected.has(trackIndex)) return [];
    return track.notes.map((note, noteIndex) => ({
      id: sourceEventId(trackIndex, note, noteIndex),
      ticks: note.ticks,
      trackIndex,
      noteIndex,
      midi: note.midi,
      durationTicks: note.durationTicks,
      velocity: note.velocity,
    }));
  });
}

export function midiBarTiming(midi: Midi): BarTiming {
  return buildBarTiming(
    midi.header.ppq,
    midi.header.timeSignatures.map((signature) => ({
      ticks: signature.ticks,
      numerator: signature.timeSignature[0],
      denominator: signature.timeSignature[1],
    })),
  );
}

export function greatestCommonDivisor(values: number[]): number {
  if (!values.length) return 0;
  const gcdPair = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return a;
  };
  return values.reduce((result, value) => gcdPair(result, value));
}

export function buildBarTiming(
  ticksPerQuarter: number,
  timeSignatures: TimeSignaturePoint[],
): BarTiming {
  const sortedSignatures = [...timeSignatures].sort((a, b) => a.ticks - b.ticks);
  const signatures = sortedSignatures.filter(
    (signature, index) =>
      index === sortedSignatures.length - 1 ||
      signature.ticks !== sortedSignatures[index + 1].ticks,
  );
  const points = signatures.length
    ? signatures[0].ticks > 0
      ? [{ ticks: 0, numerator: 4, denominator: 4 }, ...signatures]
      : signatures
    : [{ ticks: 0, numerator: 4, denominator: 4 }];
  const invalidPpq = !Number.isInteger(ticksPerQuarter) || ticksPerQuarter <= 0;
  if (invalidPpq) {
    return {
      supported: false,
      reason: "This MIDI file does not use a supported PPQ timing division.",
      signatures: points,
      ticksPerQuarter,
    };
  }
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (
      !Number.isInteger(point.ticks) ||
      point.ticks < 0 ||
      !Number.isInteger(point.numerator) ||
      point.numerator < 1 ||
      !Number.isInteger(point.denominator) ||
      point.denominator < 1 ||
      (point.denominator & (point.denominator - 1)) !== 0
    ) {
      return {
        supported: false,
        reason: "The MIDI file contains an unsupported time signature.",
        signatures: points,
        ticksPerQuarter,
      };
    }
    const next = points[index + 1];
    if (!next) continue;
    const ticksPerBar =
      (ticksPerQuarter * 4 * point.numerator) / point.denominator;
    if (!Number.isInteger(ticksPerBar) || ticksPerBar <= 0) {
      return {
        supported: false,
        reason: "This meter cannot be mapped to whole MIDI ticks.",
        signatures: points,
        ticksPerQuarter,
      };
    }
    const barsAtChange = (next.ticks - point.ticks) / ticksPerBar;
    if (barsAtChange < 0 || Math.abs(barsAtChange - Math.round(barsAtChange)) > 1e-8) {
      return {
        supported: false,
        reason: `The time-signature change at tick ${next.ticks} is not on a bar boundary.`,
        signatures: points,
        ticksPerQuarter,
      };
    }
  }
  return { supported: true, signatures: points, ticksPerQuarter };
}

function barGroup(ticks: number, timing: BarTiming): string {
  if (!timing.supported) {
    throw new Error(timing.reason ?? "Per-bar selection is unavailable for this MIDI timing.");
  }
  let activeIndex = 0;
  for (let index = 0; index < timing.signatures.length; index += 1) {
    if (timing.signatures[index].ticks <= ticks) activeIndex = index;
    else break;
  }
  const signature = timing.signatures[activeIndex];
  const ticksPerBar =
    (timing.ticksPerQuarter * 4 * signature.numerator) / signature.denominator;
  const localBar = Math.floor((ticks - signature.ticks) / ticksPerBar);
  return `bar:${activeIndex}:${localBar}`;
}

function normalizePool(pool: number[], label: string): number[] {
  if (!pool.length) throw new Error(`${label} cannot be empty.`);
  if (pool.some((harmonic) => !Number.isInteger(harmonic) || harmonic < 2 || harmonic > 16)) {
    throw new Error(`${label} must contain unique integer harmonics from 2 through 16; harmonic 1 is not allowed.`);
  }
  return [...new Set(pool)].sort((a, b) => a - b);
}

function combinations(values: number[], count: number): number[][] {
  if (count < 0 || count > values.length) return [];
  const output: number[][] = [];
  const current: number[] = [];
  const visit = (start: number) => {
    if (current.length === count) {
      output.push([...current]);
      return;
    }
    const needed = count - current.length;
    for (let index = start; index <= values.length - needed; index += 1) {
      current.push(values[index]);
      visit(index + 1);
      current.pop();
    }
  };
  visit(0);
  return output;
}

function seedNumber(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseSeeded<T>(values: T[], seed: string): T {
  if (!values.length) throw new Error("No harmonic set satisfies the selected constraints.");
  return values[Math.floor(mulberry32(seedNumber(seed))() * values.length)];
}

function validateSet(set: number[]) {
  if (!set.length) throw new Error("Choose at least one harmonic.");
  normalizePool(set, "The selected set");
}

function getCandidatesForGroup(
  settings: HarmonicSelectionSettings,
  groupId: string,
): number[] {
  const scopeSeed = `${settings.seed}|${settings.scope}|${groupId}`;
  switch (settings.mode) {
    case "reference":
      return [2, 3, 4, 5];
    case "custom": {
      const selected = normalizePool(settings.customSet ?? [], "Custom harmonics");
      return selected;
    }
    case "odd": {
      const max = settings.maximumHarmonic ?? 9;
      if (!Number.isInteger(max) || max < 2 || max > 16) {
        throw new Error("Maximum harmonic must be an integer from 2 through 16.");
      }
      const selected = SUPPORTED_HARMONICS.filter(
        (harmonic) => harmonic <= max && harmonic % 2 === 1,
      );
      validateSet(selected);
      return selected;
    }
    case "even": {
      const max = settings.maximumHarmonic ?? 8;
      if (!Number.isInteger(max) || max < 2 || max > 16) {
        throw new Error("Maximum harmonic must be an integer from 2 through 16.");
      }
      const selected = SUPPORTED_HARMONICS.filter(
        (harmonic) => harmonic <= max && harmonic % 2 === 0,
      );
      validateSet(selected);
      return selected;
    }
    case "constrained-random": {
      const pool = normalizePool(
        settings.candidatePool ?? [2, 3, 4, 5, 6, 7, 8],
        "Candidate pool",
      );
      const count = settings.selectedCount ?? 4;
      const minimumCount = settings.minimumCount ?? 3;
      if (!Number.isInteger(count) || count < 1 || count > pool.length) {
        throw new Error("Selected count must be at least one and no larger than the candidate pool.");
      }
      if (!Number.isInteger(minimumCount) || minimumCount < 1 || minimumCount > count) {
        throw new Error("Minimum count must be an integer from one through the selected count.");
      }
      const valid = combinations(pool, count).filter(
        (candidate) => greatestCommonDivisor(candidate) === 1,
      );
      if (!valid.length) {
        throw new Error("This candidate pool has no GCD 1 subset at the requested count.");
      }
      return chooseSeeded(valid, scopeSeed);
    }
    case "free-random": {
      const pool = normalizePool(
        settings.candidatePool ?? [2, 3, 4, 5, 6, 7, 8],
        "Candidate pool",
      );
      const count = settings.selectedCount ?? 4;
      if (!Number.isInteger(count) || count < 1 || count > pool.length) {
        throw new Error("Selected count must be at least one and no larger than the candidate pool.");
      }
      return chooseSeeded(combinations(pool, count), scopeSeed);
    }
    case "anchored-random": {
      const anchors = normalizePool(settings.anchors ?? [2, 3], "Anchor set");
      const pool = normalizePool(
        settings.optionalPool ?? [4, 5, 6, 7, 8],
        "Optional pool",
      ).filter((harmonic) => !anchors.includes(harmonic));
      const count = settings.optionalCount ?? 2;
      if (!Number.isInteger(count) || count < 0 || count > pool.length) {
        throw new Error("Optional count must be an integer no larger than the available optional pool.");
      }
      const safeguard = settings.gcdSafeguard ?? true;
      const valid = combinations(pool, count)
        .map((optional) => [...anchors, ...optional].sort((a, b) => a - b))
        .filter((candidate) => !safeguard || greatestCommonDivisor(candidate) === 1);
      if (!valid.length) {
        throw new Error("No anchored selection satisfies the requested GCD safeguard.");
      }
      return chooseSeeded(valid, scopeSeed);
    }
  }
}

export function createHarmonicSelectionPlan(
  events: SelectionEvent[],
  settings: HarmonicSelectionSettings,
  timing: BarTiming,
): HarmonicSelectionPlan {
  if (!settings.seed.trim()) throw new Error("Enter a random seed.");
  if (settings.scope === "bar" && !timing.supported) {
    throw new Error(timing.reason ?? "Per-bar selection is unavailable for this MIDI timing.");
  }
  const grouping = new Map<string, SelectionEvent[]>();
  const orderedEvents = [...events].sort(
    (a, b) => a.ticks - b.ticks || a.id.localeCompare(b.id),
  );
  for (const event of orderedEvents) {
    const groupId =
      settings.scope === "conversion"
        ? "conversion"
        : settings.scope === "source-note"
          ? `event:${event.id}`
          : barGroup(event.ticks, timing);
    const groupEvents = grouping.get(groupId) ?? [];
    groupEvents.push(event);
    grouping.set(groupId, groupEvents);
  }
  const selections: Record<string, number[]> = {};
  const requestedSelections: Record<string, number[]> = {};
  const groups: HarmonicSelectionGroup[] = [];
  for (const [id, groupEvents] of grouping) {
    const harmonics = getCandidatesForGroup(settings, id);
    validateSet(harmonics);
    const divisor = greatestCommonDivisor(harmonics);
    for (const event of groupEvents) {
      selections[event.id] = [...harmonics];
      requestedSelections[event.id] = [...harmonics];
    }
    groups.push({
      id,
      eventIds: groupEvents.map((event) => event.id),
      harmonics,
      requestedHarmonics: [...harmonics],
      gcd: divisor,
      baseMultiplier: divisor,
      intervalSemitones: 12 * Math.log2(divisor),
    });
  }
  return {
    settings: { ...settings },
    sourceEventIds: orderedEvents.map((event) => event.id),
    selections,
    requestedSelections,
    skippedLayers: {},
    groups,
  };
}

export function summarizeGcdGroups(groups: HarmonicSelectionGroup[]) {
  const counts = new Map<number, number>();
  for (const group of groups) {
    counts.set(group.gcd, (counts.get(group.gcd) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([gcd, count]) => ({
      gcd,
      count,
      baseMultiplier: gcd,
      intervalSemitones: 12 * Math.log2(gcd),
    }));
}

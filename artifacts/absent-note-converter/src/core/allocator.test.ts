import { describe, expect, it } from "vitest";
import { allocateDynamicVoices } from "./allocator";

describe("dynamic channel allocator", () => {
  it("does not share an overlapping same pitch when nearest-correction channels are exhausted", () => {
    expect(() => allocateDynamicVoices([
      { id: "first", note: 60, startTicks: 0, endTicks: 480, correctionCents: 0 },
      { id: "second", note: 60, startTicks: 120, endTicks: 240, correctionCents: 1 },
    ], { channels: [0], exhaustion: "nearest-correction" })).toThrow(/Insufficient channels/);
  });
  it("never gives overlapping differently tuned notes the same applied bend", () => {
    const result = allocateDynamicVoices(
      [
        { id: "a", note: 60, startTicks: 0, endTicks: 100, correctionCents: -4 },
        { id: "b", note: 64, startTicks: 20, endTicks: 120, correctionCents: 6 },
        { id: "c", note: 67, startTicks: 40, endTicks: 140, correctionCents: 12 },
      ],
      { channels: [0, 1], exhaustion: "nearest-correction" },
    );
    for (let left = 0; left < result.assignments.length; left += 1) {
      for (let right = left + 1; right < result.assignments.length; right += 1) {
        const a = result.assignments[left];
        const b = result.assignments[right];
        const overlaps = a.startTicks < b.endTicks && b.startTicks < a.endTicks;
        if (overlaps && a.channel === b.channel) {
          expect(a.appliedCorrectionCents).toBe(b.appliedCorrectionCents);
        }
      }
    }
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("nearest-correction");
  });

  it("steals the oldest voice and truncates it before channel reuse", () => {
    const result = allocateDynamicVoices(
      [
        { id: "old", note: 60, startTicks: 0, endTicks: 120, correctionCents: 1 },
        { id: "new", note: 64, startTicks: 30, endTicks: 90, correctionCents: 9 },
      ],
      { channels: [2], exhaustion: "steal-oldest" },
    );
    expect(result.assignments[0].endTicks).toBe(30);
    expect(result.assignments[1].channel).toBe(2);
    expect(result.events[0].type).toBe("voice-stolen");
  });
});

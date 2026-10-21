export type DynamicVoiceRequest = {
  id: string;
  note: number;
  startTicks: number;
  endTicks: number;
  correctionCents: number;
};

export type DynamicVoiceAssignment = DynamicVoiceRequest & {
  channel: number;
  appliedCorrectionCents: number;
};

export type AllocatorEvent = {
  type: "voice-stolen" | "nearest-correction";
  noteId: string;
  channel: number;
  requestedCorrectionCents: number;
  appliedCorrectionCents: number;
};

export type VoiceAllocation = {
  assignments: DynamicVoiceAssignment[];
  events: AllocatorEvent[];
};

type ActiveVoice = DynamicVoiceAssignment & { guardedEndTicks: number };

export function allocateDynamicVoices(
  requests: DynamicVoiceRequest[],
  options: {
    channels?: number[];
    releaseGuardTicks?: number;
    exhaustion?: "steal-oldest" | "nearest-correction";
  } = {},
): VoiceAllocation {
  const channels = options.channels ?? [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15,
  ];
  if (!channels.length || channels.some((channel) => channel < 0 || channel > 15)) {
    throw new RangeError("Voice allocation requires valid MIDI channels.");
  }
  const guard = Math.max(0, options.releaseGuardTicks ?? 0);
  const exhaustion = options.exhaustion ?? "steal-oldest";
  const active: ActiveVoice[] = [];
  const assignments: DynamicVoiceAssignment[] = [];
  const events: AllocatorEvent[] = [];
  const ordered = [...requests].sort(
    (a, b) => a.startTicks - b.startTicks || a.endTicks - b.endTicks,
  );
  for (const request of ordered) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].guardedEndTicks <= request.startTicks) active.splice(index, 1);
    }
    const freeChannel = channels.find(
      (channel) => !active.some((voice) => voice.channel === channel),
    );
    let assignment: DynamicVoiceAssignment;
    if (freeChannel !== undefined) {
      assignment = { ...request, channel: freeChannel, appliedCorrectionCents: request.correctionCents };
    } else if (exhaustion === "steal-oldest") {
      const oldest = [...active].sort(
        (a, b) => a.startTicks - b.startTicks || a.endTicks - b.endTicks,
      )[0];
      const stolen = assignments.find((item) => item.id === oldest.id);
      if (stolen) {
        stolen.endTicks = Math.min(stolen.endTicks, request.startTicks);
      }
      const activeIndex = active.findIndex((item) => item.id === oldest.id);
      if (activeIndex !== -1) active.splice(activeIndex, 1);
      events.push({
        type: "voice-stolen",
        noteId: request.id,
        channel: oldest.channel,
        requestedCorrectionCents: request.correctionCents,
        appliedCorrectionCents: request.correctionCents,
      });
      assignment = {
        ...request,
        channel: oldest.channel,
        appliedCorrectionCents: request.correctionCents,
      };
    } else {
      const nearest = [...active].sort(
        (a, b) =>
          Math.abs(a.appliedCorrectionCents - request.correctionCents) -
          Math.abs(b.appliedCorrectionCents - request.correctionCents),
      )[0];
      events.push({
        type: "nearest-correction",
        noteId: request.id,
        channel: nearest.channel,
        requestedCorrectionCents: request.correctionCents,
        appliedCorrectionCents: nearest.appliedCorrectionCents,
      });
      assignment = {
        ...request,
        channel: nearest.channel,
        appliedCorrectionCents: nearest.appliedCorrectionCents,
      };
    }
    assignments.push(assignment);
    active.push({
      ...assignment,
      guardedEndTicks: assignment.endTicks + guard,
    });
  }
  return { assignments, events };
}

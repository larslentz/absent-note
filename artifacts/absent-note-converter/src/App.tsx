import { useEffect, useMemo, useRef, useState } from 'react';
import { Midi } from '@tonejs/midi';
import {
  Activity, ArrowDownToLine, AudioLines, Check, ChevronDown, CircleHelp,
  FileMusic, FolderOpen, Info, Keyboard, Music2, Pause, Play,
  RotateCcw, Save, Settings2, ShieldCheck, SkipBack, SlidersHorizontal,
  Upload, Volume2, X,
} from 'lucide-react';
import { harmonicOffset, harmonicWeight, layerLevelDb, weightFromDecibels } from './core/math';
import {
  convertMidi,
  downloadBytes,
  midiToBytes,
  parseMidi,
  settingsSidecar,
  summarizeTracks,
  type ConversionResult,
  type TrackSummary,
} from './core/midi';
import { pitchBendForCents } from './core/math';
import { midiToFrequency } from './core/math';
import { playPreview, renderPreviewWav, type PreviewVariant } from './core/preview';
import {
  collectSourceNoteEvents,
  createHarmonicSelectionPlan,
  greatestCommonDivisor,
  midiBarTiming,
  SUPPORTED_HARMONICS,
  summarizeGcdGroups,
  type HarmonicSelectionMode,
  type HarmonicSelectionPlan,
  type HarmonicSelectionSettings,
  type RandomizationScope,
} from './core/harmonic-selection';
import {
  analyzeCalibrationAudio,
  createCalibrationMidi,
  createCalibrationSchedule,
  detectVelocityLayerJumps,
  DEFAULT_CALIBRATION_WINDOWS,
  type CalibrationMeasurement,
  type CalibrationProfile,
  type CalibrationSchedule,
} from './core/calibration';
import {
  exportCalibrationProfile,
  importCalibrationProfile,
  listCalibrationProfiles,
  saveCalibrationProfile,
} from './core/profile-storage';

type ToastMessage = string | null;

function Toggle({ checked, onChange, label, testId }: { checked: boolean; onChange: () => void; label: string; testId: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} data-testid={testId} className={`toggle ${checked ? 'on' : ''}`} onClick={onChange} />;
}

function HarmonicChooser({ values, selected, onToggle, testPrefix }: {
  values: number[];
  selected: number[];
  onToggle: (harmonic: number) => void;
  testPrefix: string;
}) {
  return <div className="harmonic-pool" role="group" aria-label="Harmonic candidates">
    {values.map(harmonic => <button
      type="button"
      key={harmonic}
      className={`harmonic ${selected.includes(harmonic) ? 'active' : ''}`}
      aria-pressed={selected.includes(harmonic)}
      aria-label={`Harmonic ${harmonic}`}
      onClick={() => onToggle(harmonic)}
      data-testid={`${testPrefix}-${harmonic}`}
    >{harmonic}</button>)}
  </div>;
}

function PianoRoll({ midi, selectedTracks, harmonics, selectionPlan }: {
  midi: Midi | null;
  selectedTracks: number[];
  harmonics: number[];
  selectionPlan?: HarmonicSelectionPlan | null;
}) {
  const sourceEvents = midi ? collectSourceNoteEvents(midi, selectedTracks) : [];
  const notes = sourceEvents.flatMap(event => {
    const note = midi?.tracks[event.trackIndex]?.notes[event.noteIndex];
    if (!note) return [];
    const eventHarmonics = selectionPlan?.selections[event.id] ?? harmonics;
    return [
      { midi: note.midi, time: note.time, duration: note.duration, source: true, harmonic: 1 },
      ...eventHarmonics.map(harmonic => ({ midi: note.midi + harmonicOffset(harmonic).semitones, time: note.time, duration: note.duration, source: false, harmonic })),
    ];
  }).filter(note => note.midi <= 127);
  const minNote = notes.length ? Math.max(0, Math.min(...notes.map(note => note.midi)) - 2) : 57;
  const maxNote = notes.length ? Math.min(127, Math.max(...notes.map(note => note.midi)) + 2) : 73;
  const range = Math.max(1, maxNote - minNote + 1);
  const duration = Math.max(1, midi?.duration ?? 1);
  const rows = Array.from({ length: Math.min(range, 24) }, (_, index) => maxNote - index);
  const colors: Record<number, string> = { 2: '#7bc2ad', 3: '#80aee0', 4: '#d4b577', 5: '#c58bd1', 6: '#d48676', 7: '#a3c66a', 8: '#8db8c9', 9: '#7ea9a1', 10: '#c98970', 11: '#a4a8d5', 12: '#8dc77e', 13: '#d6a85c', 14: '#7dbde0', 15: '#d27d9c', 16: '#b2c773' };
  return (
    <svg className="piano-roll" viewBox="0 0 620 134" preserveAspectRatio="none" role="img" aria-label={midi ? "Source notes and harmonic note layout" : "Piano roll waiting for MIDI"}>
      <rect width="620" height="134" fill="#12171c" />
      {rows.map((note, i) => {
        const y = i * (134 / rows.length);
        const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
        return <g key={note}>
          <rect x="0" y={y} width="620" height={134 / rows.length} fill={isBlack ? '#171c21' : '#14191e'} />
          <line x1="31" y1={y + 8.2} x2="620" y2={y + 8.2} stroke="#283039" strokeWidth=".7" />
          <text x="5" y={y + 6.1} fill={isBlack ? '#58636d' : '#75818a'} fontSize="6.5" fontFamily="DM Mono">{note}</text>
        </g>;
      })}
      {[31, 105, 179, 253, 327, 401, 475, 549, 620].map(x => <line key={x} x1={x} y1="0" x2={x} y2="134" stroke="#29313a" strokeWidth=".8" />)}
      {notes.map((note, index) => {
        const y = ((maxNote - note.midi) / range) * 134 + 1;
        const x = 32 + (note.time / duration) * 584;
        const width = Math.max(2, (note.duration / duration) * 584);
        return <rect key={`${note.midi}-${note.time}-${note.harmonic}-${index}`} x={x} y={y} width={width} height={Math.max(2, 134 / range - 1)} rx="1" fill={note.source ? 'none' : colors[note.harmonic]} stroke={note.source ? '#69747d' : colors[note.harmonic]} strokeWidth={note.source ? '1' : '0'} opacity={note.source ? '.65' : '.82'} />;
      })}
      {!sourceEvents.length && <text x="325" y="72" textAnchor="middle" fill="#67757d" fontSize="9" fontFamily="DM Mono">IMPORT A MIDI FILE TO VIEW NOTES</text>}
      <text x="590" y="127" textAnchor="end" fill="#56636a" fontSize="6.5" fontFamily="DM Mono">bars →</text>
    </svg>
  );
}

function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const calibrationWavInput = useRef<HTMLInputElement>(null);
  const profileFileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceMidi, setSourceMidi] = useState<Midi | null>(null);
  const [trackSummaries, setTrackSummaries] = useState<TrackSummary[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [harmonics, setHarmonics] = useState<number[]>([2, 3, 4, 5]);
  const [selectionMode, setSelectionMode] = useState<HarmonicSelectionMode>('reference');
  const [oddMaximum, setOddMaximum] = useState(9);
  const [evenMaximum, setEvenMaximum] = useState(8);
  const [candidatePool, setCandidatePool] = useState<number[]>([2, 3, 4, 5, 6, 7, 8]);
  const [selectedCount, setSelectedCount] = useState(4);
  const [minimumCount, setMinimumCount] = useState(3);
  const [anchors, setAnchors] = useState<number[]>([2, 3]);
  const [optionalPool, setOptionalPool] = useState<number[]>([4, 5, 6, 7, 8]);
  const [optionalCount, setOptionalCount] = useState(2);
  const [gcdSafeguard, setGcdSafeguard] = useState(true);
  const [randomSeed, setRandomSeed] = useState('absent-note-demo-1');
  const [randomScope, setRandomScope] = useState<RandomizationScope>('conversion');
  const [normalization, setNormalization] = useState<'off' | 'sum-squares'>('off');
  const [inspectedEventId, setInspectedEventId] = useState('');
  const [alpha, setAlpha] = useState(0);
  const [weightPreset, setWeightPreset] = useState<'Equal' | 'Gentle' | 'Strong' | 'Alpha' | 'Custom'>('Equal');
  const [customDb, setCustomDb] = useState<Record<number, number>>(
    Object.fromEntries(SUPPORTED_HARMONICS.map(harmonic => [harmonic, 0])),
  );
  const [gain, setGain] = useState(72);
  const [gamma, setGamma] = useState(2);
  const [globalVelocityScale, setGlobalVelocityScale] = useState(1);
  const [preserveDynamics, setPreserveDynamics] = useState(true);
  const [preserveUnconverted, setPreserveUnconverted] = useState(true);
  const [useProgramChange, setUseProgramChange] = useState(false);
  const [programNumber, setProgramNumber] = useState(0);
  const [dynamicsMode, setDynamicsMode] = useState<'external' | 'baked'>('external');
  const [rangePolicy, setRangePolicy] = useState<'skip-harmonic' | 'drop-source'>('skip-harmonic');
  const [tuning, setTuning] = useState('440');
  const [bendRange, setBendRange] = useState('2');
  const [sustain, setSustain] = useState(true);
  const [pitchBend, setPitchBend] = useState(false);
  const [calibrationEnabled, setCalibrationEnabled] = useState(false);
  const [calibratedChannelCount, setCalibratedChannelCount] = useState(15);
  const [releaseGuardMs, setReleaseGuardMs] = useState(100);
  const [calibrationExhaustion, setCalibrationExhaustion] = useState<'steal-oldest' | 'nearest-correction'>('steal-oldest');
  const [mpe, setMpe] = useState(false);
  const [profile, setProfile] = useState('');
  const [profileName, setProfileName] = useState('My piano');
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);
  const [measurements, setMeasurements] = useState<CalibrationMeasurement[]>([]);
  const [calibrationSchedule, setCalibrationSchedule] = useState<CalibrationSchedule | null>(null);
  const [calibrationVelocities, setCalibrationVelocities] = useState('32, 48, 64, 80, 96, 112');
  const [calibrationDuration, setCalibrationDuration] = useState(2);
  const [calibrationSilence, setCalibrationSilence] = useState(2);
  const [calibrationWindows, setCalibrationWindows] = useState(DEFAULT_CALIBRATION_WINDOWS);
  const [calibrationMode, setCalibrationMode] = useState<'wholeAttackDb' | 'wholeSustainDb' | 'fundamentalAttackDb' | 'fundamentalSustainDb'>('wholeSustainDb');
  const [soloHarmonic, setSoloHarmonic] = useState<number | null>(null);
  const [mutedHarmonics, setMutedHarmonics] = useState<number[]>([]);
  const [loopPreview, setLoopPreview] = useState(false);
  const [loopStartSec, setLoopStartSec] = useState('0');
  const [loopEndSec, setLoopEndSec] = useState('');
  const [ab, setAb] = useState<'A' | 'B' | 'R'>('A');
  const [profileSaved, setProfileSaved] = useState(false);
  const [fileFormat, setFileFormat] = useState<string | null>(null);
  const previewRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const sourceEvents = useMemo(
    () => sourceMidi ? collectSourceNoteEvents(sourceMidi, selectedTracks) : [],
    [sourceMidi, selectedTracks],
  );
  const barTiming = useMemo(
    () => sourceMidi ? midiBarTiming(sourceMidi) : {
      supported: true,
      signatures: [{ ticks: 0, numerator: 4, denominator: 4 }],
      ticksPerQuarter: 480,
    },
    [sourceMidi],
  );
  const harmonicSelectionSettings = useMemo<HarmonicSelectionSettings>(() => ({
    mode: selectionMode,
    customSet: harmonics,
    maximumHarmonic: selectionMode === 'odd' ? oddMaximum : evenMaximum,
    candidatePool,
    selectedCount,
    minimumCount,
    anchors,
    optionalPool,
    optionalCount,
    gcdSafeguard,
    seed: randomSeed,
    scope: randomScope,
    normalization,
  }), [selectionMode, harmonics, oddMaximum, evenMaximum, candidatePool, selectedCount, minimumCount, anchors, optionalPool, optionalCount, gcdSafeguard, randomSeed, randomScope, normalization]);
  const selectionPlanState = useMemo(() => {
    try {
      const events = sourceEvents.length ? sourceEvents : [{ id: 'selection-preview', ticks: 0 }];
      return {
        plan: createHarmonicSelectionPlan(events, harmonicSelectionSettings, barTiming),
        error: null as string | null,
      };
    } catch (error) {
      return {
        plan: null as HarmonicSelectionPlan | null,
        error: error instanceof Error ? error.message : 'Harmonic selection settings are invalid.',
      };
    }
  }, [sourceEvents, harmonicSelectionSettings, barTiming]);
  const selectionPlan = selectionPlanState.plan;
  const inspectedEvent = sourceEvents.find(event => event.id === inspectedEventId) ?? sourceEvents[0] ?? null;
  const activeHarmonics =
    (inspectedEvent && selectionPlan?.selections[inspectedEvent.id]) ??
    selectionPlan?.groups[0]?.harmonics ??
    harmonics;
  const plannedHarmonics = [...new Set(Object.values(selectionPlan?.selections ?? {}).flat())].sort((a, b) => a - b);
  const randomMode = selectionMode.endsWith('random');
  const activeGcd = greatestCommonDivisor(activeHarmonics);
  const validTuning = Number.isFinite(Number(tuning)) && Number(tuning) > 0;
  const displayTuning = validTuning ? Number(tuning) : 440;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const onFile = async (selected?: File) => {
    if (!selected) return;
    if (!/\.(mid|midi)$/i.test(selected.name)) {
      notify('Choose a .mid or .midi file.');
      return;
    }
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const parsed = parseMidi(bytes);
      const summaries = summarizeTracks(parsed);
      const defaults = summaries
        .filter(track => track.selectedByDefault)
        .map(track => track.index);
      const formatNumber = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(8, false);
      setFile(selected);
      setSourceMidi(parsed);
      setTrackSummaries(summaries);
      setSelectedTracks(defaults);
      setInspectedEventId(collectSourceNoteEvents(parsed, defaults)[0]?.id ?? '');
      setConversion(null);
      setFileFormat(formatNumber === 0 ? 'Type 0' : `Type ${formatNumber}`);
      notify(`Loaded ${summaries.length} track${summaries.length === 1 ? '' : 's'} locally.`);
    } catch (error) {
      setSourceMidi(null);
      setTrackSummaries([]);
      setSelectedTracks([]);
      notify(error instanceof Error ? error.message : 'The MIDI file could not be read.');
    }
  };

  const openDemo = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo_melody.mid`);
      if (!response.ok) throw new Error("The bundled demo MIDI could not be loaded.");
      const demo = new File([await response.blob()], "demo_melody.mid", {
        type: "audio/midi",
      });
      await onFile(demo);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not open the demo.");
    }
  };

  const convertCurrentMidi = (): ConversionResult | null => {
    if (!sourceMidi || !file) {
      notify('Import a MIDI file before converting.');
      return null;
    }
    if (!selectedTracks.length) {
      notify('Select at least one track to convert.');
      return null;
    }
    if (selectionPlanState.error) {
      notify(selectionPlanState.error);
      return null;
    }
    if (!selectionPlan || !activeHarmonics.length) {
      notify('Select at least one valid harmonic set.');
      return null;
    }
    try {
      setBusy(true);
      const result = convertMidi(sourceMidi, {
        selectedTracks,
        harmonics: activeHarmonics,
        a4: Number(tuning),
        bendRange: Number(bendRange),
        alpha,
        customDb: weightPreset === 'Custom' ? customDb : undefined,
        dynamicsMode,
        gamma,
        globalVelocityScale,
        flattenDynamics: !preserveDynamics,
        rangePolicy,
        sustainMode: sustain ? 'copy' : 'bake',
        preserveUnconvertedTracks: preserveUnconverted,
        sourcePitchBend: pitchBend ? 'add' : 'ignore',
        calibrationEnabled,
        calibrationProfile: profiles.find(item => item.id === profile),
        calibrationMeasureMode: calibrationMode,
        calibratedChannelCount,
        releaseGuardTicks: sourceMidi
          ? Math.round(releaseGuardMs * sourceMidi.header.ppq * (sourceMidi.header.tempos[0]?.bpm ?? 120) / 60_000)
          : 0,
        calibrationExhaustion,
        mpe,
        programNumber: useProgramChange ? programNumber : undefined,
        harmonicSelectionPlan: selectionPlan,
      }, file.name);
      setConversion(result);
      notify(`Converted ${result.noteCount} harmonic notes across ${result.outputTrackCount} tracks.`);
      return result;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'MIDI conversion failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const exportMidi = () => {
    const current = convertCurrentMidi();
    if (!current) return;
    downloadBytes(midiToBytes(current.midi), current.outputFileName);
    const sidecar = new TextEncoder().encode(settingsSidecar(current));
    downloadBytes(sidecar, current.outputFileName.replace(/\.mid$/i, '.json'), 'application/json');
    notify('Downloaded the new MIDI file and settings sidecar.');
  };

  const exportWav = async () => {
    if (!sourceMidi) {
      notify('Import a MIDI file before rendering audio.');
      return;
    }
    if (selectionPlanState.error) { notify(selectionPlanState.error); return; }
    try {
      const blob = await renderPreviewWav(sourceMidi, {
        tracks: selectedTracks,
        harmonics: activeHarmonics,
        alpha,
        a4: Number(tuning),
        variant: ab === 'A' ? 'original' : ab === 'R' ? 'reference' : 'absent',
        soloHarmonic,
        mutedHarmonics,
        selectionPlan: selectionPlan ?? undefined,
        customDb: weightPreset === 'Custom' ? customDb : undefined,
        normalization,
        rangePolicy,
        flattenDynamics: !preserveDynamics,
        globalVelocityScale,
        loopStartSec: loopPreview ? Number(loopStartSec) : undefined,
        loopEndSec: loopPreview ? Number(loopEndSec) || sourceMidi.duration : undefined,
        gain: gain / 100,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${file?.name.replace(/\.(mid|midi)$/i, '') ?? 'preview'}_preview_48k_24bit.wav`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify('Rendered and downloaded a 48 kHz, 24-bit preview WAV.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'WAV render failed.');
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (event.code === 'Space' && !isTyping) {
        event.preventDefault();
        if (!sourceMidi) {
          notify('Import a MIDI file before playing the preview.');
          return;
        }
        setPlaying(current => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sourceMidi]);

  useEffect(() => {
    let cancelled = false;
    let endTimer: number | undefined;
    if (!playing || !sourceMidi) {
      previewRef.current?.stop();
      previewRef.current = null;
      return;
    }
    if (!selectionPlan) {
      setPlaying(false);
      notify(selectionPlanState.error ?? 'Choose a valid harmonic set.');
      return;
    }
    const options = {
      tracks: selectedTracks,
       harmonics: activeHarmonics,
      alpha,
      a4: Number(tuning),
      variant: (ab === 'A' ? 'original' : ab === 'R' ? 'reference' : 'absent') as PreviewVariant,
      soloHarmonic,
      mutedHarmonics,
      selectionPlan: selectionPlan ?? undefined,
      customDb: weightPreset === 'Custom' ? customDb : undefined,
      normalization,
      rangePolicy,
      flattenDynamics: !preserveDynamics,
      globalVelocityScale,
      loop: loopPreview,
      loopStartSec: loopPreview ? Number(loopStartSec) : undefined,
      loopEndSec: loopPreview ? Number(loopEndSec) || sourceMidi.duration : undefined,
      gain: gain / 100,
    };
    playPreview(sourceMidi, options).then(handle => {
      if (cancelled) {
        void handle.stop();
        return;
      }
      previewRef.current = handle;
      if (Number.isFinite(handle.duration)) {
        endTimer = window.setTimeout(() => setPlaying(false), handle.duration * 1000 + 120);
      }
    }).catch(error => {
      setPlaying(false);
      notify(error instanceof Error ? error.message : 'Could not start audio preview.');
    });
    return () => {
      cancelled = true;
      if (endTimer) window.clearTimeout(endTimer);
      previewRef.current?.stop();
      previewRef.current = null;
    };
  }, [playing, sourceMidi, selectedTracks, activeHarmonics, alpha, tuning, ab, soloHarmonic, mutedHarmonics, gain, loopPreview, loopStartSec, loopEndSec, selectionPlan, customDb, weightPreset, normalization, rangePolicy, preserveDynamics, globalVelocityScale]);

  const toggleHarmonic = (n: number) => {
    setSelectionMode('custom');
    setHarmonics(current => current.includes(n) ? current.filter(value => value !== n) : [...current, n].sort((a, b) => a - b));
  };
  const selectedTrackToggle = (index: number) => setSelectedTracks(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index].sort((a, b) => a - b));
  const weightForUi = (harmonic: number) => weightPreset === 'Custom'
    ? weightFromDecibels(customDb[harmonic] ?? 0)
    : harmonicWeight(harmonic, alpha);

  useEffect(() => {
    let active = true;
    listCalibrationProfiles().then(items => {
      if (active) setProfiles(items);
    }).catch(() => {
      if (active) notify('Local profile storage is unavailable in this browser.');
    });
    return () => { active = false; };
  }, []);

  const generateCalibrationFiles = () => {
    if (!sourceMidi || !selectedTracks.length) {
      notify('Import a MIDI file and select tracks before generating calibration MIDI.');
      return;
    }
    const keys = [...new Set(sourceMidi.tracks.flatMap((track, index) =>
      selectedTracks.includes(index)
        ? track.notes.flatMap(note => plannedHarmonics.map(h => note.midi + harmonicOffset(h).semitones).filter(key => key <= 127))
        : [],
    ))].sort((a, b) => a - b);
    if (!keys.length) {
      notify('No in-range harmonic notes are available for calibration.');
      return;
    }
    const velocityValues = calibrationVelocities
      .split(',')
      .map(value => Number(value.trim()))
      .filter(value => Number.isFinite(value));
    const schedule = createCalibrationSchedule(keys, velocityValues, {
      durationSec: calibrationDuration,
      silenceSec: calibrationSilence,
    });
    const midi = createCalibrationMidi(schedule);
    downloadBytes(midiToBytes(midi), 'piano_calibration.mid');
    downloadBytes(new TextEncoder().encode(JSON.stringify(schedule, null, 2)), 'piano_calibration_schedule.json', 'application/json');
    setCalibrationSchedule(schedule);
    notify(`Calibration sweep prepared for ${keys.length} keys. Render it through your exact piano patch.`);
  };

  const analyzeCalibrationFile = async (selected?: File) => {
    if (!selected) return;
    if (!calibrationSchedule) {
      notify('Generate the calibration MIDI and schedule before analyzing a recording.');
      return;
    }
    try {
      const AudioClass = window.AudioContext;
      if (!AudioClass) throw new Error('Audio decoding is unavailable in this browser.');
      const context = new AudioClass();
      const audio = await context.decodeAudioData(await selected.arrayBuffer());
      const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
      const mono = new Float32Array(audio.length);
      for (const channel of channels) {
        for (let index = 0; index < mono.length; index += 1) mono[index] += channel[index] / channels.length;
      }
      await context.close();
      const found = analyzeCalibrationAudio(mono, audio.sampleRate, calibrationSchedule, {
        a4: Number(tuning),
        windows: calibrationWindows,
      });
      setMeasurements(found);
      setProfileSaved(false);
      notify(`Measured ${found.length} key and velocity combinations locally.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not decode or analyze that WAV file.');
    }
  };

  const saveCurrentProfile = async () => {
    if (!measurements.length) {
      notify('Analyze a piano recording before saving a profile.');
      return;
    }
    const created: CalibrationProfile = {
      id: profile || crypto.randomUUID(),
      name: profileName.trim() || 'My piano',
      createdAt: new Date().toISOString(),
      measurements,
    };
    try {
      await saveCalibrationProfile(created);
      setProfiles(await listCalibrationProfiles());
      setProfile(created.id);
      setProfileSaved(true);
      notify('Calibration profile saved in this browser.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save this calibration profile.');
    }
  };

  const exportCurrentProfile = () => {
    const selected = profiles.find(item => item.id === profile);
    if (!selected) {
      notify('Choose or save a calibration profile first.');
      return;
    }
    downloadBytes(new TextEncoder().encode(exportCalibrationProfile(selected)), `${selected.name.replace(/[^a-z0-9-_]+/gi, '_')}_profile.json`, 'application/json');
  };

  const importProfileFile = async (selected?: File) => {
    if (!selected) return;
    try {
      const imported = importCalibrationProfile(await selected.text());
      await saveCalibrationProfile(imported);
      setProfiles(await listCalibrationProfiles());
      setProfile(imported.id);
      setProfileName(imported.name);
      setMeasurements(imported.measurements);
      notify(`Imported profile “${imported.name}” into local storage.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not import that profile.');
    }
  };

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><AudioLines size={17} strokeWidth={2.2} /></div>
          <div><div className="brand-name">Absent Note Converter</div><div className="brand-sub">harmonic study workstation</div></div>
        </div>
        <div className="top-meta">
          <span className="offline-pill" data-testid="status-offline"><i /> LOCAL ONLY · NO UPLOADS</span>
          <button className="top-action" type="button" onClick={() => notify('Keyboard shortcut: spacebar toggles play / stop.')} data-testid="button-shortcuts"><Keyboard size={14} /> Shortcuts</button>
          <button className="top-action" type="button" onClick={() => notify('All processing is designed to stay in this browser.')} data-testid="button-privacy"><ShieldCheck size={14} /> Privacy</button>
        </div>
      </header>

      <main className="main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MIDI · HARMONIC TRANSFORM</div>
            <h1>Find the note that isn’t there.</h1>
            <p className="subtitle">Build the missing-fundamental effect from your own MIDI. Your file stays on this device.</p>
          </div>
          <div className="head-actions">
            <button className="btn" type="button" onClick={() => void openDemo()} data-testid="button-open-example"><FolderOpen size={14} /> Open example</button>
            <button className="btn btn-primary" type="button" onClick={() => fileInput.current?.click()} data-testid="button-import-midi"><Upload size={14} /> Import MIDI</button>
            <input ref={fileInput} className="file-input" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" data-testid="input-midi-file" onChange={event => onFile(event.target.files?.[0])} />
          </div>
        </div>

        <div className="workspace-grid">
          <section className="left-column">
            <article className="panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">01</span><FileMusic size={15} /> MIDI source &amp; tracks</h2>
                <span className={`status-line ${sourceMidi ? 'ready' : ''}`} data-testid="status-midi">{sourceMidi ? 'MIDI PARSED LOCALLY' : 'NO MIDI LOADED'}</span>
              </div>
              <div className="panel-body">
                <button className="upload-zone" type="button" onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void onFile(event.dataTransfer.files[0]); }} data-testid="dropzone-midi">
                  {file ? <div className="upload-file">
                    <div className="file-icon"><FileMusic size={18} /></div>
                    <div className="file-info"><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB · parsed locally · original remains unchanged</span></div>
                    <span className="mini-chip">MIDI SOURCE</span>
                  </div> : <div>
                    <div className="upload-icon"><Upload size={16} /></div>
                    <strong>Drop a MIDI file here or browse</strong>
                    <p>Standard MIDI File · .mid / .midi · local file only</p>
                  </div>}
                </button>
                <div className="file-meta" aria-label="MIDI metadata" data-testid="panel-midi-metadata">
                  <div className="meta-cell"><div className="meta-label">Format</div><div className="meta-value">{fileFormat ?? '—'}</div></div>
                  <div className="meta-cell"><div className="meta-label">Tracks</div><div className="meta-value">{sourceMidi ? trackSummaries.length : '—'}</div></div>
                  <div className="meta-cell"><div className="meta-label">Tempo</div><div className="meta-value">{sourceMidi?.header.tempos[0]?.bpm ? `${sourceMidi.header.tempos[0].bpm.toFixed(1)} BPM` : '—'}</div></div>
                  <div className="meta-cell"><div className="meta-label">Duration</div><div className="meta-value">{sourceMidi ? `${Math.floor(sourceMidi.duration / 60)}:${String(Math.floor(sourceMidi.duration % 60)).padStart(2, '0')}` : '—'}</div></div>
                </div>
                <div className="track-list">
                  {sourceMidi ? <>
                    <div className="track-row">
                      <input className="track-select" type="checkbox" checked={trackSummaries.filter(track => !track.isDrumTrack).every(track => selectedTracks.includes(track.index))} onChange={() => setSelectedTracks(selectedTracks.length ? [] : trackSummaries.filter(track => track.selectedByDefault).map(track => track.index))} aria-label="Select non-drum MIDI tracks" data-testid="checkbox-track-all" />
                      <div><span className="track-name">Select non-drum tracks</span><span className="track-sub">{selectedTracks.length} selected · drums excluded by default</span></div>
                      <div className="track-stat"><em>PPQ</em>{sourceMidi.header.ppq}</div><div className="track-stat"><em>NOTES</em>{trackSummaries.reduce((sum, track) => sum + track.noteCount, 0)}</div>
                    </div>
                    {trackSummaries.map(track => <div className="track-row" key={track.index}>
                      <input className="track-select" type="checkbox" checked={selectedTracks.includes(track.index)} onChange={() => selectedTrackToggle(track.index)} aria-label={`Convert ${track.name}`} data-testid={`checkbox-track-${track.index}`} />
                      <div><span className="track-name">{track.name}{track.isDrumTrack ? ' · DRUMS' : ''}</span><span className="track-sub">{track.lowestNote === null ? 'No notes' : `MIDI ${track.lowestNote}–${track.highestNote}`} {track.hasPitchBend ? ' · pitch bend' : ''} {track.hasSustain ? ' · CC64' : ''}</span></div>
                      <div className="track-stat"><em>CHANNEL</em>{track.channel}</div><div className="track-stat"><em>NOTES</em>{track.noteCount}</div>
                    </div>)}
                    <div className="setting-line"><div className="setting-copy">Pass unselected tracks through<small>Keep unconverted parts unchanged in the new Type 1 MIDI.</small></div><Toggle checked={preserveUnconverted} onChange={() => setPreserveUnconverted(!preserveUnconverted)} label="Pass unselected tracks through" testId="switch-passthrough" /></div>
                  </> : <div className="hint" data-testid="empty-tracks">Import a MIDI file to inspect track names, channels, note counts, and choose which parts to transform.</div>}
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">02</span><SlidersHorizontal size={15} /> Harmonic-Layer Selection</h2>
                <span className="panel-kicker">PARTIALS · k × f₀</span>
              </div>
              <div className="panel-body">
                <div className="control-layout">
                  <div className="control-block">
                    <label className="control-label" htmlFor="selection-mode">Selection mode</label>
                    <select id="selection-mode" className="select" value={selectionMode} onChange={event => setSelectionMode(event.target.value as HarmonicSelectionMode)} data-testid="select-harmonic-mode">
                      <option value="reference">Reference · 2, 3, 4, 5</option><option value="odd">Odd only</option><option value="even">Even only</option><option value="constrained-random">Constrained random</option><option value="anchored-random">Anchored random</option><option value="free-random">Free random · experimental</option><option value="custom">Custom</option>
                    </select>
                    {(selectionMode === 'odd' || selectionMode === 'even') && <label className="selection-field">Maximum harmonic<input className="text-input" type="number" min={selectionMode === 'odd' ? 3 : 2} max="16" value={selectionMode === 'odd' ? oddMaximum : evenMaximum} onChange={event => (selectionMode === 'odd' ? setOddMaximum : setEvenMaximum)(Number(event.target.value))} /></label>}
                    {selectionMode === 'custom' && <HarmonicChooser values={SUPPORTED_HARMONICS} selected={harmonics} onToggle={toggleHarmonic} testPrefix="button-harmonic" />}
                    {(selectionMode === 'constrained-random' || selectionMode === 'free-random') && <>
                      <div className="control-label">Candidate pool</div>
                      <HarmonicChooser values={SUPPORTED_HARMONICS} selected={candidatePool} onToggle={h => setCandidatePool(current => current.includes(h) ? current.filter(n => n !== h) : [...current, h].sort((a,b) => a-b))} testPrefix="candidate" />
                      <label className="selection-field">Selected count<input className="text-input" type="number" min="1" max="15" value={selectedCount} onChange={event => setSelectedCount(Number(event.target.value))} /></label>
                      {selectionMode === 'constrained-random' && <label className="selection-field">Minimum count<input className="text-input" type="number" min="1" max="15" value={minimumCount} onChange={event => setMinimumCount(Number(event.target.value))} /></label>}
                    </>}
                    {selectionMode === 'anchored-random' && <>
                      <div className="control-label">Always retain anchors</div>
                      <HarmonicChooser values={SUPPORTED_HARMONICS} selected={anchors} onToggle={h => setAnchors(current => current.includes(h) ? current.filter(n => n !== h) : [...current, h].sort((a,b) => a-b))} testPrefix="anchor" />
                      <div className="control-label">Optional pool · anchors excluded automatically</div>
                      <HarmonicChooser values={SUPPORTED_HARMONICS} selected={optionalPool} onToggle={h => setOptionalPool(current => current.includes(h) ? current.filter(n => n !== h) : [...current, h].sort((a,b) => a-b))} testPrefix="optional" />
                      <label className="selection-field">Optional count<input className="text-input" type="number" min="0" max="15" value={optionalCount} onChange={event => setOptionalCount(Number(event.target.value))} /></label>
                      <label className="loop-toggle"><input type="checkbox" checked={gcdSafeguard} onChange={event => setGcdSafeguard(event.target.checked)} /> Require GCD = 1</label>
                    </>}
                    {randomMode && <>
                      <label className="selection-field">Seed<input className="text-input" value={randomSeed} onChange={event => setRandomSeed(event.target.value)} data-testid="input-random-seed" /></label>
                      <button className="btn btn-small" type="button" onClick={() => { const bytes = new Uint32Array(4); crypto.getRandomValues(bytes); setRandomSeed(Array.from(bytes, n => n.toString(16)).join('-')); }} data-testid="button-new-seed">New seed</button>
                      <label className="selection-field">Randomization scope<select className="select" value={randomScope} onChange={event => setRandomScope(event.target.value as RandomizationScope)} data-testid="select-random-scope"><option value="conversion">Once per conversion</option><option value="source-note">Per source note event</option><option value="bar" disabled={!barTiming.supported}>Per bar</option></select></label>
                      {!barTiming.supported && <div className="warn-box">{barTiming.reason} Per-bar selection is disabled.</div>}
                      <div className="hint">Sets are chosen at note-on and held through note-off. Count constraints are practical defaults, not guarantees of perceptual success.</div>
                    </>}
                    {selectionMode === 'even' && <div className="warn-box">Even-only sets favor a harmonic base above the source pitch, commonly one octave higher. This mode is not intended to reliably preserve the source pitch.</div>}
                    {selectionMode === 'free-random' && <div className="warn-box">Experimental and potentially pitch-ambiguous. No GCD safeguard is applied.</div>}
                    {selectionPlanState.error && <div className="warn-box" role="alert">{selectionPlanState.error}</div>}
                    <div className="formula" data-testid="text-harmonic-formula">f<sub>out</sub> = h × f<sub>0</sub> <strong>· h ∈ {'{'}{activeHarmonics.join(', ')}{'}'}</strong></div>
                    <div className="hint">Harmonic 1 is never generated. Selected-set GCD: <strong>{activeGcd}</strong> · base multiplier {activeGcd}× · interval +{activeGcd ? (12 * Math.log2(activeGcd)).toFixed(5) : '—'} semitones.</div>
                    <div className={activeGcd > 1 ? 'warn-box' : 'hint'}>{activeGcd > 1 ? `These selected components form a harmonic series based on ${activeGcd} × the source frequency. The perceived pitch may shift.` : 'No higher common integer harmonic base detected. This does not guarantee perception of the source pitch.'}</div>
                    {randomMode && selectionPlan && <div className="hint">Generated groups: {summarizeGcdGroups(selectionPlan.groups).map(group => `${group.count} with GCD ${group.gcd} (${group.baseMultiplier}×, +${group.intervalSemitones.toFixed(5)} st)`).join('; ')}.</div>}
                  </div>
                  <div className="control-block">
                    <div className="control-label"><span>Harmonic weighting</span><span>{weightPreset === 'Custom' ? 'custom dB' : `α = ${alpha.toFixed(1)}`}</span></div>
                    <select className="select" value={weightPreset} onChange={event => { const preset = event.target.value as typeof weightPreset; setWeightPreset(preset); if (preset === 'Equal') setAlpha(0); if (preset === 'Gentle') setAlpha(0.5); if (preset === 'Strong') setAlpha(1); }} data-testid="select-weight-preset">
                      <option value="Equal">Equal · α = 0</option><option value="Gentle">Gentle · α = 0.5</option><option value="Strong">Strong · α = 1</option><option value="Alpha">Custom α curve</option><option value="Custom">Custom per-harmonic dB</option>
                    </select>
                    {weightPreset === 'Alpha' && <div className="range-row"><span className="unit">EQUAL</span><input aria-label="Harmonic weighting alpha" type="range" min="0" max="2" step="0.1" value={alpha} onChange={event => setAlpha(Number(event.target.value))} data-testid="input-harmonic-alpha" /><span className="unit">STRONG</span></div>}
                    <div className="hint">wₕ = (2 / h)<sup>α</sup>. Equal α = 0, Gentle α = 0.5, Strong α = 1.</div>
                    <div className="formula-table" data-testid="table-harmonics">
                      <div className="formula-row formula-header"><span>H</span><span>OFFSET</span><span>CENTS</span><span>BEND / SIGNED</span><span>LEVEL</span></div>
                      {activeHarmonics.map(harmonic => { const offset = harmonicOffset(harmonic); const bend = pitchBendForCents(offset.cents, Number(bendRange)); const weight = weightForUi(harmonic); return <div className="formula-row" key={harmonic}><span>H{harmonic}</span><span>+{offset.semitones}</span><span>{offset.cents >= 0 ? '+' : ''}{offset.cents.toFixed(3)}¢</span><span>{bend.value14Bit} / {bend.signed >= 0 ? '+' : ''}{bend.signed}</span><span>{layerLevelDb(weight).toFixed(1)} dB</span></div>; })}
                      {weightPreset === 'Custom' && plannedHarmonics.map(harmonic => <div className="custom-weight-row" key={`custom-${harmonic}`}><label htmlFor={`custom-db-${harmonic}`}>H{harmonic} custom level</label><input id={`custom-db-${harmonic}`} className="text-input" type="number" min="-60" max="12" step="0.1" value={customDb[harmonic] ?? 0} onChange={event => setCustomDb(current => ({ ...current, [harmonic]: Number(event.target.value) }))} data-testid={`input-custom-db-${harmonic}`} /><span>dB</span></div>)}
                    </div>
                    <div className="control-label" style={{marginTop:15}}><span>Range policy</span></div>
                    <select className="select" value={rangePolicy} onChange={event => setRangePolicy(event.target.value as 'skip-harmonic' | 'drop-source')} data-testid="select-range-policy">
                      <option value="skip-harmonic">Skip only out-of-range harmonic</option><option value="drop-source">Drop whole source note</option>
                    </select>
                  </div>
                </div>
                <div className="warn-box" data-testid="warning-harmonics"><Info size={13} /><span>Higher partials can exceed MIDI 127. Policy: <strong>{rangePolicy === 'skip-harmonic' ? 'skip only the affected harmonic' : 'drop the whole source note'}</strong>. Notes are never octave-wrapped.</span></div>
                <div className="event-inspector" data-testid="event-inspector">
                  <label className="control-label" htmlFor="event-inspector">Source event inspector</label>
                  <select id="event-inspector" className="select" value={inspectedEvent?.id ?? ''} onChange={event => setInspectedEventId(event.target.value)} disabled={!sourceEvents.length}>
                    {!sourceEvents.length && <option value="">Import MIDI to inspect source events</option>}
                    {sourceEvents.map(event => <option key={event.id} value={event.id}>Track {event.trackIndex + 1} · tick {event.ticks} · MIDI {event.midi} · note {event.noteIndex + 1}</option>)}
                  </select>
                  {inspectedEvent && <>
                    <div className="hint">Source MIDI {inspectedEvent.midi} · f₀ = {validTuning ? midiToFrequency(inspectedEvent.midi, displayTuning).toFixed(3) : 'invalid tuning'} Hz · ID: {inspectedEvent.id}</div>
                    <div className="hint">Ideal target frequencies and fixed-layer corrections below. Calibration may apply different corrections to match the measured instrument.</div>
                    {activeHarmonics.map(h => { const offset = harmonicOffset(h); const output = inspectedEvent.midi + offset.semitones; const dropped = output > 127 || (rangePolicy === 'drop-source' && activeHarmonics.some(k => inspectedEvent.midi + harmonicOffset(k).semitones > 127)); return <div className="inspector-row" key={h}>H{h} → MIDI {output} · {offset.cents.toFixed(3)}¢ · {validTuning ? (midiToFrequency(inspectedEvent.midi, displayTuning) * h).toFixed(2) : '—'} Hz · weight {weightForUi(h).toFixed(4)} {dropped ? '· SKIPPED: MIDI range policy' : ''}</div>; })}
                    {(() => { const remaining = activeHarmonics.filter(h => inspectedEvent.midi + harmonicOffset(h).semitones <= 127); const actual = rangePolicy === 'drop-source' && remaining.length !== activeHarmonics.length ? [] : remaining; return actual.length !== activeHarmonics.length ? <div className="warn-box">Effective set after range policy: {'{'}{actual.join(', ')}{'}'} · GCD {greatestCommonDivisor(actual)}. Normalization uses only remaining layers; this differs from the requested set.</div> : null; })()}
                    {conversion && <details><summary className="hint">Last-conversion MIDI events at this onset (may reflect earlier settings)</summary>
                      {conversion.midi.tracks.flatMap((track, index) => track.notes.filter(note => note.ticks === inspectedEvent.ticks && (conversion.harmonicSelectionPlan.selections[inspectedEvent.id] ?? []).some(h => inspectedEvent.midi + harmonicOffset(h).semitones === note.midi)).map((note, noteIndex) => {
                        const bends = track.pitchBends.filter(bend => bend.ticks <= note.ticks);
                        const cents = (bends[bends.length - 1]?.value ?? 0) * (conversion.settings.bendRange ?? 2) * 100;
                        return <div key={`${index}-${noteIndex}`} className="inspector-row">Channel {track.channel + 1} · MIDI {note.midi} · applied bend {cents.toFixed(3)}¢ · velocity {Math.round(note.velocity * 127)} · duration {note.durationTicks} ticks</div>;
                      }))}
                    </details>}
                  </>}
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">03</span><Settings2 size={15} /> Tuning, dynamics &amp; MIDI behavior</h2>
                <span className="panel-kicker">EDITABLE PARAMETERS</span>
              </div>
              <div className="panel-body">
                <div className="control-layout">
                  <div className="control-block">
                    <div className="control-label"><span>Reference tuning</span><span>concert pitch</span></div>
                    <div className="inline-field"><span className="unit">A4 =</span><input className="text-input" type="number" min="400" max="480" value={tuning} onChange={event => setTuning(event.target.value)} data-testid="input-tuning-a4" /><span className="unit">Hz</span></div>
                    <div className="control-label" style={{marginTop:15}}><span>Pitch-bend range</span><span>semitones</span></div>
                    <select className="select" value={bendRange} onChange={event => setBendRange(event.target.value)} data-testid="select-bend-range">
                      <option value="2">±2 semitones</option><option value="12">±12 semitones</option><option value="24">±24 semitones</option>
                    </select>
                  </div>
                  <div className="control-block">
                    <div className="control-label"><span>Velocity and layer balance</span><span>{dynamicsMode === 'external' ? 'DAW mixer gains' : 'baked into notes'}</span></div>
                    <div className="segmented" role="group" aria-label="Output dynamics mode">
                      <button className={`segment ${dynamicsMode === 'external' ? 'active' : ''}`} type="button" aria-pressed={dynamicsMode === 'external'} onClick={() => setDynamicsMode('external')} data-testid="button-dynamics-external">External layer gain</button>
                      <button className={`segment ${dynamicsMode === 'baked' ? 'active' : ''}`} type="button" aria-pressed={dynamicsMode === 'baked'} onClick={() => setDynamicsMode('baked')} data-testid="button-dynamics-baked">Bake velocity</button>
                    </div>
                    <div className="hint">{dynamicsMode === 'external' ? 'Source velocity is copied unchanged to every harmonic layer. Use the per-layer dB values above in your DAW mixer.' : 'vₕ = round(vsrc × wₕ^(1/γ)); the result is clamped to MIDI velocity 1–127.'}</div>
                    {dynamicsMode === 'baked' && <><div className="control-label" style={{marginTop:12}}><span>Velocity gamma</span><span>γ = {gamma.toFixed(1)}</span></div><div className="range-row"><input aria-label="Velocity gamma" type="range" min="1" max="3" step="0.1" value={gamma} onChange={event => setGamma(Number(event.target.value))} data-testid="input-velocity-gamma" /><span className="range-value">{gamma.toFixed(1)}</span></div></>}
                    <div className="control-label" style={{marginTop:12}}><span>Global velocity scale</span><span>{Math.round(globalVelocityScale * 100)}%</span></div>
                    <div className="range-row"><input aria-label="Global velocity scale" type="range" min="0.1" max="1.5" step="0.05" value={globalVelocityScale} onChange={event => setGlobalVelocityScale(Number(event.target.value))} data-testid="input-global-velocity-scale" /><span className="range-value">{Math.round(globalVelocityScale * 100)}</span></div>
                    <div className="setting-line"><div className="setting-copy">Preserve source dynamics<small>Turn off to flatten all source notes to velocity 90.</small></div><Toggle checked={preserveDynamics} onChange={() => setPreserveDynamics(!preserveDynamics)} label="Preserve source dynamics" testId="switch-preserve-dynamics" /></div>
                  </div>
                </div>
                <div className="settings-list" style={{marginTop:18}}>
                  <div className="setting-line"><div className="setting-copy">Copy sustain pedal CC64<small>Off bakes pedal holds into note durations.</small></div><Toggle checked={sustain} onChange={() => setSustain(!sustain)} label="Copy sustain pedal CC64" testId="switch-sustain" /></div>
                  <div className="setting-line"><div className="setting-copy">Add source pitch bend<small>Combines it with each layer correction; values clamp at the selected range.</small></div><Toggle checked={pitchBend} onChange={() => setPitchBend(!pitchBend)} label="Add source pitch bend" testId="switch-pitch-bend" /></div>
                  <div className="setting-line"><div className="setting-copy">Set output Program Change<small>Optional General MIDI program number, 0–127.</small></div><Toggle checked={useProgramChange} onChange={() => setUseProgramChange(!useProgramChange)} label="Set optional program change" testId="switch-program-change" /></div>
                  {useProgramChange && <div className="inline-field"><span className="unit">PROGRAM</span><input className="text-input" type="number" min="0" max="127" value={programNumber} onChange={event => setProgramNumber(Number(event.target.value))} data-testid="input-program-number" /><span className="unit">0–127</span></div>}
                  {trackSummaries.some(track => selectedTracks.includes(track.index) && track.hasPitchBend) && <div className="warn-box" data-testid="warning-source-bends"><Info size={13} /><span>Selected source tracks contain pitch bends. {pitchBend ? 'They will be added to the harmonic corrections.' : 'They will be ignored.'} Independent bends from overlapping source tracks cannot share one fixed-tuning layer channel.</span></div>}
                </div>
              </div>
            </article>
            <article className="panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">06</span><ArrowDownToLine size={15} /> Export</h2>
                <span className="panel-kicker">LOCAL FILE</span>
              </div>
              <div className="panel-body">
                <div className="export-row">
                  <div className="export-summary"><strong>{conversion?.outputFileName ?? (file ? `${file.name.replace(/\.(mid|midi)$/i, '')}_absent` : 'No output prepared')}</strong><br />{conversion ? `${conversion.noteCount} generated notes · ${conversion.outputTrackCount} Type 1 tracks` : 'Convert the selected source tracks to create a new MIDI file.'}</div>
                  <div className="export-buttons">
                    <button type="button" className="btn" onClick={convertCurrentMidi} disabled={busy || !sourceMidi} data-testid="button-convert-midi"><Activity size={13} /> {busy ? 'Converting…' : 'Convert MIDI'}</button>
                    <button type="button" className="btn btn-primary" onClick={exportMidi} disabled={!conversion} data-testid="button-export"><ArrowDownToLine size={14} /> MIDI + settings</button>
                    <button type="button" className="btn" onClick={() => void exportWav()} disabled={!sourceMidi} data-testid="button-export-wav"><AudioLines size={13} /> Preview WAV</button>
                  </div>
                </div>
                <div className="export-note">Standard MIDI File type 1 · JSON settings sidecar · 48 kHz / 24-bit WAV · original source is never modified</div>
                <div className="hint" data-testid="selection-report">Current plan: {selectionMode} · pool {'{'}{candidatePool.join(', ')}{'}'}{selectionMode === 'anchored-random' ? ` · anchors {${anchors.join(', ')}} · optional {${optionalPool.join(', ')}}` : ''} · seed {randomSeed} · scope {randomScope}. MIDI retains the existing velocity/gain strategy; exact audio layer gains depend on the receiving instrument and are not encoded as constant energy.</div>
                {conversion && <div className="hint">Last conversion: {conversion.harmonicSelectionPlan.settings.mode} · {summarizeGcdGroups(conversion.harmonicSelectionPlan.groups).map(group => `${group.count} effective groups: GCD ${group.gcd}, base ${group.baseMultiplier}×`).join('; ')} · {Object.values(conversion.harmonicSelectionPlan.skippedLayers).reduce((count, layers) => count + layers.length, 0)} skipped layers. Full source-event selections and allocation warnings are included in the JSON report.</div>}
                {conversion && (conversion.warnings.length
                  ? <div className="warn-box warning-list" data-testid="panel-conversion-warnings"><Info size={13} /><div><strong>{conversion.warnings.length} conversion warning(s)</strong>{conversion.warnings.map((warning, index) => <div className="warning-row" key={`${warning.type}-${index}`}>{warning.message}{warning.trackIndex !== undefined ? ` Track ${warning.trackIndex + 1}.` : ''}{warning.bar !== undefined ? ` Bar ${warning.bar}, beat ${warning.beat}.` : warning.ticks !== undefined ? ` Tick ${warning.ticks}.` : ''}</div>)}</div></div>
                  : <div className="warn-box" data-testid="panel-conversion-warnings"><Info size={13} /><span>No range or pitch-bend warnings.</span></div>)}
                {!conversion && <div className="warn-box"><Info size={13} /><span>Convert first. The new MIDI and reproducible JSON settings are downloaded locally and never uploaded.</span></div>}
              </div>
            </article>
          </section>

          <aside className="right-column">
            <article className="panel preview-panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">04</span><Activity size={15} /> Preview &amp; analysis</h2>
                <span className="panel-kicker">{sourceMidi ? `${sourceMidi.tracks.filter((_, index) => selectedTracks.includes(index)).reduce((sum, track) => sum + track.notes.length, 0)} SOURCE NOTES` : 'NO SOURCE YET'}</span>
              </div>
              <div className="panel-body">
                <div className="preview-top">
                  <div className="transport">
                    <button className="play-button" type="button" aria-label={playing ? 'Stop preview' : 'Play preview'} onClick={() => { if (!sourceMidi) { notify('Import a MIDI file before playing the preview.'); return; } setPlaying(!playing); }} data-testid="button-preview-play">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
                    <button className="tool-button" type="button" aria-label="Return to start" onClick={() => {setPlaying(false); notify('Preview returned to start.');}} data-testid="button-preview-rewind"><SkipBack size={13} /></button>
                    <span className="transport-time" data-testid="text-preview-time">{playing ? 'PLAYING' : 'STOPPED'} / {sourceMidi ? `${Math.floor(sourceMidi.duration / 60)}:${String(Math.floor(sourceMidi.duration % 60)).padStart(2, '0')}` : '—'}</span>
                  </div>
                  <div className="transport-tools">
                    <button className={`tool-button ${ab === 'A' ? 'active' : ''}`} type="button" aria-label="Play original melody as sines" onClick={() => setAb('A')} data-testid="button-ab-a">A</button>
                    <button className={`tool-button ${ab === 'B' ? 'active' : ''}`} type="button" aria-label="Play absent harmonics" onClick={() => setAb('B')} data-testid="button-ab-b">B</button>
                    <button className={`tool-button ${ab === 'R' ? 'active' : ''}`} type="button" aria-label="Play absent harmonics with quiet fundamental reference" onClick={() => setAb('R')} data-testid="button-ab-reference">R</button>
                    <button className={`tool-button ${soloHarmonic ? 'active' : ''}`} type="button" aria-label={soloHarmonic ? `Clear H${soloHarmonic} solo` : 'Solo the first selected harmonic'} onClick={() => setSoloHarmonic(soloHarmonic ? null : activeHarmonics[0] ?? null)} data-testid="button-solo"><Volume2 size={13} /></button>
                  </div>
                </div>
                <div className="loop-controls">
                  <label className="loop-toggle"><input type="checkbox" checked={loopPreview} onChange={event => setLoopPreview(event.target.checked)} data-testid="checkbox-loop-preview" /> Loop selection</label>
                  <label>Start s <input className="text-input" type="number" min="0" step="0.1" value={loopStartSec} onChange={event => setLoopStartSec(event.target.value)} disabled={!loopPreview} data-testid="input-loop-start" /></label>
                  <label>End s <input className="text-input" type="number" min="0" step="0.1" value={loopEndSec} placeholder={sourceMidi?.duration.toFixed(1) ?? 'end'} onChange={event => setLoopEndSec(event.target.value)} disabled={!loopPreview} data-testid="input-loop-end" /></label>
                </div>
                <div className="visual-caption"><span>PIANO ROLL · {ab === 'A' ? 'ORIGINAL' : ab === 'R' ? 'ABSENT + REFERENCE' : 'ABSENT'} / {soloHarmonic ? `H${soloHarmonic} SOLO` : 'FULL MIX'}</span><span>{sourceMidi ? `${sourceMidi.header.ppq} PPQ` : 'BAR —'}</span></div>
                <div className="piano-wrap"><PianoRoll midi={sourceMidi} selectedTracks={selectedTracks} harmonics={activeHarmonics} selectionPlan={selectionPlan} /></div>
                <div className="note-legend"><span><i className="legend-dot" />Source notes</span><span><i className="legend-dot out" />Harmonic output</span><span className="unit">{sourceMidi ? `${activeHarmonics.length} inspected layers` : 'No MIDI loaded'}</span></div>
                <div className="preview-layers" data-testid="controls-preview-layers">{plannedHarmonics.map(harmonic => <button type="button" key={harmonic} className={`layer-chip ${mutedHarmonics.includes(harmonic) ? 'muted' : ''} ${soloHarmonic === harmonic ? 'soloed' : ''}`} onClick={() => setMutedHarmonics(current => current.includes(harmonic) ? current.filter(item => item !== harmonic) : [...current, harmonic])} onContextMenu={event => { event.preventDefault(); setSoloHarmonic(soloHarmonic === harmonic ? null : harmonic); }} title={`Click to ${mutedHarmonics.includes(harmonic) ? 'unmute' : 'mute'} H${harmonic}; right-click to solo`} data-testid={`button-preview-layer-${harmonic}`}>H{harmonic} {mutedHarmonics.includes(harmonic) ? 'muted' : 'on'}</button>)}</div>
                <div className="visual-caption" style={{marginTop:17}}><span>INSPECTED HARMONIC WEIGHTS</span><span>ILLUSTRATIVE</span></div>
                <div className="spectrum" role="img" aria-label="Illustrative spectrum placeholder">
                  {activeHarmonics.map(harmonic => { const weight = weightForUi(harmonic); const height = Math.max(3, Math.min(100, weight * 78)); return <div key={harmonic} className="spectrum-bar" title={`H${harmonic}: ${layerLevelDb(weight).toFixed(1)} dB`} style={{height:`${height}%`,opacity: .85}} />; })}
                </div>
                <div className="spectrum-labels"><span>f₀</span><span>2f₀</span><span>3f₀</span><span>4f₀</span><span>5f₀</span><span>→ frequency</span></div>
                <div className="hint">Preview uses exact-frequency sine oscillators and matching envelopes. No automatic peak limiter is used. Spectrum bars show the inspected set’s weights, not measured audio.</div>
                <label className="selection-field">Sine preview normalization<select className="select" value={normalization} onChange={event => setNormalization(event.target.value as typeof normalization)} data-testid="select-normalization"><option value="off">Off</option><option value="sum-squares">Constant sum-of-squares amplitude — sine preview</option></select></label>
                <div className="hint">This preserves summed squared sine amplitudes, not exact perceived loudness or peak level. Leave output headroom. Source-note dynamics multiply the entire group separately. Mute/solo does not rebalance other layers. Excess output can clip playback or WAV export.</div>
                <div className="control-label" style={{marginTop:12}}><span>Master preview gain</span><span>{gain}%</span></div>
                <div className="range-row"><input aria-label="Master preview gain" type="range" min="0" max="100" value={gain} onChange={event => setGain(Number(event.target.value))} data-testid="input-preview-gain" /><span className="range-value">{gain}</span></div>
                <div className="warn-box"><Info size={13} /><span>Each harmonic has its own MIDI channel because pitch bend is channel-wide. Chords are supported in fixed-tuning mode.</span></div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2 className="panel-title"><span className="section-number">05</span><Music2 size={15} /> Piano calibration</h2>
                <button className="btn btn-quiet btn-small" type="button" onClick={() => notify('Calibration guide: play the reference tone, then compare the piano response.')} data-testid="button-calibration-help"><CircleHelp size={13} /> Guide</button>
              </div>
              <div className="panel-body">
                <div className="calibration">
                  <div className="cal-top"><div className="cal-title">Compensate for instrument tuning</div><Toggle checked={calibrationEnabled} onChange={() => setCalibrationEnabled(!calibrationEnabled)} label="Enable piano calibration" testId="switch-calibration" /></div>
                    <p className="cal-desc">Harmonic-layer selection chooses which generated MIDI notes are played. With piano or other complex instruments, each note contains additional partials. Selecting odd or even layers does not create a strictly odd-only or even-only audio spectrum. Use sine preview to audition the idealized harmonic structure.</p>
                    <div className="cal-controls">
                      <button type="button" className="btn btn-small" onClick={generateCalibrationFiles} data-testid="button-generate-calibration"><Music2 size={12} /> Generate test MIDI + schedule</button>
                      <button type="button" className="btn btn-small" onClick={() => calibrationWavInput.current?.click()} data-testid="button-upload-calibration-wav"><Upload size={12} /> Analyze WAV</button>
                      <input ref={calibrationWavInput} className="file-input" type="file" accept=".wav,audio/wav,audio/x-wav" onChange={event => void analyzeCalibrationFile(event.target.files?.[0])} data-testid="input-calibration-wav" />
                    </div>
                    <div className="hint">Render through the exact piano patch at fixed gain with no normalization, reverb, compression, or pedal. Export a 44.1 or 48 kHz WAV.</div>
                    <div className="calibration-input-grid">
                      <label>Test velocities<input className="text-input" value={calibrationVelocities} onChange={event => setCalibrationVelocities(event.target.value)} data-testid="input-calibration-velocities" /></label>
                      <label>Note seconds<input className="text-input" type="number" min="0.2" max="10" step="0.1" value={calibrationDuration} onChange={event => setCalibrationDuration(Number(event.target.value))} data-testid="input-calibration-duration" /></label>
                      <label>Silence seconds<input className="text-input" type="number" min="0" max="10" step="0.1" value={calibrationSilence} onChange={event => setCalibrationSilence(Number(event.target.value))} data-testid="input-calibration-silence" /></label>
                      <label>Attack end (s)<input className="text-input" type="number" min="0.01" max="1" step="0.01" value={calibrationWindows.attackEndSec} onChange={event => setCalibrationWindows(current => ({ ...current, attackEndSec: Number(event.target.value) }))} data-testid="input-calibration-attack-window" /></label>
                      <label>Sustain start (s)<input className="text-input" type="number" min="0.05" max="1.5" step="0.05" value={calibrationWindows.sustainStartSec} onChange={event => setCalibrationWindows(current => ({ ...current, sustainStartSec: Number(event.target.value) }))} data-testid="input-calibration-sustain-start" /></label>
                      <label>Sustain end (s)<input className="text-input" type="number" min="0.1" max="2" step="0.05" value={calibrationWindows.sustainEndSec} onChange={event => setCalibrationWindows(current => ({ ...current, sustainEndSec: Number(event.target.value) }))} data-testid="input-calibration-sustain-end" /></label>
                    </div>
                  <div className="cal-controls">
                      <select className="select" value={profile} onChange={event => { const selected = profiles.find(item => item.id === event.target.value); setProfile(event.target.value); if (selected) { setMeasurements(selected.measurements); setProfileName(selected.name); } }} data-testid="select-calibration-profile">
                        <option value="">No profile</option>{profiles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      <input className="text-input" value={profileName} onChange={event => setProfileName(event.target.value)} aria-label="Calibration profile name" placeholder="Profile name" data-testid="input-profile-name" />
                  </div>
                  <div className="profile-row">
                      <span className="profile-name">PROFILE · {profile ? profiles.find(item => item.id === profile)?.name ?? profileName : 'UNSAVED'}</span>
                      <div className="profile-actions">
                        <button type="button" className="btn btn-small" onClick={() => void saveCurrentProfile()} data-testid="button-save-profile"><Save size={12} /> {profileSaved ? 'Saved' : 'Save'}</button>
                        <button type="button" className="btn btn-small" onClick={exportCurrentProfile} data-testid="button-export-profile"><ArrowDownToLine size={12} /> Export</button>
                        <button type="button" className="btn btn-small" onClick={() => profileFileInput.current?.click()} data-testid="button-import-profile"><Upload size={12} /> Import</button>
                        <input ref={profileFileInput} className="file-input" type="file" accept=".json,application/json" onChange={event => void importProfileFile(event.target.files?.[0])} data-testid="input-import-profile" />
                        <button type="button" className="btn btn-small" onClick={() => {setProfile('');setProfileSaved(false);setMeasurements([]);notify('Calibration profile selection cleared.');}} data-testid="button-reset-profile"><RotateCcw size={12} /> Clear</button>
                      </div>
                  </div>
                </div>
                  <div className="control-label" style={{marginTop:14}}><span>Balance measurement</span></div>
                  <select className="select" value={calibrationMode} onChange={event => setCalibrationMode(event.target.value as typeof calibrationMode)} data-testid="select-calibration-mode">
                    <option value="wholeAttackDb">Whole-note level · attack</option><option value="wholeSustainDb">Whole-note level · sustain</option><option value="fundamentalAttackDb">Fundamental level · attack</option><option value="fundamentalSustainDb">Fundamental level · sustain</option>
                  </select>
                  {calibrationEnabled && <div className="allocator-controls">
                    <div className="control-label"><span>Dynamic voice pool</span><span>{calibratedChannelCount} channels</span></div>
                    <input aria-label="Calibrated channel pool size" type="range" min="1" max="15" value={calibratedChannelCount} onChange={event => setCalibratedChannelCount(Number(event.target.value))} data-testid="input-calibrated-channel-count" />
                    <div className="control-label"><span>Release guard</span><span>{releaseGuardMs} ms</span></div>
                    <input aria-label="Release guard milliseconds" type="range" min="0" max="500" step="10" value={releaseGuardMs} onChange={event => setReleaseGuardMs(Number(event.target.value))} data-testid="input-release-guard" />
                    <div className="control-label"><span>When all voices are busy</span></div>
                    <select className="select" value={calibrationExhaustion} onChange={event => setCalibrationExhaustion(event.target.value as typeof calibrationExhaustion)} data-testid="select-calibration-exhaustion">
                      <option value="steal-oldest">Steal oldest voice</option><option value="nearest-correction">Use nearest bend correction</option>
                    </select>
                    <div className="setting-line"><div className="setting-copy">MPE lower-zone export<small>Member channels 2–16 for MPE-compatible instruments.</small></div><Toggle checked={mpe} onChange={() => setMpe(!mpe)} label="MPE lower zone export" testId="switch-mpe" /></div>
                    {!profiles.some(item => item.id === profile) && <div className="warn-box"><Info size={13} /><span>Save or import a calibration profile before converting in calibrated mode.</span></div>}
                  </div>}
                  {measurements.length > 0 && <div className="cal-results" data-testid="panel-calibration-results">
                    <div className="hint">LOCAL ANALYSIS · {measurements.length} measurements · {new Set(measurements.map(item => item.key)).size} keys</div>
                    {measurements.slice(0, 12).map((item, index) => <div className="cal-result-row" key={`${item.key}-${item.velocity}-${index}`}>
                      <span>MIDI {item.key} · v{item.velocity}</span><span>{item[calibrationMode].toFixed(1)} dB</span><span>{item.tuningCents > 0 ? '+' : ''}{item.tuningCents.toFixed(2)}¢</span><span>{item.decayDbPerSecond.toFixed(1)} dB/s</span>
                    </div>)}
                    {measurements.length > 12 && <div className="hint">Showing first 12 rows. Export the profile JSON for the complete lookup table.</div>}
                    {detectVelocityLayerJumps(measurements).length > 0 && <div className="warn-box" data-testid="warning-velocity-jumps"><Info size={13} /><span>Likely velocity-layer jump(s): {detectVelocityLayerJumps(measurements).map(jump => `MIDI ${jump.key}, v${jump.lowerVelocity}→${jump.upperVelocity}`).join('; ')}.</span></div>}
                  </div>}
                  <div className="hint">Profiles are stored in this browser’s IndexedDB. Calibration mode: {calibrationEnabled ? (profile ? 'enabled; profile selected' : 'enabled; choose a saved profile') : 'disabled'}.</div>
              </div>
            </article>

          </aside>
        </div>

        <section className="help-panel" aria-labelledby="help-title">
          <h2 id="help-title">How the missing-fundamental effect works</h2>
          <div className="help-grid">
            <p>Harmonic 1 is omitted. The remaining partials occur at integer multiples of the source frequency; the ear may infer the implied fundamental even when its tone is not played. The result depends on the patch, room, headphones, and listener.</p>
            <p>Fixed mode uses one channel per harmonic layer because pitch bend is channel-wide. Calibration mode measures your own piano patch, then allocates a separate channel to each independently tuned voice. If the pool is exhausted, the selected policy is applied and reported.</p>
            <p>The integer MIDI note is rounded from 12 log₂(h); the residual cents are sent as pitch bend after setting its RPN range. Weights apply a per-layer dB / velocity adjustment. The source file is never edited.</p>
            <p>Imported MIDI and WAV files are processed in this browser only. Calibration profiles remain in this browser’s IndexedDB. The service worker caches the app shell and bundled example for offline use; no account, server upload, or analytics is used.</p>
          </div>
        </section>

        <div className="footer-line">
          <span>ABSENT NOTE CONVERTER · WORKSTATION 0.1</span>
          <div className="footer-links"><span>Spacebar · play / stop</span><span>Offline by design</span><button type="button" onClick={() => notify('Files stay in this browser; profiles are stored in IndexedDB. Clear site data to remove them.')} data-testid="button-footer-privacy">Privacy notes</button></div>
        </div>
      </main>
      {toast && <div className="toast-note" role="status" data-testid="status-toast"><Check size={13} style={{verticalAlign:'-2px', marginRight:7}} />{toast}<button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification" style={{background:'none',border:0,color:'inherit',marginLeft:12,padding:0}}><X size={12} /></button></div>}
    </div>
  );
}

export default App;

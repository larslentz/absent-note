# Absent Note Converter

An offline-first browser tool that turns selected notes in a Standard MIDI File into separate harmonic layers. Harmonic 1 is omitted so the listener may infer the missing fundamental. MIDI parsing, conversion, audio preview, calibration, and profile storage happen locally in the browser.

## Run and test

From the workspace root:

```sh
pnpm install
pnpm --filter @workspace/absent-note-converter run dev
```

The Replit web workflow supplies the required `PORT` and `BASE_PATH` values. To run the core tests:

```sh
pnpm --filter @workspace/absent-note-converter run test
pnpm --filter @workspace/absent-note-converter run typecheck
```

To build the static app and its offline service worker:

```sh
pnpm --filter @workspace/absent-note-converter run build
```

The app has no backend, account system, analytics, or runtime CDN dependency. The demo MIDI and app-shell assets are bundled with the application.

## Install and use offline

1. Open the app once while online and wait for the service worker to finish caching the app.
2. In a supported browser, use its install control (or the browser menu’s **Install app** / **Add to Home Screen** command).
3. Reopen the installed app while offline. The cached app shell and bundled demo melody remain available.

The browser’s IndexedDB stores calibration profiles. Imported MIDI and WAV files are analyzed in memory and are not uploaded. Clearing site data removes locally saved profiles.

## Formula reference

Let `m` be the source MIDI note, `A4` the reference frequency (440 Hz by default), `h` the harmonic number, and `R` the pitch-bend range in semitones.

| Quantity | Formula |
| --- | --- |
| MIDI frequency | `f0 = A4 × 2^((m − 69) / 12)` |
| Harmonic frequency | `fh = h × f0` |
| Exact harmonic offset | `offseth = 12 × log2(h)` |
| Integer semitone offset | `nh = round(offseth)` |
| Fine correction | `ch = 100 × (offseth − nh)` cents |
| 14-bit pitch bend | `clamp(round(8192 + 8192 × c / (100 × R)), 0, 16383)` |
| Harmonic weight | `wh = (2 / h)^alpha` |
| Layer level | `Lh = 20 × log10(wh)` dB |
| Baked velocity | `clamp(round(vsrc × wh^(1 / gamma)), 1, 127)` |

Harmonic 1 is never emitted. With `alpha = 0`, all layers have equal weight; `0.5` is gentle weighting and `1` is strong weighting. The baked-velocity gamma is constrained to 1–3.

Reference corrections:

| Harmonic | Semitones | Cents |
| ---: | ---: | ---: |
| 2 | +12 | 0 |
| 3 | +19 | +1.955 |
| 4 | +24 | 0 |
| 5 | +28 | −13.686 |
| 6 | +31 | +1.955 |
| 7 | +34 | −31.174 |
| 8 | +36 | 0 |

The test case `source velocity 90, alpha 1, gamma 2` produces velocities `90, 73, 64, 57` for harmonics 2–5.

## Workflow notes

1. **Import:** Open the bundled short melody or select/drop a `.mid` / `.midi` file. The app parses track names, channels, note counts, pitch ranges, sustain, pitch bend, tempo, and PPQ locally. Channel 10 drums are unselected by default.
2. **Select tracks:** Choose parts to convert. Unselected tracks can be retained in the new Type 1 file or omitted.
3. **Harmonics and balance:** Select harmonics 2–8, choose weighting, A4 tuning, bend range, velocity mode, source-dynamics handling, sustain behavior, and range policy. Out-of-range notes are skipped or their entire source note is dropped; pitches are never folded or wrapped.
4. **Preview:** Play the original melody as sines, the absent-harmonic version, or the harmonic version with a quiet fundamental reference. Solo the first selected harmonic, adjust preview gain, and export a 48 kHz / 24-bit WAV.
5. **Optional calibration:** Generate a test MIDI and JSON schedule for the used harmonic key range. Render it through the exact piano patch at fixed gain without normalization, reverb, compression, or pedal, then analyze the resulting WAV. Save, import, and export named local profiles.
6. **Export:** Convert to a new Standard MIDI File type 1 and download its JSON settings sidecar. The original file is never modified.

Fixed-tuning conversion assigns one MIDI channel to each harmonic layer, skips channel 10, configures the pitch-bend range with RPN 0, and sends the layer correction before notes. Separate channels are necessary because MIDI pitch bend is channel-wide. Chords work in this mode because a layer’s correction depends only on the harmonic number.

Calibration uses the measured piano fundamental for level matching and per-key bend correction. A dynamic allocator assigns notes to the available channel pool, with a choice to steal the oldest voice or use the nearest available bend when the pool is exhausted. MPE export uses lower-zone member channels 2–16. The piano patch’s internal partials and inharmonicity cannot be reshaped by MIDI; the perceived missing-fundamental effect varies by listener and playback system.

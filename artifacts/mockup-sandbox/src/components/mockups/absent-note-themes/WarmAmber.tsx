import { ThemePreviewBase } from './_shared/ThemePreviewBase';

export function WarmAmber() {
  return (
    <>
      <style>{`
        .warm-amber-frame {
          --wa-bg: #17212d;
          --wa-bg-deep: #121b25;
          --wa-surface: #202c39;
          --wa-surface-raised: #263442;
          --wa-inset: #151f2a;
          --wa-border: #3b4b5b;
          --wa-border-soft: #314151;
          --wa-text: #f0eee8;
          --wa-text-secondary: #d1d2ce;
          --wa-muted: #a5b0b8;
          --wa-dim: #8795a0;
          --wa-amber: #e7b96b;
          --wa-amber-bright: #f0c879;
          --wa-amber-ink: #26303a;
          --wa-amber-wash: #372f25;
          --wa-warn-border: #786347;
          --wa-warn-bg: #302b25;
          --wa-warn-text: #f0d8a5;
          min-height: 100dvh;
          color: var(--wa-text);
          background:
            radial-gradient(ellipse at 18% 0%, rgba(137, 163, 184, .11), transparent 44%),
            radial-gradient(ellipse at 88% 18%, rgba(224, 174, 94, .055), transparent 38%),
            repeating-linear-gradient(155deg, rgba(210, 223, 229, .018) 0 1px, transparent 1px 8px),
            linear-gradient(145deg, #1b2734 0%, var(--wa-bg) 48%, #141e29 100%);
          color-scheme: dark;
        }
        .warm-amber-frame .studio {
          color: var(--wa-text);
          background:
            radial-gradient(ellipse at 52% -18%, rgba(130, 156, 176, .12), transparent 40%),
            linear-gradient(145deg, #1b2734 0%, var(--wa-bg) 55%, #141e29 100%);
        }
        .warm-amber-frame .topbar { background: rgba(20, 30, 41, .94); border-color: var(--wa-border-soft); }
        .warm-amber-frame .brand-mark { color: #292f35; background: var(--wa-amber); }
        .warm-amber-frame .brand-name, .warm-amber-frame h1 { color: #f4f1e9; }
        .warm-amber-frame .brand-sub { color: #a3adb3; }
        .warm-amber-frame .top-meta { color: var(--wa-muted); }
        .warm-amber-frame .offline-pill { color: #dfc58f; border-color: #6c5a3c; background: #302c25; }
        .warm-amber-frame .offline-pill i, .warm-amber-frame .status-line.ready::before { background: var(--wa-amber); }
        .warm-amber-frame .top-action { color: #d0d2cf; }
        .warm-amber-frame .eyebrow { color: #e5bb72; }
        .warm-amber-frame .subtitle { color: #bbc2c5; }
        .warm-amber-frame .btn { color: #e1e2dd; background: #263340; border-color: #526172; }
        .warm-amber-frame .btn:hover { background: #314150; border-color: #718091; }
        .warm-amber-frame .btn-primary { color: var(--wa-amber-ink); background: var(--wa-amber); border-color: #f0c879; }
        .warm-amber-frame .btn-primary:hover { color: #202b35; background: var(--wa-amber-bright); border-color: #f6d38b; }
        .warm-amber-frame :is(button, select, input):focus-visible {
          outline: 2px solid #f0c879;
          outline-offset: 2px;
        }
        .warm-amber-frame .panel { background: rgba(32, 44, 57, .96); border-color: var(--wa-border); box-shadow: 0 9px 24px rgba(4, 10, 16, .12); }
        .warm-amber-frame .panel-head { border-color: var(--wa-border-soft); }
        .warm-amber-frame .panel-title { color: #ebe9e2; }
        .warm-amber-frame .panel-title svg { color: #c3ad83; }
        .warm-amber-frame .section-number { color: #d1ad68; }
        .warm-amber-frame .panel-kicker, .warm-amber-frame .status-line { color: #b0bac0; }
        .warm-amber-frame .status-line::before { background: #82909a; }
        .warm-amber-frame .upload-zone { color: var(--wa-text-secondary); background: var(--wa-inset); border-color: #617080; }
        .warm-amber-frame .upload-zone:hover { border-color: var(--wa-amber); background: #202a34; }
        .warm-amber-frame .upload-icon { color: var(--wa-amber); background: #302c25; border-color: #62533b; }
        .warm-amber-frame .upload-zone strong, .warm-amber-frame .track-name { color: #ecebe5; }
        .warm-amber-frame .upload-zone p, .warm-amber-frame .track-sub { color: #a4afb6; }
        .warm-amber-frame .file-meta, .warm-amber-frame .track-row { background: var(--wa-inset); border-color: var(--wa-border-soft); }
        .warm-amber-frame .meta-cell { border-color: var(--wa-border-soft); }
        .warm-amber-frame .meta-label, .warm-amber-frame .track-stat em { color: #a1adb5; }
        .warm-amber-frame .meta-value, .warm-amber-frame .track-stat { color: #d9ddd9; }
        .warm-amber-frame .track-row.selected { background: #292e2d; border-color: #8a7048; }
        .warm-amber-frame .track-select, .warm-amber-frame .range-row input[type=range] { accent-color: var(--wa-amber); }
        .warm-amber-frame .select, .warm-amber-frame .text-input { color: #f0eee8; background: #151f29; border-color: #536273; }
        .warm-amber-frame .select:focus, .warm-amber-frame .text-input:focus { border-color: var(--wa-amber); }
        .warm-amber-frame .control-label { color: #e1e1dc; }
        .warm-amber-frame .control-label span:last-child { color: #e9c47e; }
        .warm-amber-frame .hint { color: #aeb8bd; }
        .warm-amber-frame .formula { background: #19242b; border-color: #4e5147; color: #d2d1c7; }
        .warm-amber-frame .formula strong { color: #f0c879; }
        .warm-amber-frame .formula-table { background: #17222b; border-color: #455361; }
        .warm-amber-frame .formula-row { color: #e0e1da; border-color: #34424d; }
        .warm-amber-frame .formula-header { color: #b1b9b9; }
        .warm-amber-frame .segmented { background: #17222b; border-color: #455361; }
        .warm-amber-frame .segment { color: #aeb8bd; }
        .warm-amber-frame .segment.active { color: #f3d99f; background: #3a3429; box-shadow: inset 0 0 0 1px #806c49; }
        .warm-amber-frame .setting-copy { color: #e1e1dc; }
        .warm-amber-frame .setting-copy small { color: #aab4b9; }
        .warm-amber-frame .toggle { background: #34414c; border-color: #65727b; }
        .warm-amber-frame .toggle::after { background: #d3d8d7; }
        .warm-amber-frame .toggle.on { background: #80673e; border-color: #b18a4d; }
        .warm-amber-frame .toggle.on::after { background: #fff0c8; }
        .warm-amber-frame .play-button { color: #26303a; background: var(--wa-amber); border-color: var(--wa-amber); }
        .warm-amber-frame .transport-time { color: #d0d5d4; }
        .warm-amber-frame .tool-button { color: #c3cbce; background: #263340; border-color: #526172; }
        .warm-amber-frame .tool-button.active { color: #f2d394; background: #383328; border-color: #8b7146; }
        .warm-amber-frame .visual-caption { color: #b1bbc0; }
        .warm-amber-frame .piano-wrap { background: #17212a; border-color: #53616d; }
        .warm-amber-frame .piano-roll rect { fill: #17212a; }
        .warm-amber-frame .piano-roll text { fill: #a6b1b7; }
        .warm-amber-frame .note-legend { color: #b9c2c5; }
        .warm-amber-frame .legend-dot { background: var(--wa-amber); }
        .warm-amber-frame .legend-dot.out { background: #91b3c7; }
        .warm-amber-frame .spectrum { background: linear-gradient(180deg, #202d38, #18232d); border-color: #52616e; }
        .warm-amber-frame .spectrum-bar { background: linear-gradient(0deg, #a77b3f, #ecc677); }
        .warm-amber-frame .spectrum-labels { color: #aeb9bf; }
        .warm-amber-frame .warn-box { color: var(--wa-warn-text); background: var(--wa-warn-bg); border-color: var(--wa-warn-border); }
        .warm-amber-frame .calibration { background: var(--wa-inset); border-color: var(--wa-border); }
        .warm-amber-frame .cal-title { color: #eeece5; }
        .warm-amber-frame .cal-desc { color: #b2bdc1; }
        .warm-amber-frame .export-summary { color: #bac3c6; }
        .warm-amber-frame .export-summary strong { color: #ecebe5; }
        .warm-amber-frame .export-note { color: #a1adb4; }
        .warm-amber-frame .footer-line, .warm-amber-frame .footer-links button { color: #9ca9b1; }
        @media (prefers-reduced-motion: reduce) {
          .warm-amber-frame *, .warm-amber-frame *::before, .warm-amber-frame *::after { transition: none !important; }
        }
      `}</style>
      <div className="warm-amber-frame">
        <ThemePreviewBase theme="amber" />
      </div>
    </>
  );
}

export default WarmAmber;

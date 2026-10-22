import { ThemePreviewBase } from './_shared/ThemePreviewBase';

export function IceCyan() {
  return (
    <>
      <style>{`
        .studio.theme-ice {
          --ice-bg: #111a27;
          --ice-ink: #e3edf5;
          --ice-muted: #a0b2c4;
          --ice-dim: #859aae;
          --ice-border: #34475b;
          --ice-line: #2b3c50;
          --ice-surface: #1b2939;
          --ice-inset: #142131;
          --ice-accent: #66cde0;
          --ice-accent-soft: #b2edf4;
          --ice-accent-deep: #183f50;
          --ice-warn: #f1d69a;
          --ice-warn-bg: #302e2b;
          min-height: 100dvh;
          color: var(--ice-ink);
          background:
            radial-gradient(ellipse at 54% -22%, rgba(93, 164, 197, .16), transparent 45%),
            repeating-linear-gradient(135deg, rgba(181, 213, 233, .018) 0 1px, transparent 1px 8px),
            linear-gradient(160deg, #182637 0%, var(--ice-bg) 62%, #101824 100%);
          color-scheme: dark;
        }
        .studio.theme-ice ::selection { background: #67cde0; color: #0d1b26; }
        .studio.theme-ice .topbar {
          background: rgba(17, 26, 39, .94);
          border-color: var(--ice-line);
          box-shadow: 0 1px 0 rgba(169, 211, 235, .025);
        }
        .studio.theme-ice .brand-mark {
          color: #102333;
          background: #72d0e1;
          box-shadow: inset 0 0 0 1px rgba(225, 250, 255, .35);
        }
        .studio.theme-ice .brand-name,
        .studio.theme-ice h1 { color: #edf5fb; }
        .studio.theme-ice .brand-sub,
        .studio.theme-ice .panel-kicker,
        .studio.theme-ice .meta-label,
        .studio.theme-ice .track-sub,
        .studio.theme-ice .track-stat em,
        .studio.theme-ice .visual-caption,
        .studio.theme-ice .spectrum-labels,
        .studio.theme-ice .export-note,
        .studio.theme-ice .section-number { color: var(--ice-dim); }
        .studio.theme-ice .top-meta,
        .studio.theme-ice .top-action { color: var(--ice-muted); }
        .studio.theme-ice .offline-pill {
          color: #a9e6e8;
          border-color: #376575;
          background: #193546;
        }
        .studio.theme-ice .offline-pill i,
        .studio.theme-ice .status-line.ready::before { background: var(--ice-accent); }
        .studio.theme-ice .eyebrow { color: #77d2e2; }
        .studio.theme-ice .subtitle { color: #b2c1d0; }
        .studio.theme-ice .btn {
          color: #d4e0eb;
          background: #223246;
          border-color: #40556b;
        }
        .studio.theme-ice .btn:hover {
          background: #2b4057;
          border-color: #6b91a7;
        }
        .studio.theme-ice .btn-primary {
          color: #0e2633;
          background: #73d4e3;
          border-color: #73d4e3;
        }
        .studio.theme-ice .btn-primary:hover {
          color: #0c202d;
          background: #a1e6ed;
          border-color: #a1e6ed;
        }
        .studio.theme-ice .panel {
          background: linear-gradient(145deg, rgba(31, 47, 66, .98), rgba(25, 39, 56, .98));
          border-color: var(--ice-border);
          box-shadow: 0 10px 26px rgba(3, 10, 19, .18), inset 0 1px 0 rgba(194, 220, 239, .035);
        }
        .studio.theme-ice .panel-head { border-color: var(--ice-line); }
        .studio.theme-ice .panel-title { color: #e1edf6; }
        .studio.theme-ice .panel-title svg { color: #9bb6c9; }
        .studio.theme-ice .status-line { color: #a5b6c6; }
        .studio.theme-ice .status-line::before { background: #708599; }
        .studio.theme-ice .upload-zone {
          color: var(--ice-ink);
          background: linear-gradient(135deg, #172638, #192c3f);
          border-color: #527086;
        }
        .studio.theme-ice .upload-zone:hover {
          background: #1a3448;
          border-color: var(--ice-accent);
        }
        .studio.theme-ice .upload-icon,
        .studio.theme-ice .file-icon {
          color: var(--ice-accent);
          background: #1d384b;
          border-color: #416377;
        }
        .studio.theme-ice .upload-zone strong,
        .studio.theme-ice .file-info strong,
        .studio.theme-ice .track-name { color: #e3edf5; }
        .studio.theme-ice .upload-zone p,
        .studio.theme-ice .file-info span { color: #a0b2c4; }
        .studio.theme-ice .mini-chip {
          color: #b6e3eb;
          border-color: #46687a;
          background: #1a3041;
        }
        .studio.theme-ice .file-meta,
        .studio.theme-ice .track-row {
          background: #162436;
          border-color: #35495e;
        }
        .studio.theme-ice .meta-cell { border-color: #34485d; }
        .studio.theme-ice .meta-value,
        .studio.theme-ice .track-stat { color: #d5e2ee; }
        .studio.theme-ice .track-row.selected {
          background: #1a3545;
          border-color: #5b9baa;
        }
        .studio.theme-ice .track-select,
        .studio.theme-ice .range-row input[type=range] { accent-color: var(--ice-accent); }
        .studio.theme-ice .select,
        .studio.theme-ice .text-input {
          color: #e2edf5;
          background: #111d2b;
          border-color: #465a70;
        }
        .studio.theme-ice .select:focus,
        .studio.theme-ice .text-input:focus {
          border-color: var(--ice-accent);
          outline: 2px solid rgba(102, 205, 224, .32);
          outline-offset: 1px;
        }
        .studio.theme-ice .control-label { color: #d5e1ec; }
        .studio.theme-ice .control-label span:last-child { color: #86d8e4; }
        .studio.theme-ice .hint { color: #a1b3c3; }
        .studio.theme-ice .formula,
        .studio.theme-ice .formula-table,
        .studio.theme-ice .cal-results {
          color: #cadce8;
          background: #142335;
          border-color: #365568;
        }
        .studio.theme-ice .formula strong { color: #8fe0ea; }
        .studio.theme-ice .formula-row,
        .studio.theme-ice .cal-result-row {
          color: #d0e0eb;
          border-color: #2d4558;
        }
        .studio.theme-ice .formula-header { color: #9fb9ca; }
        .studio.theme-ice .segmented {
          background: #142234;
          border-color: #3a4e63;
        }
        .studio.theme-ice .segment { color: #a6b6c5; }
        .studio.theme-ice .segment.active {
          color: #d9f4f6;
          background: #234456;
          box-shadow: inset 0 0 0 1px #4c8290;
        }
        .studio.theme-ice .setting-copy { color: #d1dfeb; }
        .studio.theme-ice .setting-copy small { color: #a2b3c2; }
        .studio.theme-ice .toggle { border-color: #607387; background: #344558; }
        .studio.theme-ice .toggle::after { background: #d0dce5; }
        .studio.theme-ice .toggle.on {
          background: #287187;
          border-color: #60b5c5;
        }
        .studio.theme-ice .toggle.on::after { background: #e0fbff; }
        .studio.theme-ice .play-button {
          color: #102633;
          background: #75d3e1;
          border-color: #75d3e1;
        }
        .studio.theme-ice .transport-time { color: #c2d1de; }
        .studio.theme-ice .tool-button {
          color: #b6c5d2;
          background: #1b2a3c;
          border-color: #43576d;
        }
        .studio.theme-ice .tool-button.active {
          color: #a4edf2;
          border-color: #5c9eaa;
          background: #1b3b4b;
        }
        .studio.theme-ice .piano-wrap {
          border-color: #3c5268;
          background: #142234;
        }
        .studio.theme-ice .note-legend { color: #b5c5d2; }
        .studio.theme-ice .legend-dot { background: #76d4e1; }
        .studio.theme-ice .legend-dot.out { background: #9cb9e2; }
        .studio.theme-ice .spectrum {
          background: linear-gradient(180deg, #192a3b, #152538);
          border-color: #3d5267;
        }
        .studio.theme-ice .spectrum-bar {
          background: linear-gradient(0deg, #3a8da4, #7ddce8);
          opacity: .9;
        }
        .studio.theme-ice .warn-box {
          color: var(--ice-warn);
          background: var(--ice-warn-bg);
          border-color: #746447;
        }
        .studio.theme-ice .calibration {
          background: #162538;
          border-color: #3b5065;
        }
        .studio.theme-ice .cal-title { color: #deebf4; }
        .studio.theme-ice .cal-desc { color: #adbdcc; }
        .studio.theme-ice .export-summary { color: #adbdcc; }
        .studio.theme-ice .export-summary strong { color: #e1ebf3; }
        .studio.theme-ice button:focus-visible,
        .studio.theme-ice input:focus-visible,
        .studio.theme-ice select:focus-visible {
          outline: 2px solid #8be0ec;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: no-preference) {
          .studio.theme-ice .panel { animation: ice-arrive .38s ease-out both; }
          .studio.theme-ice .left-column .panel:nth-child(2) { animation-delay: .04s; }
          .studio.theme-ice .left-column .panel:nth-child(3) { animation-delay: .08s; }
          .studio.theme-ice .right-column .panel:nth-child(2) { animation-delay: .06s; }
          @keyframes ice-arrive {
            from { opacity: .82; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
      <ThemePreviewBase theme="ice" />
    </>
  );
}

export default IceCyan;

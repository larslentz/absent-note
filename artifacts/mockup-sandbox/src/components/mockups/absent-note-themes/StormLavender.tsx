import { ThemePreviewBase } from './_shared/ThemePreviewBase';

export function StormLavender() {
  return (
    <>
      <style>{`
        .theme-preview.theme-lavender {
          --storm-bg: #151a24;
          --storm-top: #1b2230;
          --storm-panel: #202836;
          --storm-inset: #19212d;
          --storm-recess: #141b26;
          --storm-border: #364154;
          --storm-border-soft: #2c3749;
          --storm-text: #e5e8f0;
          --storm-secondary: #c2c9d8;
          --storm-muted: #a0aabd;
          --storm-dim: #8995aa;
          --storm-accent: #c0a9e8;
          --storm-accent-deep: #352d49;
          --storm-accent-edge: #776693;
          --storm-focus: #d3bdf4;
          --storm-warn-bg: #332c29;
          --storm-warn-border: #74604f;
          --storm-warn-text: #e8cca0;
          min-height: 100dvh;
          color: var(--storm-text);
          background:
            radial-gradient(ellipse at 14% 7%, rgba(123, 139, 177, .12), transparent 34%),
            radial-gradient(ellipse at 90% 0%, rgba(161, 137, 201, .085), transparent 32%),
            repeating-linear-gradient(132deg, rgba(220, 228, 248, .012) 0 1px, transparent 1px 5px),
            linear-gradient(155deg, #1b2230 0%, var(--storm-bg) 43%, #121821 100%);
        }
        .theme-preview.theme-lavender .topbar {
          background: rgba(22, 28, 39, .94);
          border-color: var(--storm-border-soft);
        }
        .theme-preview.theme-lavender .brand-mark {
          color: #211b2c;
          background: var(--storm-accent);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
        }
        .theme-preview.theme-lavender .brand-name,
        .theme-preview.theme-lavender h1 { color: #f0eef6; }
        .theme-preview.theme-lavender .brand-sub,
        .theme-preview.theme-lavender .panel-kicker,
        .theme-preview.theme-lavender .meta-label,
        .theme-preview.theme-lavender .track-sub,
        .theme-preview.theme-lavender .track-stat em,
        .theme-preview.theme-lavender .visual-caption,
        .theme-preview.theme-lavender .spectrum-labels,
        .theme-preview.theme-lavender .export-note,
        .theme-preview.theme-lavender .section-number {
          color: var(--storm-muted);
        }
        .theme-preview.theme-lavender .eyebrow,
        .theme-preview.theme-lavender .control-label span:last-child,
        .theme-preview.theme-lavender .formula strong {
          color: #d1bdf0;
        }
        .theme-preview.theme-lavender .subtitle,
        .theme-preview.theme-lavender .top-meta,
        .theme-preview.theme-lavender .hint,
        .theme-preview.theme-lavender .upload-zone p,
        .theme-preview.theme-lavender .cal-desc {
          color: #a9b3c5;
        }
        .theme-preview.theme-lavender .offline-pill {
          color: #c6badc;
          border-color: #625775;
          background: #292638;
        }
        .theme-preview.theme-lavender .offline-pill i { background: #c0a9e8; }
        .theme-preview.theme-lavender .top-action { color: var(--storm-secondary); }
        .theme-preview.theme-lavender .panel {
          background: linear-gradient(148deg, rgba(36, 45, 61, .98), rgba(29, 37, 51, .98));
          border-color: var(--storm-border);
          box-shadow: 0 9px 24px rgba(5, 9, 17, .16), inset 0 1px rgba(231, 229, 247, .035);
        }
        .theme-preview.theme-lavender .panel-head { border-color: var(--storm-border-soft); }
        .theme-preview.theme-lavender .panel-title { color: var(--storm-text); }
        .theme-preview.theme-lavender .panel-title svg { color: #b4a4d1; }
        .theme-preview.theme-lavender .status-line { color: #a8b3c4; }
        .theme-preview.theme-lavender .status-line::before { background: #8492a8; }
        .theme-preview.theme-lavender .status-line.ready::before { background: #c6aeea; }
        .theme-preview.theme-lavender .btn {
          color: #d9deea;
          background: #283244;
          border-color: #46536a;
        }
        .theme-preview.theme-lavender .btn:hover {
          background: #333e53;
          border-color: #7784a0;
        }
        .theme-preview.theme-lavender .btn-primary,
        .theme-preview.theme-lavender .btn-primary:hover {
          color: #211a2d;
          background: #c0a9e8;
          border-color: #c0a9e8;
        }
        .theme-preview.theme-lavender .upload-zone {
          border-color: #59667c;
          background: linear-gradient(145deg, #1a2230, #1c2534);
        }
        .theme-preview.theme-lavender .upload-zone:hover {
          border-color: #aa96d0;
          background: #242a3a;
        }
        .theme-preview.theme-lavender .upload-icon {
          color: #c7b4e7;
          border-color: #625878;
          background: #2b2939;
        }
        .theme-preview.theme-lavender .upload-zone strong,
        .theme-preview.theme-lavender .track-name,
        .theme-preview.theme-lavender .cal-title { color: #e4e7ef; }
        .theme-preview.theme-lavender .file-meta,
        .theme-preview.theme-lavender .track-row,
        .theme-preview.theme-lavender .formula-table,
        .theme-preview.theme-lavender .segmented,
        .theme-preview.theme-lavender .piano-wrap,
        .theme-preview.theme-lavender .calibration {
          background: var(--storm-inset);
          border-color: var(--storm-border-soft);
        }
        .theme-preview.theme-lavender .meta-cell { border-color: var(--storm-border-soft); }
        .theme-preview.theme-lavender .meta-value,
        .theme-preview.theme-lavender .track-stat,
        .theme-preview.theme-lavender .control-label,
        .theme-preview.theme-lavender .setting-copy { color: var(--storm-secondary); }
        .theme-preview.theme-lavender .track-row.selected {
          border-color: #8873a7;
          background: #29283a;
        }
        .theme-preview.theme-lavender .track-select,
        .theme-preview.theme-lavender .range-row input[type=range] { accent-color: #c0a9e8; }
        .theme-preview.theme-lavender .select,
        .theme-preview.theme-lavender .text-input {
          color: #e3e7f0;
          background: #151d29;
          border-color: #4a576c;
        }
        .theme-preview.theme-lavender .select:focus,
        .theme-preview.theme-lavender .text-input:focus {
          border-color: var(--storm-focus);
          box-shadow: 0 0 0 2px rgba(195, 173, 231, .2);
        }
        .theme-preview.theme-lavender .formula {
          color: #c2c8d7;
          background: #191f2c;
          border-color: #454158;
        }
        .theme-preview.theme-lavender .formula-row {
          color: #d5daE6;
          border-color: #303a4a;
        }
        .theme-preview.theme-lavender .formula-header { color: #aab4c7; }
        .theme-preview.theme-lavender .unit,
        .theme-preview.theme-lavender .setting-copy small { color: #a1adc0; }
        .theme-preview.theme-lavender .segment { color: #a8b0c1; }
        .theme-preview.theme-lavender .segment.active {
          color: #e3d8f3;
          background: #39334b;
          box-shadow: inset 0 0 0 1px #75658f;
        }
        .theme-preview.theme-lavender .toggle { border-color: #667188; background: #394355; }
        .theme-preview.theme-lavender .toggle::after { background: #d3d8e3; }
        .theme-preview.theme-lavender .toggle.on {
          background: #705d8b;
          border-color: #9d88bd;
        }
        .theme-preview.theme-lavender .toggle.on::after { background: #f0e9fa; }
        .theme-preview.theme-lavender .play-button {
          color: #211a2d;
          border-color: #c0a9e8;
          background: #c0a9e8;
        }
        .theme-preview.theme-lavender .tool-button {
          color: #b5bfd0;
          background: #252e3e;
          border-color: #46536a;
        }
        .theme-preview.theme-lavender .tool-button.active {
          color: #e1d3f5;
          border-color: #86739f;
          background: #332e43;
        }
        .theme-preview.theme-lavender .transport-time,
        .theme-preview.theme-lavender .note-legend { color: #b7c0d0; }
        .theme-preview.theme-lavender .legend-dot { background: #c0a9e8; }
        .theme-preview.theme-lavender .legend-dot.out { background: #9eadd2; }
        .theme-preview.theme-lavender .spectrum {
          background: linear-gradient(180deg, #202938, #19212e);
          border-color: var(--storm-border);
        }
        .theme-preview.theme-lavender .spectrum-bar {
          background: linear-gradient(0deg, #786a99, #c5b3e6);
        }
        .theme-preview.theme-lavender .warn-box {
          color: var(--storm-warn-text);
          border-color: var(--storm-warn-border);
          background: var(--storm-warn-bg);
        }
        .theme-preview.theme-lavender :is(button, input, select):focus-visible {
          outline: 2px solid var(--storm-focus);
          outline-offset: 2px;
        }
        .theme-preview.theme-lavender button:disabled { opacity: .58; cursor: not-allowed; }
      `}</style>
      <ThemePreviewBase theme="lavender" />
    </>
  );
}

export default StormLavender;

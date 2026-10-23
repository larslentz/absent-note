export function GhostNoteWatermark() {
  return (
    <svg
      className="ghost-note-watermark"
      viewBox="0 0 360 205"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M10 49.5H350" opacity=".38" />
        <path d="M10 65.5H350" opacity=".34" />
        <path d="M10 81.5H350" opacity=".31" />
        <path d="M10 97.5H350" opacity=".28" />
        <path d="M10 113.5H350" opacity=".25" />
      </g>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M178 34V118" strokeWidth="2.2" opacity=".7" />
        <path
          d="M178 116C177 137 145 153 127 139C110 126 128 105 162 108C168 109 174 111 178 116Z"
          strokeWidth="2.2"
          opacity=".78"
        />
        <path d="M184 39V68" stroke="#e7b96b" strokeWidth="1.5" opacity=".72" />
        <path d="M184 82V97" stroke="#e7b96b" strokeWidth="1.5" opacity=".72" />
      </g>
      <ellipse
        cx="145"
        cy="124"
        rx="24"
        ry="14"
        transform="rotate(-28 145 124)"
        stroke="#e7b96b"
        strokeWidth="1"
        strokeDasharray="2 5"
        opacity=".48"
      />
    </svg>
  );
}

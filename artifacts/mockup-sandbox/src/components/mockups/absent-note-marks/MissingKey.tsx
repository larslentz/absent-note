import { ArrowUpRight } from "lucide-react";
import "./_group.css";

function KeyGapMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={small ? "missing-key-divider-mark" : "missing-key-logo-mark"}
      viewBox="0 0 48 32"
      fill="none"
    >
      <path
        d="M3 4.5h8v23H3zM13 4.5h8v23h-8zM27 4.5h8v23h-8zM37 4.5h8v23h-8z"
        fill="#263340"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 4.5v9h5M31 4.5v9h5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M22 6v10M26 6v10"
        stroke="#e7b96b"
        strokeWidth="1.4"
        strokeDasharray="2 1.5"
      />
      <circle cx="24" cy="20" r="1.2" fill="#e7b96b" />
    </svg>
  );
}

export function MissingKey() {
  return (
    <main className="mark-preview missing-key-preview">
      <style>{`
        .missing-key-preview .missing-key-brand-icon {
          width: 34px;
          height: 30px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          color: #d4d9d8;
          background: transparent;
          border-radius: 0;
        }
        .missing-key-preview .missing-key-logo-mark {
          display: block;
          width: 34px;
          height: 26px;
          overflow: visible;
        }
        .missing-key-preview .missing-key-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          margin: 19px 0 -8px;
          color: #8b9aa5;
        }
        .missing-key-preview .missing-key-divider::before,
        .missing-key-preview .missing-key-divider::after {
          content: "";
          display: block;
          width: 34px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #526170);
        }
        .missing-key-preview .missing-key-divider::after {
          transform: scaleX(-1);
        }
        .missing-key-preview .missing-key-divider-mark {
          display: block;
          width: 28px;
          height: 19px;
          color: #8998a3;
        }
        .missing-key-preview .mark-credit-link:focus-visible {
          outline: 2px solid #f0c879;
          outline-offset: 5px;
          border-radius: 2px;
        }
        @media (max-width: 560px) {
          .missing-key-preview .missing-key-divider {
            margin-top: 16px;
          }
        }
      `}</style>
      <header className="mark-topbar">
        <div className="mark-brand">
          <div className="missing-key-brand-icon" aria-hidden="true">
            <KeyGapMark />
          </div>
          <div>
            <div className="mark-app-title">Absent Note Converter</div>
            <div className="mark-app-subtitle">harmonic study workstation</div>
          </div>
        </div>

        <div className="mark-credit">
          <span className="mark-credit-label">BY LARS LENTZ</span>
          <a
            className="mark-credit-link"
            href="https://sleekbio.com/larslentz"
            target="_blank"
            rel="noopener noreferrer"
          >
            More by Lars <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>

        <div className="mark-top-meta">
          <span className="mark-offline">LOCAL ONLY · NO UPLOADS</span>
        </div>
      </header>

      <section className="mark-content">
        <div className="mark-eyebrow">MIDI · HARMONIC TRANSFORM</div>
        <h1 className="mark-headline">Find the note that isn’t there.</h1>
        <p className="mark-description">
          Build the missing-fundamental effect from your own MIDI. Your file
          stays on this device.
        </p>
        <div className="missing-key-divider" aria-hidden="true">
          <KeyGapMark small />
        </div>
        <div className="mark-demo-panel">
          <div className="mark-panel-label">HARMONIC LAYERS</div>
          <div className="mark-harmonics">
            <span className="mark-harmonic mark-harmonic-active">H2 · +12</span>
            <span className="mark-harmonic">H3 · +19</span>
            <span className="mark-harmonic">H4 · +24</span>
            <span className="mark-harmonic">H5 · +28</span>
          </div>
        </div>
      </section>
    </main>
  );
}

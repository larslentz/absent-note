import { ArrowUpRight } from "lucide-react";
import "./_group.css";

export function ImpliedFundamental() {
  return (
    <main className="mark-preview implied-fundamental">
      <style>{`
        .implied-fundamental .mark-brand-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          color: #e7b96b;
          background: transparent;
          border-radius: 0;
        }
        .implied-fundamental .mark-brand-icon svg {
          display: block;
          width: 30px;
          height: 30px;
          overflow: visible;
        }
        .implied-fundamental .mark-credit-link:focus-visible {
          outline: 2px solid #f0c879;
          outline-offset: 4px;
          border-radius: 2px;
        }
        .implied-fundamental .mark-description {
          margin-bottom: 0;
        }
        .implied-fundamental .implied-divider {
          height: 15px;
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 12px 0 0;
          color: #e7b96b;
          opacity: .55;
        }
        .implied-fundamental .implied-divider::before,
        .implied-fundamental .implied-divider::after {
          content: "";
          width: 36px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(160, 174, 183, .38));
        }
        .implied-fundamental .implied-divider::after {
          width: 18px;
          background: linear-gradient(90deg, rgba(160, 174, 183, .3), transparent);
        }
        .implied-fundamental .implied-divider svg {
          display: block;
          width: 34px;
          height: 14px;
          overflow: visible;
        }
        .implied-fundamental .mark-demo-panel {
          margin-top: 12px;
        }
        @media (max-width: 560px) {
          .implied-fundamental .implied-divider {
            margin-top: 10px;
          }
        }
      `}</style>
      <header className="mark-topbar">
        <div className="mark-brand">
          <div className="mark-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="2.2" fill="#e7b96b" opacity=".52" />
              <circle cx="15" cy="15" r="8.7" fill="none" stroke="#e7b96b" strokeWidth="1.35" opacity=".32" />
              <path d="M8.85 8.85a8.7 8.7 0 0 1 10.22-1.42" stroke="#f0c879" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M22.2 11.8a8.7 8.7 0 0 1-2.03 9.42" stroke="#e7b96b" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
              <path d="M11 22.08a8.7 8.7 0 0 1-4.3-5.3" stroke="#e7b96b" strokeWidth="1.35" strokeLinecap="round" opacity=".42" />
            </svg>
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
        <div className="implied-divider" aria-hidden="true">
          <svg viewBox="0 0 34 14" fill="none">
            <path d="M2 12A10 10 0 0 1 10 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M14 2A10 10 0 0 1 23 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".68" />
            <path d="M27 8a10 10 0 0 1 3 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".42" />
          </svg>
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

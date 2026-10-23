import { ArrowUpRight } from "lucide-react";
import "./_group.css";

export function InterruptedScore() {
  return (
    <main className="mark-preview ism-preview">
      <style>{`
        .ism-preview .ism-brand-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          color: #e7b96b;
        }
        .ism-preview .ism-brand-icon svg { display: block; overflow: visible; }
        .ism-preview .ism-score-rule {
          position: relative;
          height: 13px;
          margin: 17px 0 0;
          opacity: .57;
          background:
            linear-gradient(#647789, #647789) 0 1px / 100% 1px no-repeat,
            linear-gradient(#647789, #647789) 0 4px / 100% 1px no-repeat,
            linear-gradient(#647789, #647789) 0 7px / 100% 1px no-repeat,
            linear-gradient(#647789, #647789) 0 10px / 100% 1px no-repeat;
        }
        .ism-preview .ism-score-rule::after {
          content: "";
          position: absolute;
          width: 38px;
          height: 13px;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          background: #1a2632;
        }
        .ism-preview .ism-score-rest {
          position: absolute;
          width: 8px;
          height: 10px;
          left: 50%;
          top: 2px;
          z-index: 1;
          transform: translateX(-50%);
          border-left: 1px solid #d6b16c;
          border-bottom: 1px solid #d6b16c;
          border-radius: 0 0 0 5px;
          opacity: .8;
        }
        .ism-preview .mark-demo-panel { margin-top: 17px; }
        .ism-preview .mark-credit-link:focus-visible {
          outline: 2px solid #f0c879;
          outline-offset: 5px;
          border-radius: 2px;
        }
      `}</style>

      <header className="mark-topbar">
        <div className="mark-brand">
          <div className="ism-brand-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M2.5 7.5H11.5M18.5 7.5H27.5M2.5 12.5H11.5M18.5 12.5H27.5M2.5 17.5H11.5M18.5 17.5H27.5M2.5 22.5H11.5M18.5 22.5H27.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
              <path d="M14.8 5.2V17.1M14.8 17.1C14.8 19.1 12 20.1 11 18.4C10.1 16.9 12.1 15.8 14.8 16.4" stroke="#e7b96b" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="ism-score-rule" aria-hidden="true">
          <span className="ism-score-rest" />
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

import { ArrowUpRight, AudioLines } from "lucide-react";
import "./_group.css";

export function Current() {
  return (
    <main className="mark-preview">
      <header className="mark-topbar">
        <div className="mark-brand">
          <div className="mark-brand-icon" aria-hidden="true">
            <AudioLines size={17} strokeWidth={2.2} />
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
        <div className="mark-demo-panel">
          <div className="mark-panel-label">HARMONIC LAYERS · CURRENT MARK</div>
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

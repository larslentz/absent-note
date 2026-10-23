import {
  Activity,
  ArrowUpRight,
  FileMusic,
  FolderOpen,
  Keyboard,
  ShieldCheck,
  Upload,
} from "lucide-react";
import "./_group.css";

export function HarmonicOrbit() {
  return (
    <main className="deco-app">
      <header className="deco-topbar">
        <div className="deco-brand-cluster">
          <div className="deco-brand">
            <div style={{ position: "relative", width: 30, height: 30, flex: "0 0 30px" }}>
              <div className="deco-brand-mark" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path
                    d="M2.5 7.5H11.5M18.5 7.5H27.5M2.5 12.5H11.5M18.5 12.5H27.5M2.5 17.5H11.5M18.5 17.5H27.5M2.5 22.5H11.5M18.5 22.5H27.5"
                    stroke="currentColor"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14.8 5.2V17.1M14.8 17.1C14.8 19.1 12 20.1 11 18.4C10.1 16.9 12.1 15.8 14.8 16.4"
                    stroke="#e7b96b"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 82 82"
                width="82"
                height="82"
                fill="none"
                style={{
                  position: "absolute",
                  left: -26,
                  top: -26,
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                <path d="M41 5.5A35.5 35.5 0 0 1 73.8 27" stroke="#8fa5b3" strokeOpacity=".31" strokeWidth=".8" />
                <path d="M76 35.5A35.5 35.5 0 0 1 57.6 71.2" stroke="#d6b16c" strokeOpacity=".52" strokeWidth=".85" />
                <path d="M49.8 76.1A35.5 35.5 0 0 1 9.2 53.5" stroke="#8fa5b3" strokeOpacity=".23" strokeWidth=".8" />
                <path d="M5.8 45.1A35.5 35.5 0 0 1 23.1 10.2" stroke="#8fa5b3" strokeOpacity=".25" strokeWidth=".8" />
                <path d="M41 13A28 28 0 0 1 66.2 28.8" stroke="#d6b16c" strokeOpacity=".23" strokeWidth=".65" />
                <circle cx="72.1" cy="31.4" r="1.45" fill="#e7b96b" />
                <circle cx="54.4" cy="70.2" r="1.15" fill="#e7b96b" fillOpacity=".82" />
                <circle cx="9.7" cy="49.4" r="1.1" fill="#a9bdc6" fillOpacity=".78" />
                <circle cx="26.2" cy="8.9" r=".9" fill="#a9bdc6" fillOpacity=".7" />
              </svg>
            </div>
            <div>
              <div className="deco-brand-name">Absent Note Converter</div>
              <div className="deco-brand-sub">harmonic study workstation</div>
            </div>
          </div>
          <div className="deco-credit">
            <span className="deco-byline">BY LARS LENTZ</span>
            <a
              className="deco-credit-link"
              href="https://sleekbio.com/larslentz"
              target="_blank"
              rel="noopener noreferrer"
            >
              More by Lars <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="deco-top-meta">
          <span className="deco-offline">LOCAL ONLY · NO UPLOADS</span>
          <button className="deco-action" type="button">
            <Keyboard size={14} /> Shortcuts
          </button>
          <button className="deco-action" type="button">
            <ShieldCheck size={14} /> Privacy
          </button>
        </div>
      </header>

      <section className="deco-main">
        <div className="deco-page-heading">
          <div>
            <div className="deco-eyebrow">MIDI · HARMONIC TRANSFORM</div>
            <h1 className="deco-headline">Find the note that isn’t there.</h1>
            <p className="deco-subtitle">
              Build the missing-fundamental effect from your own MIDI. Your file stays on this device.
            </p>
          </div>
          <div className="deco-head-actions">
            <button className="deco-button" type="button">
              <FolderOpen size={14} /> Open example
            </button>
            <button className="deco-button deco-button-primary" type="button">
              <Upload size={14} /> Import MIDI
            </button>
          </div>
        </div>

        <div className="deco-score-ornament" aria-hidden="true">
          <span className="deco-score-rest" />
        </div>

        <div className="deco-workspace">
          <article className="deco-panel">
            <div className="deco-panel-head">
              <h2 className="deco-panel-title">
                <span className="deco-section-number">01</span>
                <FileMusic size={15} /> MIDI source &amp; tracks
              </h2>
              <span className="deco-status">NO MIDI LOADED</span>
            </div>
            <div className="deco-panel-body">
              <div className="deco-upload-zone">
                <div>
                  <div className="deco-upload-icon"><Upload size={16} /></div>
                  <strong className="deco-upload-title">Drop a MIDI file here or browse</strong>
                  <p className="deco-upload-copy">Standard MIDI File · .mid / .midi · local file only</p>
                </div>
              </div>
              <div className="deco-file-meta">
                {["Format", "Tracks", "Tempo", "Duration"].map((label) => (
                  <div className="deco-meta-cell" key={label}>
                    <div className="deco-meta-label">{label}</div>
                    <div className="deco-meta-value">—</div>
                  </div>
                ))}
              </div>
              <p className="deco-hint">
                Import a MIDI file to inspect track names, channels, note counts, and choose which parts to transform.
              </p>
            </div>
          </article>

          <article className="deco-panel">
            <div className="deco-panel-head">
              <h2 className="deco-panel-title">
                <span className="deco-section-number">04</span>
                <Activity size={15} /> Preview &amp; analysis
              </h2>
              <span className="deco-status">NO SOURCE YET</span>
            </div>
            <div className="deco-panel-body">
              <div className="deco-preview-top">
                <button className="deco-play" type="button" aria-label="Play preview">▶</button>
                <span className="deco-transport">STOPPED / —</span>
                <div className="deco-preview-tools" aria-hidden="true">
                  <span>A</span><span>B</span><span>R</span>
                </div>
              </div>
              <div className="deco-preview-caption">
                <span>PIANO ROLL · ORIGINAL / FULL MIX</span>
                <span>BAR —</span>
              </div>
              <div className="deco-piano-roll">
                <div className="deco-piano-keys"><span>72</span><span>67</span><span>62</span><span>57</span></div>
                <div className="deco-piano-grid">IMPORT A MIDI FILE TO VIEW NOTES</div>
              </div>
              <div className="deco-legend">
                <span><i className="deco-legend-dot" /> Source notes</span>
                <span><i className="deco-legend-dot output" /> Harmonic output</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

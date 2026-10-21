---
name: Absent Note Converter privacy
description: The product's required local-only data handling boundary.
---

All imported MIDI and WAV processing must stay in the browser. Do not add accounts, uploads, analytics, backend processing, or runtime CDN dependencies.

**Why:** The product brief requires offline-first operation and states that user files are never uploaded.

**How to apply:** Keep file operations client-side, profiles in browser storage, and runtime assets bundled with the app. Revisit this only if the user explicitly changes the product requirement.

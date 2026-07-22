# Architecture

Creature is a static TypeScript application built with Vite. It has no application server and no database. Runtime state lives in the browser.

## Museum

The museum catalogue is the source of truth for its 19 exhibits. Each entry binds:

- the mathematical variant evaluated by the shader;
- its source-domain size and point density;
- the displayed compact equation;
- curated body and pulse colours;
- localised labels and attribution.

The WebGL 2 renderer evaluates point positions in the vertex shader. A cyclic point-index window creates the travelling accent pulse. Spatial drift is a separate translation layer: it never rotates, stretches, or rewrites the source equation.

Museum palette changes are stored per exhibit. Reset restores the curated palette only; it does not change the mathematical program.

## Morphospace

Morphospace generates a separate specimen model. A specimen contains a seeded mathematical topology, bounded genes, developmental operations, palette state, and code representations.

The pipeline is:

```text
seed + topology
      ↓
bounded genes
      ↓
developmental operators
      ↓
finite-value validation
      ↓
quantile-based translation and uniform framing
      ↓
WebGL point rendering
```

Generation and mutation are seeded so a specimen can be reproduced. The form field changes several related genes at once. Developmental operations remain bounded and are applied after the base topology.

## Code representations

The same specimen state can be presented as:

1. compact mathematical notation;
2. a complete p5.js sketch;
3. an editable WebGL transform.

Edits are parsed into the specimen's supported parameters. A valid apply updates the model, all three code views, palette controls, and renderer. Invalid edits leave the last valid program running and report an error rather than replacing the live state.

Museum exhibits can be opened in Morphospace through a versioned transfer payload. The payload is imported into an editable specimen; the original catalogue entry remains immutable.

## Framing

The preview samples animated positions and estimates robust bounds from quantiles. It applies translation and one uniform scale only. Guard bands and temporal smoothing keep outliers from creating hard clipping planes while avoiding axis distortion.

## Persistence

Language, museum palettes, and the active Morphospace specimen use browser storage. No state is sent to a server. Storage reads are validated and unsupported or malformed values fall back to curated defaults.

## Quality gates

Vitest covers catalogue integrity, shader generation, sampling, code translation, transfer payloads, i18n, seeded generation, mutation, validation, and framing. The production build runs TypeScript validation before Vite emits static assets.

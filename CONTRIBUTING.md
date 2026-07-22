# Contributing to Creature

Thank you for helping extend the museum and Morphospace.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep curated museum equations unchanged unless a correction is supported by the original source.
3. Add new experimentation to Morphospace or to a clearly isolated mathematical family.
4. Preserve source attribution and document any third-party material.
5. Run the full local gate:

```bash
npm install
npm test
npm run build
```

## Mathematical contributions

New generators should be more than arbitrary noise. A useful contribution has:

- a compact and explainable rule;
- bounded output across time and supported devices;
- reproducible parameters or a reproducible seed;
- a recognisable structure without hard-coded anatomy;
- safe behaviour for zero, near-zero, and non-finite intermediate values;
- tests for translation, validation, framing, and state restoration where relevant.

## Interface contributions

Creature intentionally uses a restrained black canvas, Inter for interface text, and JetBrains Mono for code. Please preserve keyboard access, reduced-motion behaviour, mobile editing, and the distinction between the immutable museum and the editable Morphospace.

## Pull requests

Describe the visible result, the mathematical or state-model change, and the checks you ran. Include a screenshot or short capture for material interface changes. Small, reviewable pull requests are strongly preferred.

By contributing, you agree that your original contribution may be distributed under the repository's MIT License. Do not submit material you do not have the right to contribute.

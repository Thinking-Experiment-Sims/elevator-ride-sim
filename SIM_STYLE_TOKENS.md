# Thinking Experiment Simulation Style Tokens

This file is a cross-project style reference for simulations.
It is intended for humans and AI tools (`Codex`, `Claude`, `Gemini`, etc.).

## Usage

- Use these tokens as defaults for new simulations unless a project overrides them.
- Keep dark/light mode semantics stable across projects.
- Keep accent hierarchy consistent: `gold` for dark mode emphasis, `teal` for light mode emphasis.

## Dark Mode (Default)

- `--bg-950`: `#090b0f`
- `--bg-900`: `#11141b`
- `--bg-800`: `#1e2430`
- `--text-100`: `#eef2f9`
- `--text-300`: `#c9d1df`
- `--text-500`: `#a9b2c3`
- `--gold-500`: `#c8a24a`
- `--gold-400`: `#d8b767`
- `--gold-300`: `#e5cc8f`

## Light Mode (Half-Atwood Inspired)

- `--light-bg-top`: `#e9f4fb`
- `--light-bg-bottom`: `#fff4dd`
- `--light-ink`: `#123140`
- `--light-muted`: `#4b6570`
- `--light-accent`: `#0f7e9b`
- `--light-accent-strong`: `#095f76`
- `--light-border`: `#b4d0db`
- `--light-panel`: `#f9fcfe`
- `--light-panel-2`: `#f3f9fc`
- `--light-btn-border`: `#9dbac5`
- `--light-btn-bg`: `#f6fbfd`
- `--light-btn-top`: `#0d839f`
- `--light-btn-bottom`: `#0b5f77`

## Typography

- Preferred UI font stack for readability on screens:
  - `"IBM Plex Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Use serif only for special branding moments, not body UI text.

## Accessibility Checks

- WCAG contrast target:
  - body text >= 4.5:1
  - large text >= 3:1
- Keep state cues redundant:
  - color + text (for comparisons like `F_N > F_g`)
  - shape + text for directional arrows

## Favicon

- `https://vladimirlopez.github.io/the-thinking-experiment/assets/favicon-32.png`
- `https://vladimirlopez.github.io/the-thinking-experiment/assets/favicon-16.png`

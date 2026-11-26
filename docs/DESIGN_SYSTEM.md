# Design system — Immersive Spatial Institution

Last updated: 2026-11-26. Source: Claude Design canvas « Black in Blockchain —
Immersive Spatial Editorial 2026–27 », page Phase 3
(<https://claude.ai/artifact/NHuFujNijWL4pZUGFL2cWN>).

## Foundations

- Colours: existing tokens only (`--bg` ivory, `--bg-2` sand, `--blanc` ink,
  `--accent`, `--accent-dk`, `--accent-light` on ink only). A unit test checks
  that light gold is only used in ink contexts.
- Type: Fraunces 360–380 for titles (heavier than the former 300), Inter for
  text and controls. Reading columns stay at 55–75 characters (`.ed-prose`,
  `.im-read`, `.lg-doc`).
- Geometry: 0 radius on public pages (buttons, pills, cards, images).

## Structure

- `.pub` wraps every public page (`src/app/[locale]/(public)/layout.tsx`).
  Inside it `.ed-wrap` / `.ed-wrap-narrow` become full-width with a fluid
  margin (`--im-pad`), and `.ed-card` turns into an open index item (top rule,
  no box). Admin and signed-in areas are outside `.pub` and unchanged.
- Grid: 12 columns ≥ 1280 px, 8 columns 768–1279 px, 4 columns below
  (`.im-grid`, `.im-t8` spans the full row on tablet).
- Header and footer span the full width; the footer is ink.

## PageHero variants

| Variant | Used on | Composition |
| --- | --- | --- |
| `split` (default with a visual) | About, Press, Membership | text left, photo bleeding to the right edge |
| `cinematic` | Events, Mission | full-bleed photo, text on an ink band at the bottom |
| `manifesto` (default without a visual) | Retrospectives | large typographic opening, introduction in a side column |
| `index` | Contact, Resources, Data sources | compact opening with a bottom rule, for consultation pages |
| Data immersion (own markup) | State of BIB | full-bleed territory photo, facts band, figures on ink |
| Cinematic showcase (own markup) | Startup Spotlight | monumental title on ink, reserved portrait plane |

## Components

| Component | File | Use |
| --- | --- | --- |
| `PageHero` | `src/components/ui/PageHero.tsx` | Page opening: photo bleeding to the right edge, or typographic opening when no validated visual exists. Tones ivory, sand, ink. |
| `EditorialImage` | `src/components/ui/EditorialImage.tsx` | Catalogue images (`visuals.ts`), `ratio="fill"` for full-bleed layers. |
| `AxesScrolly` | `src/components/home/AxesScrolly.tsx` | Sticky image + scrolling steps (home "what we build", mission). |
| `EventIndex` | `src/components/home/EventIndex.tsx` | Editorial event rows (`<details>`), home and `/evenements`. |
| `LegalToc` | `src/components/ui/LegalToc.tsx` | Contents of legal pages, active section, anchors. |
| `AnimatedNumber` | `src/components/state-of-bib/AnimatedNumber.tsx` | Figure that counts once; final value always in the DOM for screen readers. |
| `DeltaBars` | `src/components/state-of-bib/DeltaBars.tsx` | Diverging bars for version differences, with an accessible table. |
| `CopyLink` | `src/components/state-of-bib/CopyLink.tsx` | Copies the current URL (version and filters included). |
| `.im-rows` / `.im-rowlink` | `globals.css` | Contact, press, resources and activity indexes. |
| `.lg`, `.lg-toc`, `.lg-doc` | `globals.css` | Legal document layout. |

## Motion

| Token | Value | Use |
| --- | --- | --- |
| micro | 200–250 ms | hover, arrows (`.im-arrow`) |
| component | 400 ms | header, opened rows |
| line reveal | 1 000 ms, 90 ms stagger | titles (`.im-line`) |
| crossfade | 900 ms | sticky images (`.im-xf`) |
| scroll | real scroll progress | `.im-rv`, `.im-mk`, `.im-px`, `.im-pxs`, `.im-bar` (`animation-timeline: view()`) |
| ease | `cubic-bezier(.2, .7, .1, 1)` | all entrances |

Rules: no scroll hijacking or snapping, nothing hidden without animation
support (`@supports`), everything static with `prefers-reduced-motion`,
observers and animation frames cleaned up on unmount.

## State of BIB

Scenes: opening (photo, facts, version, two reading modes `#sob-numbers` /
`#sob-explore`), figures of the version shown, history (differences with the
previous version, trend of all versions with its period stated), then the
existing map, cities, ecosystems, cohorts and methodology. The explorer keeps
`?version` and any non-filter parameter when filters change
(`mergeFilterParams`, unit-tested).

### State of BIB animations (phase 4.1)

| Scene | What moves | How |
| --- | --- | --- |
| Opening | photo zoom, title lines | CSS scroll timeline, `.im-line` |
| Figures | numbers count once on entry | `AnimatedNumber` (final value always in the DOM, intermediate values `aria-hidden`) |
| History | version timeline, diverging bars grow | links `?version=`, `.im-bar` |
| Atlas | countries appear by rank on first view; others dim when one is selected; selection outline; guided tour of the five leading countries (start, stop, or step by step with reduced motion); fly-to zoom and colour transitions | `SobMap` (D3 zoom + interruptible transitions) |
| Cities | bars grow, counts animate, row highlight | `.im-bar`, `AnimatedNumber` |
| Ecosystems | lines draw on period change, morph between absolute and base 100, axis ticks slide, play / pause / back to start, crosshair, brush, keyboard | CSS transition of `d` (Chrome, Edge, Firefox; Safari switches without the morph), `SobEcosystems` |
| Cohorts | layers reveal bottom-up, morph between counts and shares, computed peak annotation | CSS `d` transition, `SobCohort` |
| Scene index | active scene marker (desktop) | `SceneIndex` |

## Known limits

- Human photography is not in the catalogue yet: stock sites cannot be
  downloaded from the agent environment. Pages fall back to the six validated
  images or to typographic openings.
- The State of BIB map, ecosystem and cohort charts keep their existing D3
  behaviour; their new presentation is limited to layout and section headers.

# Editorial images — art direction, inventory and integration

Last updated: 2026-11-25. Code: `src/lib/editorial/visuals.ts` (catalogue),
`src/components/ui/EditorialImage.tsx` (rendering). Visual reference: board
**07 · Direction photographique** on the Claude Design canvas
<https://claude.ai/artifact/G6igZfRsG9CJyxyBtoxpR4#artboard-DirectionPhoto>.

## 1. Brand analysis

- Existing identity, unchanged: ivory `#FAF8F4`, sand `#F2EDE4`, ink `#141414`,
  gold `#8A6A2F` / `#5E4619`, light gold `#C9A45C` (ink backgrounds only),
  Fraunces + Inter, 2 px radius.
- Tone: an editorial, calm, transcontinental collective. Photography supports
  the type; it never competes with it.
- Sections that carry an image: home hero, events (home + page), State of BIB
  (home teaser + page), newsletter, about, home closing band.

## 2. Photographic direction

- **Subject:** places, light and materials. Never people, never invented faces,
  never anything that could pass for a BIB event, member or partner.
- **Light:** natural and low — late afternoon, dawn, blue hour. Crisp shadows,
  soft highlights. No gradient washes.
- **Palette:** warm, desaturated tones that extend the site tokens; one gold
  accent per image; no saturated colour.
- **Composition:** generous negative space, subject on the focal point, still
  readable when cropped to 21:9, 3:1, 4:3 and 4:5.
- **Rendering:** ultra-photorealistic editorial photograph; no text, logo,
  watermark or recognisable landmark.

## 3. Rules

1. An AI image is never presented as a documentary photo of an event or a real
   person. Visuals shown next to events (`events`, `closing`) carry the caption
   "Mood visual, generated illustration: not a photo of a BIB event" in FR/EN/ES.
2. The only faces on the site are the real founder portraits and event photos
   whose rights are approved in the admin.
3. A stock photo is used only after its licence page has been checked and
   recorded in `source.license` (Unsplash/Pexels licences allow commercial use
   without attribution, but exclude photos of identifiable people used to imply
   endorsement, and trademarks).
4. No upscaling: `visual()` returns `null` unless the entry is `validated` and
   its desktop file is at least `minWidth` px wide (mobile variant ≥ 750 px).
   Low-resolution previews stay in the repo but are never displayed.

## 4. Inventory

| Key | Page / section | Role | Source | Licence | Files in repo | Required export | Alt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `home` | Home — full-bleed hero | Set the mood, leave room for the title | Canva AI `MAHbxK6qdms` (desktop), `MAHb91dW-f8` (mobile 4:5) | Canva AI Product Terms, commercial use | `home-2880.jpg` 2880×1440, `home-mobile-1824.jpg` 1824×2272 | — | `Visuals.home` | **Validated 2026-11-25** |
| `about` | About — under the header | Horizon, openness | Canva AI `MAHbxMVUtYE` | idem | `about-2880.jpg` 2880×1440 | — | `Visuals.about` | **Validated 2026-11-25** |
| `events` | Home events + Events page | Mood of an upcoming meeting (captioned) | Canva AI `MAHbxGxt9Jc` | idem | `events-2496.jpg` 2496×1664 | — | `Visuals.events` | **Validated 2026-11-25** |
| `sob` | Home SoB teaser + State of BIB | Network and territory | Canva AI `MAHbxFcLCME` | idem | `sob-2720.jpg` 2720×1536 | — | `Visuals.sob` | **Validated 2026-11-25** |
| `newsletter` | Home newsletter | Reading, watch | Canva AI `MAHbxO0Q_TM` | idem | `newsletter-1824.jpg` 1824×2272 | — | `Visuals.newsletter` | **Validated 2026-11-25** |
| `closing` | Home closing band (full-bleed) | Anticipation before the call to action (captioned) | To generate | — | none | 2560×853 + 1200×900 | decorative (`alt=""`) | Missing |
| `ch01–ch04.jpg` | none (unused since #26) | Legacy photos showing people | Unknown | Unknown | 1168×784 | — | — | **Do not reuse** |
| founder portraits | `/about#fondateurs` | Real founders | Founders | Provided by the founders | 848×1216, 1024×1536 | — | names | In use |

### Generation prompts

Each prompt ends with: *ultra-photorealistic editorial photograph, natural light,
warm desaturated palette (ivory, sand, ink, muted gold), no people, no text, no
logo, no watermark*.

- **home (21:9 and 4:5):** late-afternoon sunlight through a concrete
  brise-soleil casting geometric shadows on an ivory plaster wall; large empty
  area on the left for the headline.
- **about (21:9):** coastal horizon at dawn, calm sea, warm haze, ivory sky
  touched with gold; minimal, no landmark.
- **events (4:5):** empty contemporary meeting room, wooden chairs in rows, soft
  window light; no screen showing text.
- **sob (3:1):** aerial view of a city at dusk, warm street lights forming a
  network pattern; no recognisable landmark.
- **newsletter (4:5):** printed journal and linen paper on a sand-coloured table,
  soft side light; no readable text, no brand.
- **closing (3:1 and 4:3):** entrance of a meeting venue at blue hour, warm
  lights, chairs set out; darker area on the left for contrast.

## 5. Integration

Home placements since 2026-11-26 (Immersive Spatial Institution): `about`
(horizon) opens the hero and closes the newsletter chapter with a different
crop; `home` (light on stone) carries the mission chapter; `events`,
`newsletter` and `sob` illustrate the first three "what we build" steps;
`sob` is also the State of BIB backdrop. Human photos proposed on the design
canvas (board 02) will replace the hero and mission images once downloaded
and their licences checked.


- `<picture>` built with `getImageProps` (Next 16 art direction): the mobile
  variant is served below 768 px, the desktop file above; AVIF then WebP through
  the image optimiser; `srcset` from `deviceSizes`.
- Reserved ratio (`.ed-media-*`) so nothing shifts while loading; focal point via
  `object-position`.
- `priority` + `fetchpriority="high"` for the hero (LCP) only; every other image
  is lazy-loaded.
- Full-bleed (`bleed`): no radius, height capped at `min(78vh, 1100px)` so a 21:9
  hero does not become 1 474 px tall on a 3440 px screen; under 768 px the hero
  switches to 4:5.

### Checks at each width (2026-11-25, synthetic 2560 px test files, not committed)

| Width | Hero result |
| --- | --- |
| 390 | Mobile 4:5 file, 390×487, no horizontal scroll |
| 768 | Desktop file cropped 4:3 on the focal point |
| 1024 | 21:9, 1080 w candidate |
| 1920 | 21:9, 1920×823, 1920 w candidate |
| 2560 | 21:9, 2560×1097, 3840 w candidate |
| 3440 | Capped at 1100 px high, 3840 w candidate |

Events and closing captions render in all three languages; the hero has
`fetchpriority="high"`, the others `loading="lazy"`.

## 6. Before / after

- **Before (develop, f36d42b):** the five 200 px previews were displayed
  stretched to 1200 px (visibly blurry), inside the content column, with no
  mobile crop, no source or licence record and no caption on the events image.
- **After:** nothing blurry is shown. Home, about, events, State of BIB and
  newsletter use the HD exports (validated 2026-11-25; each matches its Canva
  generation, checked against the earlier previews). The hero is edge to edge with a dedicated mobile
  crop, events and closing visuals are captioned as mood visuals, and every file
  is traceable to its source and licence.

## 7. Enabling a visual

1. Export from Canva (or download the stock photo) at the size in the inventory.
2. Save as `public/images/editorial/<key>-<width>.jpg` (and `<key>-mobile.jpg`).
3. Update the entry in `visuals.ts`: `desktop`/`mobile` with real dimensions,
   `source.reference` and `license`, then `status: "validated"`.
4. `pnpm test tests/unit/editorial-visuals.test.ts` and check the page at 390,
   1920 and 3440 px.

## 8. Photographs still needed (2026-11-26)

The agent environment cannot download from stock libraries or generate
photographs, so none of the images below is in the repository yet. Each slot
already has a layout that works without the photo (validated image or
typographic opening), so nothing renders as an empty frame. To add one:
download it at the size given, check its licence page, save it under
`public/images/editorial/`, add a catalogue entry in
`src/lib/editorial/visuals.ts` (source, author, licence, URL, dimensions,
focal point, alt in FR/EN/ES) and point the page at the new key.

| # | Page · section | Subject and composition | Mood | Export | Desktop / tablet / mobile crop | Search keywords | Candidate (licence to confirm on download) | Expected file | New key |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Home · hero | Environmental portrait of a Black tech professional, subject right third, calm area left for the title | Late-afternoon natural light, warm | 2880×1620 + 1200×1500 | 16:9 full-bleed / 4:3 / 4:5, focal 70 % 45 % | black software engineer portrait natural light, coworking | Unsplash `NKRNcphMEgw` (Unsplash License) | `hero-people-2880.jpg`, `hero-people-mobile-1200.jpg` | `heroPeople` |
| 2 | Home · mission (dominant image) | Two to four people working on a project around a table or screen | Documentary, bright interior | 2400×1600 | 7/12 width, 92 svh / 16:10 / 16:10, focal 50 % 50 % | african professionals collaboration laptop office | Pexels `3184635` (Pexels License) | `mission-collab-2400.jpg` | `missionCollab` |
| 3 | Home + Mission · "Mettre en lumière" step | Entrepreneur at work, looking at the camera or the work | Natural light, quiet | 1600×2000 | sticky stage 7/12 / 16:10 / 16:10 | african woman entrepreneur portrait | Unsplash `ZN52ZBFkw4Y`, Oluwakemi Solaja | `axis-highlight-1600.jpg` | `axisHighlight` |
| 4 | About · hero | Contemporary African city architecture, wide perspective | Golden hour or blue hour | 2880×1920 | right half / 16:10 / 4:5, focal 60 % 50 % | lagos skyline victoria island, contemporary african architecture | Unsplash `gff8Y7MBTEE` or `Bp8XkFYszTw` (Olawale Munna) | `about-city-2880.jpg` | `aboutCity` |
| 5 | Events · hero (cinematic) | Real BIB gathering with authorised rights; otherwise an audience seen from behind, no identifiable faces | Warm, documentary | 2880×1620 | full-bleed / 16:9 / 4:5 | — (real photo preferred) | BIB's own photos (admin upload with rights) | `events-gathering-2880.jpg` | `eventsGathering` |
| 6 | Press · hero | Editorial workspace: notebook, laptop, hands of a Black professional | Calm, sand tones | 2400×1600 | right half / 16:10 / 4:5 | black journalist notebook desk natural light | to search (Unsplash, Pexels) | `press-workspace-2400.jpg` | `pressWorkspace` |
| 7 | Membership · hero | Small group conversation, diverse ages | Warm, informal | 2400×1600 | right half / 16:10 / 4:5 | black professionals conversation networking | Unsplash `4yTHVRarfGY`, wocintechchat.com (Unsplash License) | `community-2400.jpg` | `community` |
| 8 | Startup Spotlight · featured | Portrait of the selected founders, supplied by the startup with written consent | Documentary | 1600×2000 | 5/12 panel / 4:5 / 4:5 | — | supplied by the startup | `spotlight-<slug>-1600.jpg` | per startup |
| 9 | BIB in action | Documentary photos of real gatherings only | — | as uploaded | — | — | admin upload with rights (Supabase) | — | — |

Rules: no AI-generated person presented as a BIB member, no stock photo
captioned as a BIB event, no logo added on a scene, Unsplash+ / Getty / Alamy /
Shutterstock excluded (paid licences).


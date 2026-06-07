# Raredoc Design Brief (Toss-style)

A reference for any visual design. Source of truth: `docs/design-system/tokens.css`.
Attach this file to every Pencil run via `--prompt-file`. Light mode is default.

## Aesthetic direction
Clean, airy, light Korean fintech look (modeled on Toss / toss.im). Generous whitespace,
thin hairline borders instead of heavy shadows, flat surfaces, restrained color — color is
used sparingly for the brand blue and status states. Numbers/prices use tabular figures.
UI language: Korean (한국어).

## Color (light mode)
- Brand (primary): `#3182F6` (Toss Blue). Hover `#1B64DA`. Weak/selected bg `#EBF2FF`.
- Background: base `#FFFFFF`, subtle `#F9FAFB`, muted `#F2F4F6`.
- Text: primary `#0B0F19` (near-black), secondary `#4E5968`, tertiary `#6B7684`, quaternary `#8B95A1`.
- Borders/dividers: hairline `rgba(0,27,55,0.10)`, very light grey lines.
- Status: positive/price-up & danger = red `#F04452`; success = green `#02A262`; warning = amber `#DD7D02`.
- (KR convention: red = up/positive, blue = down/negative.)

## Typography
- Font family: **Pretendard** (Korean + Latin), system sans fallback.
- Weights: regular 400, medium 500, semibold 600, bold 700.
- Type scale (size / line-height):
  - display 24 / 34.8 (page titles)
  - title-1 20 / 29
  - title-2 17 / 24.7
  - subtitle 15 / 21.8
  - body 15 / 21.8
  - label 14 / 20.3
  - caption 13 / 18.9
  - micro 12 / 17.4
  - tiny 10 / 14

## Spacing & layout
- 4px baseline grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Page max-width 1280px, gutter 24px. Global header height 52px.
- Common app shell: left sidebar (~220px) + main content column.

## Radius
xs 4 · sm 6 · md 8 · lg 12 · xl 16 · 2xl 20 · pill 9999 · circle 50%.

## Elevation
- Default surface: hairline only — `inset 0 0 0 1px rgba(0,27,55,0.10)` (no drop shadow).
- Hover card: soft md shadow. Modal: larger lg shadow.

## Component conventions
- **Button**: pill radius. Heights sm 28 / md 32 / lg 44 / xl 56. Semibold label.
  Primary = solid brand blue, white text. Secondary = light grey fill. Ghost = transparent.
- **Card**: radius 12, hairline border (no heavy shadow), padding 16, white bg.
- **Input / Search**: bg `rgba(2,32,71,0.05)`, radius 8, height 40, subtle inner border.
- **Chip / filter pill**: pill radius, height 28, caption text, semibold.
  Selected = brand-weak bg `#EBF2FF` + brand text `#3182F6`. Unselected = thin grey outline.
- **Tag / badge**: small soft-rounded; category tags use muted tinted backgrounds.
- **Segmented control**: small pill group, selected segment white/raised.
- **Table / list rows**: row height ~52–72px, thin dividers, hover = muted bg.
- **Avatar**: circle, initial letter on light grey.

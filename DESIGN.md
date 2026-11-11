# DESIGN.md — DueDate

Design rules for all UI work. Base: the `minimalist-ui` skill in `.claude/skills/minimalist-ui/`
(verbatim copy of `skills/minimalist-skill` from Leonxlnx/taste-skill-classics, commit `5e08c93`, MIT).

**Precedence:** Accessibility > this file > `SKILL.md`. Where this file says nothing, `SKILL.md` applies.
The skill is written for websites; DueDate is a daily-use **app**, so the overrides below exist.

## 1. Character
Calm, editorial workspace (document feel), not a SaaS dashboard. Color only carries meaning.
One primary action per screen. Nothing moves unless the user caused it.

## 2. Overrides of `SKILL.md`

| `SKILL.md` says | DueDate does | Why |
|---|---|---|
| Massive section padding (`py-24`/`py-32`) | App density: 4/8 px spacing scale, page padding 24–40 px, list rows 40–44 px | Lists must be scannable without scrolling |
| Scroll-entry fades, staggered reveals on all blocks | **None** | Distracting; content must be instantly there |
| Ambient gradient blobs, background imagery, photos | **None** | No decoration in a work tool |
| Faux-OS window chrome, picsum placeholders | Not used | Website patterns |
| Light palette only | Light **and** dark (dark = default), see §3 | Existing product decision |
| Serif for hero headings | Serif only for page titles (H1); everything else sans | Apps have no heroes |

Kept from `SKILL.md` without change: banned list (§2: no Inter/Roboto, no Lucide/Feather, no heavy
shadows, no gradients/neon/glass, no pill-shaped large containers or primary buttons, **no emojis in UI**,
no placeholder names, no AI copy clichés), 1 px borders, radius ≤ 12 px, flat buttons, pastel tags,
`<kbd>` keys, motion only via `transform`/`opacity`, `prefers-reduced-motion`.

Emojis typed by the user inside their own content are allowed; the UI itself never adds emojis.

## 3. Tokens (CSS variables in `src/style.css`)

Defined as `--dd-*` variables and exposed as Tailwind utilities via `@theme inline`
(`bg-canvas`, `text-ink`, `border-line`, `bg-red-soft` …). Never use raw hex values in components.
All pairs are contrast-checked (WCAG 2.2 AA: text ≥ 4.5:1, UI edges and focus ≥ 3:1).

| Token | Light | Dark |
|---|---|---|
| `canvas` | `#FBFBFA` | `#191919` |
| `surface` | `#FFFFFF` | `#202020` |
| `surface-muted` | `#F4F3F0` | `#262626` |
| `line` (dividers, decorative) | `#EAEAEA` | `rgba(255,255,255,0.09)` |
| `line-strong` (input edges, ≥ 3:1) | `#8F8E89` | `rgba(255,255,255,0.36)` |
| `ink` | `#2F3437` | `#E6E6E4` |
| `ink-muted` | `#6B6A66` ¹ | `#9B9A97` |
| `accent` / `on-accent` | `#111111` / `#FFFFFF` | `#E6E6E4` / `#191919` |
| `focus` | `#1F6C9F` | `#8CC4EA` |

Pastels (`*-soft` background / `*-ink` text):

| Name | Light | Dark |
|---|---|---|
| red | `#FDEBEC` / `#9F2F2D` | `rgba(253,235,236,0.10)` / `#F2A7A5` |
| blue | `#E1F3FE` / `#1F6C9F` | `rgba(225,243,254,0.10)` / `#8CC4EA` |
| green | `#EDF3EC` / `#346538` | `rgba(237,243,236,0.10)` / `#9BC59E` |
| yellow | `#FBF3DB` / `#8A5C00` ¹ | `rgba(251,243,219,0.10)` / `#E2C06B` |

¹ Darker than `SKILL.md` (`#787774`, `#956400`), which fail 4.5:1 on the canvas / tag background.

## 4. Semantic color mapping
- **Areas:** Studium = blue · Freelance = green · Privat = yellow.
- **Deadline status:** overdue = red · urgent (< 3 d) = red text only, no fill · soon / ok = neutral muted text.
  Only what needs attention gets color.
- Color is never the only signal: always label, icon or position as well.

## 5. Typography
- Sans (UI, body): `-apple-system, 'SF Pro Text', 'Helvetica Neue', 'Switzer', sans-serif` — system fonts first,
  no network font loading by default.
- Serif (page H1 only): `'Newsreader', 'Instrument Serif', Georgia, serif`, `letter-spacing: -0.02em`,
  `line-height: 1.1`. If a web font is used, it is **self-hosted** (never Google Fonts CDN, privacy).
- Mono (dates, durations, numbers, `<kbd>`): `ui-monospace, 'SF Mono', 'JetBrains Mono', monospace`,
  `font-variant-numeric: tabular-nums`.
- Body `line-height: 1.6`; never pure black or pure white text.

## 6. Components (`src/components/ui/`, reference page `#/design`)
Button (primary / secondary / ghost / danger) · Card (1 px border, radius 8–12 px, no shadow) ·
Input / Select / Checkbox · Tag (pastel pill, `text-xs`, uppercase, tracking 0.05em) ·
Dialog / side panel · Toast (with undo) · Kbd · EmptyState (one sentence + one action).

## 7. Motion
Allowed: hover / active / focus transitions 120–200 ms; `scale(0.98)` on press; check-off animation
when a task is completed; toast and panel enter/exit. Easing `cubic-bezier(0.16, 1, 0.3, 1)`.
All disabled under `prefers-reduced-motion: reduce` except instant state changes.

## 8. Icons
One icon family, one weight, consistent size (16/20 px). Phosphor (`@phosphor-icons/vue`), weight **bold**
set once in `main.js`. Decorative icons get `aria-hidden="true"`,
icon-only buttons get `aria-label`.

## 9. Copy
German, plain, specific, short. Supportive and never shaming ("2 Aufgaben sind liegen geblieben —
verschieben oder kleiner machen?" instead of "Du bist im Rückstand"). No AI clichés, no exclamation-mark spam.

## 10. Accessibility (non-negotiable)
WCAG 2.2 AA contrast in both themes · visible `focus-visible` ring (2 px, offset 2 px) · full keyboard use ·
targets ≥ 24 px desktop, ≥ 44 px touch · `lang="de"` · status changes announced via `aria-live`.

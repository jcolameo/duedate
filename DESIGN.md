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

| Token | Light | Dark |
|---|---|---|
| `--bg` canvas | `#FBFBFA` | `#191919` |
| `--surface` cards, panels | `#FFFFFF` | `#202020` |
| `--surface-muted` hover, inputs | `#F7F6F3` | `#252525` |
| `--border` | `#EAEAEA` | `rgba(255,255,255,0.08)` |
| `--text` | `#2F3437` | `#E6E6E4` |
| `--text-muted` | `#787774` | `#9B9A97` |
| `--accent` primary button bg | `#111111` | `#E6E6E4` (text `#191919`) |

Pastels (tag background / text). Dark values are derived and **must be contrast-checked in A5**:

| Name | Light bg / text | Dark bg / text |
|---|---|---|
| red | `#FDEBEC` / `#9F2F2D` | `rgba(253,235,236,0.10)` / `#F2A7A5` |
| blue | `#E1F3FE` / `#1F6C9F` | `rgba(225,243,254,0.10)` / `#8CC4EA` |
| green | `#EDF3EC` / `#346538` | `rgba(237,243,236,0.10)` / `#9BC59E` |
| yellow | `#FBF3DB` / `#956400` | `rgba(251,243,219,0.10)` / `#E2C06B` |

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

## 6. Components (built in A5, `src/components/ui/`)
Button (primary / secondary / ghost / danger) · Card (1 px border, radius 8–12 px, no shadow) ·
Input / Select / Checkbox · Tag (pastel pill, `text-xs`, uppercase, tracking 0.05em) ·
Dialog / side panel · Toast (with undo) · Kbd · EmptyState (one sentence + one action).

## 7. Motion
Allowed: hover / active / focus transitions 120–200 ms; `scale(0.98)` on press; check-off animation
when a task is completed; toast and panel enter/exit. Easing `cubic-bezier(0.16, 1, 0.3, 1)`.
All disabled under `prefers-reduced-motion: reduce` except instant state changes.

## 8. Icons
One icon family, one weight, consistent size (16/20 px). Candidate: Phosphor (regular/bold);
the dependency is decided and justified in roadmap step A5. Decorative icons get `aria-hidden="true"`,
icon-only buttons get `aria-label`.

## 9. Copy
German, plain, specific, short. Supportive and never shaming ("2 Aufgaben sind liegen geblieben —
verschieben oder kleiner machen?" instead of "Du bist im Rückstand"). No AI clichés, no exclamation-mark spam.

## 10. Accessibility (non-negotiable)
WCAG 2.2 AA contrast in both themes · visible `focus-visible` ring (2 px, offset 2 px) · full keyboard use ·
targets ≥ 24 px desktop, ≥ 44 px touch · `lang="de"` · status changes announced via `aria-live`.

# DueDate

A local-first deadline and planning app for studies, freelance work and personal projects.
No login, no backend, no tracking — all data stays in your browser.

## Features (current)

- **Deadlines** — import a school/task CSV by drag & drop, smart column detection with a review step,
  status per task (overdue, urgent, soon, ok) and `.ics` calendar export.
- **Home** — overview of overdue and urgent tasks and one task to focus on.
- **Stundenplan** — effort and priority per task, recurring busy blocks, a deterministic weekly plan
  and `.ics` export of the planned sessions.
- **My Week** — deadlines, planned sessions and busy blocks in one weekly grid, combined `.ics` export.
- **Settings** — dark/light theme, German/English.

What comes next is planned step by step in [`ROADMAP.md`](ROADMAP.md).
Design rules for all UI work are in [`DESIGN.md`](DESIGN.md).

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/duedate/>.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run deploy` | Manual fallback: build and push to the `gh-pages` branch (not needed once GitHub Actions deploys, see `.github/workflows/deploy.yml`) |
| `npm run storybook` | Component workshop |

## CSV import

Semicolon-separated files with a header row. At least a **title** and a **deadline** column are
needed; the app proposes a mapping and you confirm or correct it once (it is remembered).

| Role | Example header | Example value |
|---|---|---|
| Title (required) | `Titel` | `Abgabe Projektarbeit` |
| Deadline (required) | `Abgabe` | `24. April 2026` or `24.04.2026` |
| Category | `Fach` | `Frontend Development` |
| Description | `Beschreibung` | `Gemäss Auftrag` |
| Graded | `Benotet?` | `Ja` / `Nein` |

## Tech stack

Vue 3 (Composition API) · Vite · Tailwind CSS 4 · vue-router (hash history) ·
[PapaParse](https://www.papaparse.com/) · [ics](https://github.com/adamgibbons/ics) · Storybook

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture, data model, planned features and the spec-driven workflow (German)
- [docs/BACKUP_FORMAT.md](docs/BACKUP_FORMAT.md): backup file format
- [ROADMAP.md](ROADMAP.md), [DESIGN.md](DESIGN.md)

## Privacy

Everything runs in the browser. Imported files and all data are stored only in your browser's
`localStorage` and never sent to a server.

## License

MIT

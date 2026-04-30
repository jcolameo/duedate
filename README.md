# 📅 DueDate

> CSV rein → Kalender raus. Kein Tippen.

A lightweight web app that turns your school/work CSV into a sortable task list and exports deadlines directly to your calendar (`.ics`). No login, no backend, no tracking. **100% local.**

---

## ✨ Features

- 📂 **Drag & Drop CSV** — supports semicolon-delimited German formats
- 🎯 **Smart Status Detection** — `OVERDUE`, `URGENT`, `SOON`, `OK`
- 📅 **One-Click Calendar Export** — `.ics` works with Apple Calendar, Google Calendar, Outlook
- ⭐ **Graded Tasks Highlight** — never miss what counts
- 🌙 **Dark Mode by default** — easy on the eyes
- 🔒 **Privacy-first** — everything runs in your browser, nothing leaves your device

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/<your-username>/duedate.git
cd duedate

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📋 CSV Format

DueDate expects **semicolon-separated** CSVs with at least these columns:

| Column   | Required | Example              |
| -------- | -------- | -------------------- |
| `Titel`  | ✅ Yes   | `Abgabe Projektarbeit` |
| `Abgabe` | ✅ Yes   | `24. April 2026`     |
| `Fach`   | optional | `Frontend Development` |
| `Beschreibung` | optional | `Gemäss Auftrag` |
| `Benotet?` | optional | `Ja` / `Nein` |

Date formats supported:
- `24. April 2026`
- `24.04.2026`

---

## 🧱 Tech Stack

- **[Vue 3](https://vuejs.org/)** (Composition API)
- **[Vite](https://vitejs.dev/)** (build tool)
- **[Tailwind CSS](https://tailwindcss.com/)** (styling)
- **[PapaParse](https://www.papaparse.com/)** (CSV parsing)
- **[ics.js](https://github.com/adamgibbons/ics)** (calendar export)

---

## 🗺️ Roadmap

- [x] CSV → Table → `.ics` Export
- [x] Refactored into composables
- [ ] Notion-compatible CSV export
- [ ] Markdown export (Obsidian-friendly)
- [ ] Search & filter
- [ ] LocalStorage (remember last CSV)
- [ ] AI-powered column detection *(future paid tier)*

---

## 📜 License

MIT — do whatever you want, just don't blame me if your deadlines still hit you. 😉

---

Made with 🧠 + ☕ for everyone who hates manual calendar entry.
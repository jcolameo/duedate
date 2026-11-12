# DueDate backup format

`Settings → Daten und Backup → Backup herunterladen` writes one JSON file,
`duedate-backup-YYYY-MM-DD.json`. It contains everything the app stores in the
browser (nothing is sent anywhere). The file is plain JSON, so other tools
(scripts, an AI assistant) can read it, and it can be restored in the app.

```jsonc
{
  "format": "duedate-backup",   // fixed
  "version": 1,                 // file format; the app refuses newer versions
  "schema": 4,                  // shape of the stored data; older ones are upgraded on import
  "exportedAt": "2026-11-12T08:51:00.000Z",
  "app": "DueDate",
  "data": {
    "tasks": [ /* Task, see below */ ],
    "tags": [ { "id": "t-…", "name": "Huber AG", "color": "orange" } ],
    "availability": [ { "id": "b…", "label": "Arbeit", "days": ["Mon","Tue"], "startTime": "08:00", "endTime": "17:00" } ],
    "today": { "date": "2026-11-12", "ids": ["…"], "skipped": [] },   // or null
    "columnMapping": { "title": "Titel", "deadline": "Abgabe" },       // or null
    "csv": { "fileName": "…", "rows": [ { } ] },                       // last CSV import, or null
    "settings": { "theme": "dark", "locale": "de" }
  }
}
```

## Task

| Field | Meaning |
|---|---|
| `id` | Unique. CSV tasks: derived from title + date (stable calendar UIDs). Own tasks: `m-…` |
| `title`, `description` | Description is Markdown. Checklist steps are lines `- [ ] step` / `- [x] done` |
| `area` | `study`, `freelance` or `personal` |
| `status` | `open` or `done` (`completedAt` is set when done) |
| `due` | `YYYY-MM-DD` or `null` |
| `priority` | `high`, `medium`, `low` or `null` (= automatic) |
| `estimateMin` | total effort in minutes (multiples of 30) or `null`. Backups with schema 3 have `effort` (`30m`, `1h`, `2h`, `3h+`); it is converted on import |
| `tags` | tag IDs |
| `notes` | own notes on CSV tasks (their `description` belongs to the CSV) |
| `source` | `csv` or `manual` |

## Import rules

- The file is validated first. A damaged file changes nothing and the app
  says what is wrong.
- Restoring **replaces** all current data. The dialog shows the counts of
  both sides and offers to save the current data as a file first.
- Missing task fields get defaults, tag IDs that point to no tag are dropped.

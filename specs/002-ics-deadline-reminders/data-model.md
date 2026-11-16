# Data Model: Erinnerungen im Deadline-Kalenderexport

**Keine Änderung an gespeicherten Daten.** Kein neues Feld an Aufgaben, keine Schema-Version, keine Migration, keine
Änderung am Backup-Format.

## Erinnerung (nur im Export, wird nicht gespeichert)

Wird beim Export für jeden Deadline-Eintrag erzeugt.

| Feld | Wert | Regel |
|---|---|---|
| `action` | `display` | Benachrichtigung, keine E-Mail |
| `description` | Titel des Eintrags | identisch mit `title` des Events (FR-003) |
| `trigger` | `{ hours: 6, before: true }` | Vortag 18:00 lokal (FR-002) |
| `trigger` | `{ hours: 8, before: false }` | Abgabetag 08:00 lokal (FR-002) |

**Regeln**
- Genau zwei Erinnerungen pro Deadline-Eintrag, in dieser Reihenfolge: Vortag, dann Abgabetag (FR-001).
- Nur, wenn `buildDeadlineEvent` mit `withReminders: true` aufgerufen wird (R4).
- Die Werte sind Konstanten in `src/utils/ics.js`. C6b macht daraus später Einstellungen mit diesen Standardwerten.

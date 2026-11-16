# Implementation Plan: Erinnerungen im Deadline-Kalenderexport

**Branch**: `feat/c6-ics-erinnerungen` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ics-deadline-reminders/spec.md`

## Summary

Der Deadline-Export (`deadlines.ics`) bekommt pro Eintrag zwei Kalender-Erinnerungen: Vortag 18:00 und Abgabetag
08:00. Umsetzung: `buildDeadlineEvent` in `src/utils/ics.js` erhält die Option `withReminders`, die zwei `alarms` mit
relativen Triggern (`-PT6H`, `PT8H`) anhängt. Nur `useICSExport` schaltet sie ein. Keine neue Abhängigkeit, keine
Datenänderung. Details: [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (ES-Module), Vue 3.5 mit `<script setup>`, kein TypeScript

**Primary Dependencies**: `ics` 3.12.0 (bereits vorhanden, dynamisch geladen)

**Storage**: keine Änderung (`localStorage` unberührt)

**Testing**: Vitest 4, Projekt `unit` (`npm test`), dazu ein manueller Kalendertest

**Target Platform**: Browser (Desktop zuerst), Ausgabe für Apple Kalender, Google Kalender, Outlook

**Project Type**: Single-Page-Web-App, statisch gehostet (GitHub Pages)

**Performance Goals**: Export von mehreren hundert Deadlines ohne spürbare Verzögerung (wie heute)

**Constraints**: local-first, keine Netzwerkanfrage, keine Migration

**Scale/Scope**: 1 Funktion, 1 Aufrufer, ca. 20 Zeilen Code und 3–4 Tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung | Ergebnis |
|---|---|---|
| I. Local-first | Erinnerungen stecken in der Datei. Der Kalender erinnert, ohne dass ein Server nötig ist. | ✅ |
| II. Daten gehören dem Nutzer | Keine Datenmodelländerung, keine Migration, Backup unverändert | ✅ |
| III. Klare Schichten | Logik in `src/utils/ics.js` (rein, getestet). Das Composable gibt nur die Option weiter. | ✅ |
| IV. Barrierefreiheit | Keine neue Oberfläche | ✅ (n/a) |
| V. Zweisprachige Texte | Kein neuer Text: Die Alarm-Beschreibung ist der vorhandene Titel (R3). | ✅ |
| VI. Gestaltung | Keine neue Oberfläche | ✅ (n/a) |
| VII. Gegen Prokrastination | Kein zusätzlicher Schritt beim Export (SC-004) | ✅ |
| VIII. Sparsame Abhängigkeiten | Nur die vorhandene Bibliothek `ics` | ✅ |
| IX. Kleine Schritte | Ein Feature, ein Branch, ein PR. `ROADMAP.md` C6 wird nachgeführt. | ✅ |
| X. KI zuletzt | Keine KI | ✅ (n/a) |

**Re-check nach Phase 1**: unverändert ✅. Keine Verstösse, deshalb ist „Complexity Tracking“ leer.

## Project Structure

### Documentation (this feature)

```text
specs/002-ics-deadline-reminders/
├── spec.md
├── plan.md              # diese Datei
├── research.md          # R1–R6 Entscheide und Risiko Google Kalender
├── data-model.md        # keine gespeicherten Daten, Aufbau einer Erinnerung
├── quickstart.md        # Prüfschritte (Tests, Build, Kalender)
├── contracts/
│   └── deadline-event-ics.md   # so sieht ein Eintrag in deadlines.ics aus
└── tasks.md             # folgt mit /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── ics.js                    # ÄNDERN: Konstanten + Option withReminders in buildDeadlineEvent
│   └── __tests__/ics.test.js     # ÄNDERN: neue Tests (Alarme, Standard ohne Alarme, stabile UID)
└── composables/
    ├── useICSExport.js           # ÄNDERN: withReminders: true übergeben
    └── useCombinedExport.js      # UNVERÄNDERT (bekommt bewusst keine Erinnerungen)
```

Nachführen: `ROADMAP.md` (C6 Status, Link auf diese Spezifikation, C6b als neuer Eintrag).

**Structure Decision**: bestehende Struktur, kein neues Modul. Die Logik bleibt in `src/utils/ics.js`, wo heute alle
Kalendereinträge entstehen.

## Risks

- **R6 — Google Kalender** übernimmt importierte Erinnerungen möglicherweise nicht. Wird im manuellen Test geprüft.
  Falls bestätigt: Spezifikation (SC-002) anpassen, nicht den Code.

---
description: "Task list for C6, reminders in the deadline calendar export"
---

# Tasks: Erinnerungen im Deadline-Kalenderexport

**Input**: Design documents from `specs/002-ics-deadline-reminders/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deadline-event-ics.md, quickstart.md

**Tests**: Ausdrücklich gewünscht (Unit-Tests in `src/utils/__tests__/ics.test.js`, plus ein manueller Kalendertest).
Die Tests werden **vor** dem Code geschrieben und müssen zuerst fehlschlagen.

**Organization**: Die Aufgaben sind nach User Story gruppiert (US1 = Kalender erinnert, US2 = erneuter Export).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: kann parallel laufen (andere Datei, keine offene Abhängigkeit)
- **[Story]**: zugehörige User Story aus spec.md

---

## Phase 1: Setup

**Purpose**: Ausgangslage sichern

- [X] T001 `npm test` und `npm run build` auf dem Branch `feat/c6-ics-erinnerungen` ausführen. Beide müssen grün sein, bevor etwas geändert wird (Referenz: 505 Tests).

---

## Phase 2: Foundational

**Purpose**: Gemeinsame Konstanten, die beide Stories brauchen

- [X] T002 In `src/utils/ics.js` die exportierte Konstante `DEADLINE_REMINDER_TRIGGERS` anlegen: `[{ hours: 6, before: true }, { hours: 8, before: false }]`. Kommentar: Die Trigger zählen ab Abgabetag 00:00 lokal, also „Vortag 18:00“ und „Abgabetag 08:00“ (research.md R2). C6b macht daraus später Einstellungen.

**Checkpoint**: Konstante vorhanden, Tests weiterhin grün.

---

## Phase 3: User Story 1 - Der Kalender erinnert an Abgaben (Priority: P1) 🎯 MVP

**Goal**: Jeder Eintrag in `deadlines.ics` hat genau zwei Erinnerungen (Vortag 18:00, Abgabetag 08:00), der Export „Meine Woche“ keine.

**Independent Test**: `npm test` (neue Fälle grün). Danach quickstart.md Schritt 3: `deadlines.ics` enthält pro `VEVENT` zwei `VALARM`.

### Tests for User Story 1 (zuerst schreiben, müssen fehlschlagen)

- [X] T003 [US1] Test in `src/utils/__tests__/ics.test.js`: `buildDeadlineEvent(task, { withReminders: true })` liefert `alarms` mit genau 2 Einträgen. Beide haben `action: 'display'` und `description` gleich `event.title`. Die Trigger sind in dieser Reihenfolge `{ hours: 6, before: true }` und `{ hours: 8, before: false }`.
- [X] T004 [US1] Test in `src/utils/__tests__/ics.test.js`: `buildDeadlineEvent(task)` ohne Option hat **kein** Feld `alarms` (kombinierter Export und andere Aufrufer bleiben unverändert, FR-005).
- [X] T005 [US1] Test in `src/utils/__tests__/ics.test.js`: `await buildIcs([buildDeadlineEvent(task, { withReminders: true })])` enthält genau 2× `BEGIN:VALARM`, einmal `TRIGGER:-PT6H` und einmal `TRIGGER:PT8H` (contracts/deadline-event-ics.md).
- [X] T006 [US1] `npm test` ausführen und bestätigen, dass T003–T005 **fehlschlagen**. Die anderen Tests bleiben grün.

### Implementation for User Story 1

- [X] T007 [US1] In `src/utils/ics.js` die Funktion `buildDeadlineEvent` um die Option `withReminders = false` erweitern. Wenn `true`: `event.alarms = DEADLINE_REMINDER_TRIGGERS.map(trigger => ({ action: 'display', description: event.title, trigger: { ...trigger } }))`. Den JSDoc-Kommentar der Funktion nachführen.
- [X] T008 [US1] In `src/composables/useICSExport.js` beim Aufruf `buildDeadlineEvent(task, { untitled: t('common.untitled'), withReminders: true })` übergeben. `src/composables/useCombinedExport.js` **nicht** ändern.
- [X] T009 [US1] `npm test` ausführen: T003–T005 grün, alle übrigen Tests grün.

**Checkpoint**: US1 ist fertig und für sich lieferbar (MVP).

---

## Phase 4: User Story 2 - Erneuter Export ersetzt statt verdoppelt (Priority: P2)

**Goal**: Ein zweiter Export erzeugt dieselben Einträge (gleiche UID) mit weiterhin genau zwei Erinnerungen.

**Independent Test**: `npm test` (neuer Fall grün). Danach quickstart.md Schritt 4: Die Datei zweimal importieren → kein Duplikat.

- [X] T010 [US2] Test in `src/utils/__tests__/ics.test.js`: `buildDeadlineEvent` zweimal mit derselben Aufgabe und `withReminders: true` aufrufen. Ergebnis: gleiche `uid` (`deadline-t123@duedate.app`), jeweils genau 2 `alarms`, und die Alarm-Objekte der beiden Aufrufe sind voneinander unabhängig. Ändert man den Trigger eines Aufrufs, bleibt der andere Aufruf und `DEADLINE_REMINDER_TRIGGERS` unverändert.
- [X] T011 [US2] `npm test` ausführen. Sollte T010 fehlschlagen, `buildDeadlineEvent` in `src/utils/ics.js` so korrigieren, dass jede Erinnerung ein eigenes Trigger-Objekt bekommt.

**Checkpoint**: US1 und US2 grün.

---

## Phase 5: Polish & Abschluss

- [X] T012 `npm run build` ausführen: ohne Fehler.
- [ ] T013 Manueller Test nach `quickstart.md` Schritte 3–5 (Datei prüfen, Apple Kalender, Google Kalender, Outlook, erneuter Import, „Meine Woche“ ohne `VALARM`). Ergebnis für Google Kalender (Risiko R6) in `specs/002-ics-deadline-reminders/research.md` unter R6 eintragen. Falls Google die Erinnerungen nicht übernimmt: SC-002 in `spec.md` anpassen.
- [X] T014 [P] `ROADMAP.md` nachführen: C6 auf ✅ mit Link auf `specs/002-ics-deadline-reminders/spec.md`. Einen neuen Schritt **C6b** „Erinnerungszeiten einstellbar (Standard Vortag 18:00, Abgabetag 08:00)“ als ⬜ eintragen. Eintrag im Changelog.

---

## Dependencies & Execution Order

- T001 → T002 → US1 (T003–T009) → US2 (T010–T011) → Polish (T012–T014)
- In US1: Tests (T003–T005) → Fehlschlag bestätigen (T006) → Code (T007, T008) → grün (T009)
- US2 baut auf der Funktion aus US1 auf. Es gibt keine sinnvolle Reihenfolge davor.

### Parallel Opportunities

- T003–T005 liegen in derselben Datei, deshalb nicht parallel.
- T014 (ROADMAP) kann parallel zu T012/T013 laufen.
- Insgesamt ist das Feature klein. Parallelisieren bringt hier kaum etwas, und ein Agent arbeitet alles der Reihe nach ab.

## Implementation Strategy

1. **MVP = US1** (T001–T009). Danach lassen sich die Erinnerungen schon nutzen.
2. US2 (T010–T011) sichert das bestehende Verhalten beim erneuten Export ab.
3. Polish (T012–T014): Build, echter Kalendertest, Roadmap.
4. Danach: `/speckit-converge`, dann ein Pull Request.

# Feature Specification: Erinnerungen im Deadline-Kalenderexport

**Feature Branch**: `feat/c6-ics-erinnerungen`

**Created**: 2026-11-16

**Status**: Approved

**Roadmap**: C6 (`ROADMAP.md`, Phase C)

**Input**: User description: "C6 — Wenn ich Deadlines als .ics exportiere, soll jeder Termin zwei Erinnerungen
enthalten: 1 Tag vorher und 2 Stunden vorher. So erinnert mich mein Kalender auf Handy und Desktop, auch wenn DueDate
geschlossen ist. Beispiel: Abgabe Fr 20.11. → Erinnerung Do 19.11. und Fr 20.11. 2 h vorher. Details: ROADMAP.md,
Abschnitt C6."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Der Kalender erinnert an Abgaben (Priority: P1)

Ein Student exportiert seine Deadlines und importiert die Datei in seinen Kalender (Google, Apple oder Outlook).
Ab dann meldet sich der Kalender auf Handy und Desktop von selbst: einmal am Vortag der Abgabe und einmal am
Abgabetag selbst. Er muss DueDate dafür nicht offen haben.

**Why this priority**: Das ist der ganze Nutzen des Features. DueDate kann ohne Server nicht selbst erinnern,
der Kalender kann es.

**Independent Test**: Eine Aufgabe mit Abgabe am Freitag, 20.11.2026, exportieren, die Datei in einen Kalender
importieren und prüfen, dass der Eintrag zwei Erinnerungen zu den erwarteten Zeitpunkten hat.

**Acceptance Scenarios**:

1. **Given** eine Aufgabe mit Abgabe am Fr 20.11.2026, **When** die Deadlines exportiert und in einen Kalender
   importiert werden, **Then** hat der Eintrag genau zwei Erinnerungen: Do 19.11.2026 um 18:00 und
   Fr 20.11.2026 um 08:00.
2. **Given** 10 Aufgaben mit verschiedenen Abgabedaten, **When** sie exportiert werden, **Then** hat jeder der
   10 Einträge seine zwei Erinnerungen.
3. **Given** eine Erinnerung wird ausgelöst, **When** der Kalender sie anzeigt, **Then** ist der Titel der Aufgabe
   (mit Fach) erkennbar, sodass klar ist, um welche Abgabe es geht.

---

### User Story 2 - Erneuter Export ersetzt statt verdoppelt (Priority: P2)

Der Student exportiert eine Woche später erneut und importiert die Datei wieder. Die Einträge werden wie heute
aktualisiert und nicht verdoppelt. Auch die Erinnerungen erscheinen pro Eintrag nur zweimal, nicht viermal.

**Why this priority**: Wiederholtes Exportieren ist heute schon sicher. Das darf durch die Erinnerungen nicht kaputtgehen.

**Independent Test**: Dieselben Deadlines zweimal exportieren und importieren. Jeder Eintrag existiert einmal und hat
zwei Erinnerungen.

**Acceptance Scenarios**:

1. **Given** die Deadlines wurden bereits exportiert und importiert, **When** sie erneut exportiert und importiert werden,
   **Then** existiert jeder Eintrag genau einmal mit genau zwei Erinnerungen.

---

### Edge Cases

- **Abgabe heute**: Die Erinnerung am Vortag liegt in der Vergangenheit. Der Kalender ignoriert sie. Die Erinnerung
  am Abgabetag erscheint, sofern ihr Zeitpunkt noch nicht vorbei ist.
- **Abgabe in der Vergangenheit**: Der Eintrag wird wie heute exportiert. Vergangene Erinnerungen löst der Kalender
  nicht mehr aus.
- **Erledigte Aufgaben**: Sie werden wie heute behandelt. Was heute exportiert wird, bekommt Erinnerungen, und
  dieses Feature ändert nichts daran.
- **Zeitzone / Sommerzeit**: Die Erinnerungen gelten in der lokalen Zeit des Kalenders, auch über einen
  Sommerzeitwechsel hinweg (z. B. Abgabe am Montag nach der Umstellung).
- **Kalender ohne Unterstützung für Erinnerungen**: Der Eintrag selbst wird trotzdem korrekt importiert.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Jeder Eintrag im Deadline-Export MUST genau zwei Erinnerungen enthalten: eine am Tag vor der Abgabe
  und eine am Abgabetag.
- **FR-002**: Die Erinnerungen MUST zu festen lokalen Uhrzeiten ausgelöst werden: am Vortag um **18:00** und am
  Abgabetag um **08:00**. Der Eintrag selbst bleibt ganztägig.
- **FR-003**: Der Text der Erinnerung MUST die Aufgabe erkennbar machen (Titel und Fach, wie im Eintrag).
- **FR-004**: Ein erneuter Export MUST bestehende Kalendereinträge weiterhin ersetzen statt sie zu verdoppeln, und
  jeder Eintrag MUST danach weiterhin genau zwei Erinnerungen haben.
- **FR-005**: Alles andere am Deadline-Export (Titel, Datum, Beschreibung, welche Aufgaben exportiert werden) MUST
  unverändert bleiben.
- **FR-006**: Die Erinnerungen MUST in Google Kalender, Apple Kalender und Outlook beim Import erkannt werden.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % der exportierten Deadline-Einträge haben nach dem Import genau zwei Erinnerungen.
- **SC-002**: Getestet am 2026-11-16 (Import der Datei): Google Kalender übernimmt beide Erinnerungen zur erwarteten
  Uhrzeit. Outlook übernimmt nur die erste (Vortag 18:00), weil es eine Erinnerung pro Termin kennt. Apple Kalender
  (iPhone) übernimmt keine und setzt seinen eigenen Standard. Die Grenzen liegen ausserhalb von DueDate und werden
  dokumentiert, nicht umgangen.
- **SC-003**: Ein zweiter Export und Import erzeugt 0 doppelte Einträge und 0 doppelte Erinnerungen.
- **SC-004**: Der Export braucht für den Nutzer keinen zusätzlichen Schritt gegenüber heute.

## Clarifications

### Session 2026-11-16

- Q: Zu welcher Uhrzeit sollen die Erinnerungen bei ganztägigen Deadlines kommen? → A: feste Uhrzeiten,
  am Vortag um 18:00 und am Abgabetag um 08:00 (FR-002).
- Q: Soll der Nutzer die Uhrzeiten selbst einstellen können? → A: Ja, aber als separates Feature C6b später.

## Assumptions

- Nur der **Deadline-Export** bekommt Erinnerungen. Die geplanten Arbeitsblöcke (Stundenplan, Kalender) und der
  kombinierte Export „Meine Woche“ sind nicht Teil dieses Features.
- Die zwei Erinnerungen sind fest vorgegeben und nicht einstellbar. Einstellbare Zeiten folgen als eigenes Feature
  **C6b**. Die Zeiten 18:00 und 08:00 werden dort zu den Standardwerten.
- Eine Uhrzeit der Abgabe aus der CSV (z. B. 23:59) wird weiterhin ignoriert. Erinnerungen relativ zu einer
  Abgabezeit wären ein eigenes Feature.
- Ein Export einzelner Aufgaben (Roadmap: „Export pro Aufgabe“) ist nicht Teil dieses Features.
- Bekannte Grenze: Outlook übernimmt nur die erste Erinnerung (Vortag 18:00).
- Bekannte Grenze: Apple Kalender übernimmt importierte Erinnerungen nicht und nutzt seine Standard-Erinnerung für
  ganztägige Termine. Eine Umgehung über ein Kalender-Abo bräuchte einen Server (Constitution I).
- Die Erinnerung ist eine normale Anzeige-Erinnerung des Kalenders (Benachrichtigung), keine E-Mail.
- Ob und wie eine Erinnerung angezeigt wird, entscheidet am Ende der Kalender des Nutzers (z. B. wenn dort
  Benachrichtigungen ausgeschaltet sind).

# Research: Erinnerungen im Deadline-Kalenderexport

## R1 — Wie kommen Erinnerungen in die .ics-Datei?

- **Decision**: Die vorhandene Bibliothek `ics` (3.12.0) nutzen. Das Event-Objekt bekommt ein Feld `alarms` mit zwei
  Einträgen `{ action: 'display', description, trigger }`. Die Bibliothek schreibt daraus `VALARM`-Blöcke.
- **Rationale**: Die Bibliothek unterstützt es schon. Keine neue Abhängigkeit (Constitution VIII). Ausprobiert am
  2026-11-16: Die Ausgabe enthält zwei `BEGIN:VALARM … END:VALARM` im `VEVENT`.
- **Alternatives considered**: Die Datei als Text nachbearbeiten. Verworfen: Das ist fehleranfällig und doppelt
  vorhanden, was die Bibliothek schon kann.

## R2 — Wie trifft man „Vortag 18:00“ und „Abgabetag 08:00“ bei einem ganztägigen Termin?

- **Decision**: Relative Trigger ab Beginn des Termins (Abgabetag 00:00 lokal):
  - Vortag 18:00 → `trigger: { hours: 6, before: true }` → `TRIGGER:-PT6H`
  - Abgabetag 08:00 → `trigger: { hours: 8, before: false }` → `TRIGGER:PT8H`
- **Rationale**: Der Termin ist ein `DATE`-Wert ohne Zeitzone (`DTSTART;VALUE=DATE`). Kalender rechnen relative
  Trigger in der lokalen Zeit des Geräts. Damit stimmen die Uhrzeiten auch über einen Sommerzeitwechsel. Ein absoluter
  Trigger (UTC-Zeitpunkt) würde bei Reisen oder bei Sommerzeit um eine Stunde danebenliegen.
- **Alternatives considered**: Absoluter Trigger mit Datum und Uhrzeit (`TRIGGER;VALUE=DATE-TIME`). Verworfen:
  Er braucht UTC und ist an eine Zeitzone gebunden.

## R3 — Was steht in der Benachrichtigung?

- **Decision**: Die `description` des Alarms entspricht dem Titel des Eintrags (z. B. „📚 Typografie: Plakat ⭐“).
- **Rationale**: Das erfüllt FR-003 (Aufgabe erkennbar). Es kommt kein neuer übersetzbarer Text dazu, deshalb gibt es
  keine Änderung an den Sprachdateien (Constitution V). Der Kalender zeigt die Uhrzeit ohnehin selbst an.
- **Alternatives considered**: „Morgen: …“ oder „Heute: …“ vor den Titel setzen. Verworfen: Das braucht neue Texte in
  de/en, die im Kalender in der Exportsprache eingefroren wären. Ausserdem wäre „Morgen“ falsch, wenn die Erinnerung
  später gelesen wird.

## R4 — Nur der Deadline-Export, nicht „Meine Woche“

- **Decision**: `buildDeadlineEvent(task, options)` bekommt die Option `withReminders` (Standard `false`). Nur
  `useICSExport` (Export auf der Deadlines-Seite) setzt sie auf `true`.
- **Rationale**: `buildDeadlineEvent` wird auch vom kombinierten Export (`useCombinedExport`) benutzt. Laut
  Spezifikation (Assumptions) gehört er nicht zum Umfang. Mit dem Standard `false` ändert sich jeder andere Aufrufer
  nicht (FR-005).
- **Alternatives considered**: Standard `true` und `false` im kombinierten Export. Verworfen: Ein künftiger Aufrufer
  würde stillschweigend Erinnerungen erzeugen.

## R5 — Erneuter Export (FR-004)

- **Decision**: Nichts ändern. Die UID bleibt `deadline-<id>@duedate.app`.
- **Rationale**: Kalender ersetzen beim Import einen Eintrag mit bekannter UID. Die Alarme gehören zum Eintrag und
  werden mit ersetzt, nicht addiert. Ein Unit-Test sichert ab, dass die UID gleich bleibt und genau zwei Alarme
  entstehen.

## R6 — Risiko: Google Kalender und importierte Erinnerungen

- **Finding**: Google Kalender übernimmt Erinnerungen (`VALARM`) aus importierten .ics-Dateien möglicherweise nicht
  und setzt stattdessen die Standard-Benachrichtigungen des Kalenders. Apple Kalender und Outlook übernehmen `VALARM`.
  **Ergebnis 2026-11-16:** Google Kalender ✅ übernimmt beide Erinnerungen. Outlook ⚠️ übernimmt nur die erste
  (Vortag 18:00), weil es eine Erinnerung pro Termin kennt. Apple Kalender (iPhone, Import per
  Datei) ❌: Er übernimmt sie nicht und setzt seinen Standard (1 Tag vorher, 9:00). Entscheid: dokumentieren, nicht umgehen.
- **Folge, falls bestätigt**: SC-002 („Google und Apple“) ist für Google aus DueDate heraus nicht erfüllbar. Dann wird
  die Spezifikation angepasst (Google nur mit Hinweis auf dessen Standard-Benachrichtigungen). Ein eigenes
  Kalender-Abo per URL bräuchte einen Server und verstösst gegen Constitution I.

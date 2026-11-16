# Contract: Deadline-Eintrag in `deadlines.ics`

Die exportierte Datei ist eine Schnittstelle zu fremden Kalendern. So sieht ein Deadline-Eintrag nach diesem Feature
aus (Abgabe Fr 20.11.2026). **Neu** sind nur die beiden `VALARM`-Blöcke, alles andere bleibt wie heute (FR-005).

```text
BEGIN:VEVENT
UID:deadline-<task-id>@duedate.app
SUMMARY:📚 <Fach>: <Titel>[ ⭐]
DTSTART;VALUE=DATE:20261120
DURATION:P1DT
...                                  (unverändert: Kategorien, Status, Beschreibung)
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:📚 <Fach>: <Titel>[ ⭐]
TRIGGER:-PT6H                        → Do 19.11. 18:00 lokal
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:📚 <Fach>: <Titel>[ ⭐]
TRIGGER:PT8H                         → Fr 20.11. 08:00 lokal
END:VALARM
END:VEVENT
```

**Garantien**
- Die UID ist pro Aufgabe stabil. Ein erneuter Import ersetzt den Eintrag (FR-004).
- Genau zwei `VALARM` pro `VEVENT` im Deadline-Export.
- Der kombinierte Export „Meine Woche“ enthält **keine** `VALARM`.

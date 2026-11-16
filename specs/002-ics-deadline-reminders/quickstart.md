# Quickstart: Erinnerungen prüfen

## 1. Unit-Tests (ca. 1 Minute)

```bash
npm test
```

Erwartet: alle Tests grün, darunter die neuen Fälle in `src/utils/__tests__/ics.test.js`:
- Deadline mit `withReminders: true` → zwei Alarme mit `-PT6H` und `PT8H`, Beschreibung = Titel
- Deadline ohne Option → keine Alarme (kombinierter Export unverändert)
- Zweimal bauen → gleiche UID, jeweils genau zwei Alarme

## 2. Build (ca. 1 Minute)

```bash
npm run build
```

Erwartet: ohne Fehler.

## 3. Datei erzeugen (ca. 2 Minuten)

1. `npm run dev`, <http://localhost:5173/duedate/> öffnen
2. Deadlines-Seite → eine Aufgabe mit Abgabe in 2–3 Tagen anlegen oder importieren
3. „Kalender exportieren“ → `deadlines.ics` öffnen (Texteditor)

Erwartet: Jeder `VEVENT` hat zwei `VALARM` (siehe `contracts/deadline-event-ics.md`).

## 4. Im Kalender prüfen (ca. 10 Minuten)

| Kalender | Schritt | Erwartet |
|---|---|---|
| Apple Kalender (Mac/iPhone) | Datei öffnen → in einen Test-Kalender importieren → Eintrag öffnen | Erinnerungen: Vortag 18:00, Abgabetag 08:00 |
| Google Kalender (Web) | Einstellungen → Importieren → Test-Kalender → Eintrag öffnen | **Prüfen:** Werden die beiden Erinnerungen übernommen? (Risiko R6) |

Den Export ein zweites Mal importieren → kein doppelter Eintrag, weiterhin zwei Erinnerungen.

## 5. Kombinierter Export unverändert

Kalender → „Meine Woche“ exportieren → die Datei enthält kein `VALARM`.

# User-Tests: Erinnerungen im Deadline-Kalenderexport

**Feature**: [spec.md](spec.md) | **Dauer**: ca. 15 Minuten | **Getestet am**: 2026-11-16 | **Von**: Maintainer

> Manuelle Abnahme aus Sicht des Nutzers. Jeder Test kommt aus einem Akzeptanzszenario der Spezifikation.
> Wenn etwas nicht stimmt: ❌ setzen und in „Notiz“ notieren, was du stattdessen gesehen hast.

## Vorbereitung (einmal)

1. `npm run dev`, dann <http://localhost:5173/duedate/> öffnen
2. Deadlines-Seite → eine Aufgabe mit Abgabe **übermorgen** anlegen (Titel z. B. „Test C6“)
3. In jedem Kalender einen leeren **Test-Kalender** anlegen (damit du danach alles einfach löschen kannst)

## UT-1: Der Kalender erinnert an die Abgabe (Spec: US1, Szenario 1)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | Deadlines → „Kalender exportieren“ | Datei `deadlines.ics` wird heruntergeladen | ✅ | |
| 2 | Datei in **Apple Kalender** importieren, Eintrag „Test C6“ öffnen | 2 Erinnerungen: Vortag 18:00, Abgabetag 08:00 | ❌ | 2026-11-16, iPhone (Import per Datei): Eintrag ok, aber nur „Hinweis: Standard (1 Tag vorher, 9:00)“ = Apple-Standard, nicht unsere Erinnerungen. iCloud Web: kein Import gefunden. |
| 3 | Datei in **Google Kalender** importieren (Einstellungen → Importieren), Eintrag öffnen | 2 Erinnerungen wie oben (Risiko R6: Google übernimmt sie evtl. nicht) | ✅ | 2026-11-16 |
| 4 | Datei in **Outlook** importieren, Eintrag öffnen | 2 Erinnerungen wie oben | ❌ | 2026-11-16: Outlook kennt nur 1 Erinnerung pro Termin; angezeigt „1 Tag vorher“ (weder 18:00 Vortag noch 08:00) |
| 5 | In einem Kalender den Titel der Erinnerung ansehen | enthält „Test C6“ (und das Fach, falls gesetzt) | ✅ | Outlook, 2026-11-16 |

## UT-2: Erneuter Export verdoppelt nichts (Spec: US2, Szenario 1)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | Nochmals „Kalender exportieren“ | neue `deadlines.ics` | ✅ | |
| 2 | In denselben Test-Kalender importieren | „Test C6“ gibt es **einmal**, mit **2** Erinnerungen | ✅ | Outlook: einmal vorhanden (kein Duplikat); Erinnerungen siehe UT-1 Schritt 4 |

## UT-3: „Meine Woche“ bleibt ohne Erinnerungen (Spec: FR-005)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | Kalender-Seite → Export „Meine Woche“ | Datei wird heruntergeladen | | |
| 2 | Datei mit einem Texteditor öffnen, nach `VALARM` suchen | 0 Treffer | | |

## Ergebnis

- [ ] Alle Tests ✅. Feature abgenommen, Roadmap C6 auf ✅.
- [ ] Mindestens ein ❌: Befund an den Agenten geben („UT-1 Schritt 3: erwartet …, gesehen …“).

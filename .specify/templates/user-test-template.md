# User-Tests: [FEATURE NAME]

**Feature**: [link to spec.md] | **Dauer**: ca. [N] Minuten | **Getestet am**: ____ | **Von**: ____

> Manuelle Abnahme aus Sicht des Nutzers. Jeder Test kommt aus einem Akzeptanzszenario der Spezifikation.
> Ein Test = ein Ablauf. Jeden Schritt einzeln ausführen und das Ergebnis abhaken.
> Wenn etwas nicht stimmt: ❌ setzen und in „Notiz“ notieren, was du stattdessen gesehen hast.

## Vorbereitung (einmal)

1. `npm run dev`, dann <http://localhost:5173/duedate/> öffnen
2. [Testdaten anlegen, z. B. „Aufgabe mit Abgabe übermorgen“]

## UT-1: [Titel aus User Story 1] (Spec: US1, Szenario 1)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | [eine Aktion] | [was du siehst] | | |
| 2 | [eine Aktion] | [was du siehst] | | |

## UT-2: [Titel] (Spec: USx, Szenario y)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | | | | |

## Tastatur und Barrierefreiheit (nur bei neuer Oberfläche)

| # | Schritt | Erwartet | ✅/❌ | Notiz |
|---|---|---|---|---|
| 1 | Ablauf nur mit Tab, Enter, Leertaste und Esc durchgehen | alles erreichbar, Fokus immer sichtbar | | |
| 2 | axe DevTools auf der Seite laufen lassen | 0 Verstösse | | |
| 3 | Hell- und Dunkelmodus umschalten | beides lesbar | | |
| 4 | Sprache auf Englisch umstellen | keine deutschen Reste | | |

## Ergebnis

- [ ] Alle Tests ✅. Feature abgenommen, Roadmap auf ✅.
- [ ] Mindestens ein ❌: Befund an den Agenten geben („UT-2 Schritt 3: erwartet …, gesehen …“).

# DueDate Constitution

## Core Principles

### I. Local-first

- Zur Laufzeit gibt es keine Server-Abhängigkeit und keine Netzwerkanfrage an Dritte: kein Backend, keine Anmeldung,
  kein Tracking, kein CDN. Schriften, Icons und Bibliotheken werden mitgeliefert.
- Alle Nutzerdaten liegen ausschliesslich im Browser (`localStorage`).
- Eine Funktion, die Netzwerkzugriff bräuchte, ist ein Bruch dieses Prinzips und braucht eine Änderung der Constitution.

Begründung: Datenschutz und Vertrauen sind der Kern des Produkts. Die App muss offline und auf statischem
Hosting (GitHub Pages) vollständig funktionieren.

### II. Daten gehören dem Nutzer (NICHT VERHANDELBAR)

- Jede Änderung am Datenmodell erhöht `SCHEMA_VERSION` und bringt eine idempotente Migration `upgradeToVn` mit.
  Die Migration läuft beim Laden (`useTasks`) und beim Backup-Import (`utils/backup.js`).
- Jede Migration hat Unit-Tests, auch dafür, dass ein zweiter Lauf nichts ändert und dass Backups älterer
  Schemas importierbar bleiben.
- `docs/BACKUP_FORMAT.md` wird im selben Pull Request nachgeführt.
- Bestehende Daten dürfen nie verloren gehen. Export als JSON (Backup) und ICS (Kalender) bleibt immer möglich.

Begründung: Ohne Backend ist der Browser die einzige Kopie. Ein Fehler in einer Migration ist Datenverlust.

### III. Klare Schichten

- Reine Logik (ohne Vue, ohne DOM, ohne Speicherzugriff) liegt in `src/utils/` und hat Unit-Tests.
- Zustand und Aktionen liegen als Modul-Singletons in `src/composables/` (`useX`); nur sie lesen und schreiben `localStorage`.
- Views und Komponenten enthalten keine Geschäftslogik. Sie rufen Composables auf und stellen dar.
- Neue Logik wird zuerst als testbare Funktion in `src/utils/` geschrieben.

Begründung: Reine Funktionen sind schnell testbar (Vitest in Node) und bleiben für Agenten und Menschen
verständlich.

### IV. Barrierefreiheit (NICHT VERHANDELBAR)

- Jede Funktion ist vollständig per Tastatur bedienbar, und der Fokus ist immer sichtbar.
- Kontraste erfüllen WCAG 2.2 AA im hellen und im dunklen Modus.
- Interaktive Elemente haben korrekte Rollen, Namen und Zustände (ARIA nur, wo natives HTML nicht reicht).
- Ziehen (Drag & Drop) hat immer eine gleichwertige Tastatur-Alternative.
- Eine neue oder geänderte Oberfläche hat in axe keine Verstösse. Massgebend ist `DESIGN.md` §10.

Begründung: Barrierefreiheit ist eine Grundanforderung und nichts, was am Schluss dazukommt.

### V. Zweisprachige Texte

- Jeder sichtbare Text kommt aus den Sprachdateien `src/locales/de.js` und `src/locales/en.js`.
  Beide sind immer vollständig (geprüft durch `locales/__tests__/keys.test.js`).
- Code, Bezeichner und Kommentare sind Englisch.
- Logik vergleicht nie gegen übersetzte Texte, sondern gegen Schlüssel oder Werte.

Begründung: Eine Sprache darf nie hinterherhinken, und die Logik darf nicht von der Sprachwahl abhängen.

### VI. Gestaltung und Tonfall

- Die Oberfläche folgt `DESIGN.md`: Tokens (`--dd-*`) statt fester Farbwerte, heller und dunkler Modus gleichwertig,
  Bereichsfarben, ein Icon-Gewicht, UI-Bausteine aus `src/components/ui/`.
- Texte sind unterstützend und sachlich: keine Vorwürfe, keine Schuldzuweisung bei überfälligen Aufgaben.

Begründung: Ein einheitliches Bild senkt die Reibung. Ein freundlicher Ton hilft gegen Vermeidung.

### VII. Gegen Prokrastination

- Jede Ansicht zeigt eine klare nächste Aktion.
- Eine Aufgabe ist in unter 5 Sekunden erfasst (Taste `N`, Schnellsyntax). Eine Funktion darf diesen Weg
  nicht verlängern.
- Bei Abwägungen gewinnt weniger Reibung vor mehr Optionen.

Begründung: Das ist der Zweck der App. Eine Funktion, die mehr Aufwand erzeugt, als sie spart, schadet.

### VIII. Sparsame Abhängigkeiten

- Eine neue Laufzeit- oder Entwicklungsabhängigkeit braucht im Plan eine Begründung: wofür, warum nicht selbst
  gebaut, Grösse, Lizenz, Wartung.
- Schwere Bibliotheken, die nur selten gebraucht werden, werden dynamisch geladen (wie `ics`).

Begründung: Jede Abhängigkeit vergrössert den Download und die Angriffsfläche und erhöht den Wartungsaufwand.

### IX. Kleine Schritte

- Ein Roadmap-Schritt entspricht einer Spezifikation, einem Branch und einem Pull Request.
- Vor dem Merge sind `npm test` und `npm run build` grün und der Status in `ROADMAP.md` ist nachgeführt.
- Commits folgen den Präfixen `feat:`, `fix:`, `refactor:`, `chore:`, `test:` und `docs:`.

Begründung: Kleine Schritte bleiben prüfbar und lassen sich zurücknehmen. So bleibt ein Agent auf Kurs.

### X. KI zuletzt

- KI-Funktionen kommen erst, wenn die betroffene Funktion ohne KI vollständig funktioniert.
- Jede KI-Funktion hat einen Rückfall ohne KI, ist optional und abschaltbar und muss Prinzip I beachten
  (keine stillen Anfragen an Dritte).

Begründung: Die Kernfunktionen müssen für alle Nutzer ohne Konto, Kosten und Datenabfluss funktionieren.

## Technische Rahmenbedingungen

- Stack: Vue 3 (Composition API, `<script setup>`, reines JavaScript, kein TypeScript), Vite, Tailwind CSS 4,
  vue-router im Hash-Modus, Vitest. Ein Wechsel braucht eine Änderung der Constitution.
- Hosting: statisch auf GitHub Pages (`base: '/duedate/'`), Auslieferung über GitHub Actions.
- Plattform: Desktop zuerst. Mobile kommt als eigener Block (Phase E). Kein Sync, kein Backend.
- Öffentliches Repo: Spezifikationen, Pläne, Constitution und Commits enthalten keine persönlichen Angaben.

## Arbeitsablauf und Qualitätsschranken

- Features aus der Roadmap durchlaufen Spec Kit: `specify` → `clarify` → **Freigabe der Spezifikation** →
  `plan` → `tasks` → `analyze` → **Freigabe der Aufgaben** → `implement` → `converge`.
- Kleine Korrekturen (Text, Farbe, Tippfehler) brauchen keine Spezifikation.
- Die Spezifikation beschreibt Nutzen, Verhalten und Akzeptanzkriterien ohne Technik. Technik gehört in den Plan.
- Spezifikationen bleiben als Historie unter `specs/` im Repo. Neue Anforderungen bekommen eine neue Spezifikation.
- Pro Feature arbeitet ein Agent auf einem Branch. Zwei Agenten arbeiten nie an denselben Dateien.
- Jedes Feature hat User-Tests für die manuelle Abnahme: `specs/<feature>/user-tests.md` nach der Vorlage
  `.specify/templates/user-test-template.md`. Jeder Test geht auf ein Akzeptanzszenario zurück, und jeder Schritt
  ist eine einzelne Aktion mit erwartetem Ergebnis. `tasks.md` enthält in der Abschlussphase eine Aufgabe, die
  diese Datei erstellt, und eine, in der der Maintainer sie durchführt.
- Merge-Bedingungen: Tests und Build grün, Bedienung per Tastatur und axe geprüft, Spezifikation erfüllt
  (`converge` meldet „Converged“), User-Tests durchgeführt und alle ✅, Roadmap nachgeführt.

## Governance

- Diese Constitution steht über anderen Arbeitsregeln. Bei einem Widerspruch zum Code gilt der Code, bis die
  Abweichung korrigiert oder die Constitution angepasst ist.
- Jeder Plan prüft die Prinzipien im Abschnitt „Constitution Check“. Eine Abweichung wird dort begründet und
  braucht die Freigabe des Maintainers.
- Änderungen erfolgen per Pull Request mit `/speckit-constitution`. Die Version folgt SemVer:
  MAJOR = Prinzip entfernt oder neu definiert, MINOR = Prinzip oder Abschnitt hinzugefügt,
  PATCH = Präzisierung.
- Laufende Hinweise zur Entwicklung: `docs/ARCHITECTURE.md`, `DESIGN.md`, `ROADMAP.md`.

**Version**: 1.1.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16

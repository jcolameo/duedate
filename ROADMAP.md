# ROADMAP — DueDate

Priorisierte Roadmap in kleinen, einzeln lieferbaren Schritten (je max. ~1 Arbeitstag).
Ein Schritt = ein Commit (`feat:` / `fix:` / `refactor:` / `chore:` / `test:`).
Nach jedem Schritt: `npm run build` + `npm test`, dann diese Datei aktualisieren (Status-Spalte).

## Leitentscheide (Stand Phase 3)

| Thema | Entscheid |
|---|---|
| Plattform | **Desktop zuerst**, alles lokal im Browser. Mobile-Optimierung als eigener Block (Phase E). Kein Sync, kein Backend. |
| KI | **Später.** Zuerst müssen alle Features ohne KI reibungslos funktionieren. |
| Freelance | Kunden, Projekte, Zeiterfassung, **Kalkulation → Offerte**. Keine Rechnungen. |
| MCP | Abwarten. Vorbereitung nur durch ein sauberes, dokumentiertes Datenmodell + JSON-Export. |
| Basis | Bestehendes Vue-Repo. AI-Studio-Version (React) wird **nicht** übernommen, nur einzelne Ideen werden neu gebaut. |
| Daten | `localStorage`, versioniertes Schema mit Migration. Bestehende Daten dürfen nie verloren gehen. |

## 🎯 MVP-Ziel

> **Nach Schritt B7 nutze ich DueDate täglich am Desktop:** eigene Aufgaben in unter 5 Sekunden erfassen,
> abhaken, nach Bereich (Studium / Freelance / Privat) sehen, eine klare „Heute“-Ansicht mit max. 3 Aufgaben,
> BBNet-Import ohne Bugs, Backup als JSON.

## Status-Legende
⬜ offen · 🔄 in Arbeit · ✅ erledigt

---

## Phase A — Fundament (Aufräumen, Tests, Bugs)

| # | Status | Schritt |
|---|---|---|
| A1 | ✅ | `chore:` Aufräumen |
| A2 | ✅ | `test:` Unit-Tests einrichten |
| A3 | ✅ | `fix:` CSV-Import robust machen |
| A4 | ✅ | `fix:` Kalender-Export + Planer korrigieren |
| A5a | ✅ | `feat:` Design-Basis: Tokens + Basis-Komponenten (`#/design`) |
| A5b | ✅ | `refactor:` Bestehende Seiten + Sidebar auf Design-Basis umstellen |
| A6 | ✅ | `feat:` Belegte Zeiten an mehreren Tagen (Quickfix, Ausbau in B8) |

**A1 — Aufräumen**
- Ziel: Unnötige/riskante Teile entfernen.
- Dateien: `package.json` (fremdes, ungenutztes Paket `ic` entfernen), `src/components/HelloWorld.vue`, `src/stories/*` (Demo), `src/assets/hero.png`, `index.html` (`lang="de"`, Titel „DueDate“), `README.md` (aktualisieren).
- Akzeptanz: Build grün, App verhält sich identisch, `npm ls ic` leer.
- Test: Build + manueller Klick durch alle 5 Routen.

**A2 — Unit-Tests einrichten**
- Ziel: Sicherheitsnetz vor dem Umbau. Keine neue Dependency (Vitest ist schon installiert).
- Dateien: `vite.config.js` (zusätzliches Projekt `unit`, Umgebung `node`), `package.json` (`"test"`), `src/utils/__tests__/*.test.js`.
- Akzeptanz: `npm test` läuft ohne Browser; Tests für `dateParser`, `columnDetector`, `scheduler`, `taskId`.
- Test: Absichtlich einen Test brechen → `npm test` schlägt fehl.

**A3 — CSV-Import robust**
- Ziel: Bugs aus dem Phase-1-Audit beheben.
- Dateien: `useCSVImport.js`, `dateParser.js`, `columnDetector.js`, `useColumnMapping.js`, `ColumnMappingConfirm.vue`, `DeadlinesView.vue`.
- Inhalt: Trennzeichen automatisch erkennen (PapaParse); einzelne fehlerhafte Zeilen überspringen statt alles abzubrechen (mit Hinweis „N Zeilen übersprungen“); Datumsformate ISO, `24.04.26`, `24/04/2026`, Monatskürzel; ungültige Daten (31.02.) ablehnen; „nicht zuweisen“ zerstört gespeicherte Zuordnung nicht mehr; Datei-Upload per Tastatur erreichbar; dieselbe Datei erneut wählbar.
- Akzeptanz: Komma-CSV, Semikolon-CSV und BBNet-Export importieren korrekt; Upload nur mit Tastatur möglich.
- Test: Unit-Tests für alle Datumsformate + Detector; manuell mit 3 CSV-Varianten.

**A4 — Kalender-Export + Planer**
- Ziel: Keine Duplikate im Kalender, realistischer Wochenplan.
- Dateien: `useICSExport.js`, `usePlanExport.js`, `useCombinedExport.js` (→ gemeinsames `utils/ics.js`), `scheduler.js`.
- Inhalt: Stabile UIDs (aus Task-ID abgeleitet) → erneuter Import aktualisiert statt dupliziert; Planer beginnt heute ab der aktuellen Uhrzeit; Aufgaben mit Deadline > 14 Tage nicht in diese Woche drücken; 3-fach duplizierter Download-Code zusammengeführt.
- Akzeptanz: Zweimal exportieren + importieren → keine Duplikate (Apple/Google Kalender).
- Test: Unit-Test: gleiche Aufgabe → gleiche UID; Planer-Test mit fixem „jetzt“ = 20:00.

**A5 — Design-Basis**
- Ziel: Wiederverwendbare, zugängliche Bausteine, bevor neue Screens entstehen. Gestaltung nach `DESIGN.md` + Skill `minimalist-ui` (gilt ab hier für jeden neuen Screen und Phase E). Emojis im UI werden durch Icons ersetzt.
- Dateien: `src/style.css` (Design-Tokens als CSS-Variablen), `src/components/ui/` (`BaseButton`, `BaseCard`, `BaseInput`, `BaseDialog`, `AppToast`), bestehende Views schrittweise umstellen.
- Inhalt: Sichtbarer Fokus (`focus-visible`), Emojis `aria-hidden`, `prefers-reduced-motion`, Toast-System für Erfolg/Fehler/Undo. Alle neuen Komponenten responsive gebaut (Grundlage für Phase E).
- Akzeptanz: Ganze App per Tab bedienbar mit sichtbarem Fokus; Kontrast WCAG AA in Dark + Light.
- Test: Storybook-a11y-Addon (bereits installiert) für die Basis-Komponenten.

**A6 — Belegte Zeiten an mehreren Tagen** (Quickfix aus Nutzer-Feedback)
- Ziel: Ein Eintrag gilt für mehrere Wochentage („Arbeit, Mo–Do, 08–17“, „Training, Mo + Mi“).
- Dateien: `useAvailability.js`, neu `utils/availability.js`, `scheduler.js`, `WeekGrid.vue`, `StundenplanView.vue`, Locales.
- Datenmodell: Block `{ day }` → `{ days: [] }`; alte Einträge werden beim Laden migriert (ein Tag → Liste mit einem Tag).
- Akzeptanz: Tage per Toggle wählen; Anzeige „Mo–Do“ bzw. „Mo, Mi“; Planer und Wochenraster berücksichtigen alle Tage; „Bis“ muss nach „Von“ liegen.
- Test: Unit für Migration, Tagesformat und Planer mit Mehrtages-Block.

---

## Phase B — Aufgaben-Kern (→ MVP)

| # | Status | Schritt |
|---|---|---|
| B1 | ✅ | `feat:` Aufgaben-Store + Datenmigration |
| B2 | ✅ | `feat:` Erledigt-Status mit Rückgängig |
| B3 | ✅ | `feat:` Bereiche Studium / Freelance / Privat |
| B4 | ✅ | `feat:` Schnellerfassung (< 5 s) |
| B5 | ⬜ | `feat:` Aufgabe bearbeiten (Detail-Panel) |
| B6 | ⬜ | `feat:` Heute-Ansicht |
| B7 | ⬜ | `feat:` JSON-Backup (Export/Import) |
| B8 | ⬜ | `feat:` Planer v2 — Gesamtaufwand in Stunden, Aufteilung über Tage und Wochen, Puffer |
| B9 | ⬜ | `feat:` Kalender: Wochen blättern + Monatsansicht |
| B10 | ⬜ | `feat:` Jahresübersicht + Aufräumen vergangener Einträge |

**B1 — Aufgaben-Store + Migration** ⚠️ wichtigster technischer Schritt
- Ziel: Aufgaben sind eigene Objekte statt CSV-Zeilen. Grundlage für alles Weitere.
- Dateien: neu `composables/useTasks.js`, `utils/migrations.js`; angepasst `useCSVImport.js`, `useTaskEnrichment.js`, `useTaskPlanning.js`, alle Views.
- Modell (Entwurf): `Task { id, title, area, status, due, priority, effort, notes, steps[], source: 'manual'|'csv', sourceKey, createdAt, completedAt }`. Schema-Version in `duedate.schemaVersion`.
- Migration: CSV-Zeilen (`duedate.tasks.v1`) + Planungsdaten (`duedate.taskPlanning.v1`) → Tasks. Erneuter CSV-Import aktualisiert bestehende Aufgaben (über `sourceKey`) statt Duplikate. Alte Keys bleiben bis zum nächsten Release als Fallback.
- Akzeptanz: Mit bestehenden Daten im Browser starten → alle Aufgaben, Aufwand, Prioritäten sind noch da. Doppelte Titel+Deadline kollidieren nicht mehr.
- Test: Unit-Tests für Migration (leer, nur CSV, CSV+Planung, kaputtes JSON) und Re-Import.

**B2 — Erledigt-Status**
- Ziel: Aufgaben abhaken; erledigte verschwinden aus Fokus, Plan und Export.
- Dateien: `useTasks.js`, `DeadlinesView.vue`, `HomeView.vue`, `scheduler.js`, `AppToast`.
- Akzeptanz: Checkbox abhaken → Toast „Erledigt · Rückgängig“ (5 s); Filter „Erledigte anzeigen“; dezente Mikrointeraktion.
- Test: Unit: Scheduler ignoriert `done`; manuell: abhaken, rückgängig, Reload.

**B3 — Bereiche**
- Ziel: Studium / Freelance / Privat mit Farbe und Filter. CSV-Import → automatisch „Studium“.
- Dateien: `useTasks.js`, Locale-Dateien, Views, Tokens in `style.css`.
- Akzeptanz: Jede Aufgabe hat Bereich + Farbe (nicht nur Farbe, auch Label/Icon für Farbenblinde); Filter auf allen Listen.
- Test: Manuell; Kontrastprüfung der Bereichsfarben.
- Umgesetzt: Bereich-Tag mit Icon in Tabelle (direkt änderbar, mit Rückgängig) und Überblick; Filter mit Zählern auf Überblick und Deadlines, gemeinsam und gespeichert. Bereich überlebt CSV-Re-Import.

**B4 — Schnellerfassung**
- Ziel: Aufgabe in unter 5 Sekunden, von überall.
- Dateien: neu `components/QuickAdd.vue`, `utils/quickAddParser.js`, `App.vue` (Tastenkürzel `N`).
- Syntax: `Portfolio abgeben fr #studium !` → Titel, Datum (heute/morgen/Wochentag/`24.4.`), Bereich (`#studium #freelance #privat`), Priorität (`!`). Live-Vorschau der erkannten Teile.
- Akzeptanz: `N` → tippen → Enter → Aufgabe gespeichert, Fokus zurück; funktioniert ohne Maus.
- Test: Unit-Tests für den Parser (≥ 15 Fälle); Stoppuhr-Test < 5 s.
- Umgesetzt: Dialog „Neue Aufgabe“ (N, Sidebar-Knopf, leerer Überblick), Live-Vorschau, Enter speichert, Shift+Enter speichert und bleibt offen, Rückgängig im Toast. Ohne #tag → aktueller Bereichsfilter, sonst Studium. Bereich, Datum und „Wichtig“ zusätzlich klickbar (zuletzt Geändertes gilt); Parser versteht auch `15.12`, `15/12`, `15. Dezember`. Kurze Wochentage (fr, mo …) nur als letztes Wort oder nach „bis/am“, damit „So geht das“ ein Titel bleibt. 48 Parser-Tests.

**B5 — Aufgabe bearbeiten**
- Ziel: Titel, Datum, Bereich, Priorität, Aufwand, Notizen ändern; löschen mit Rückgängig.
- Dateien: neu `components/TaskDetail.vue` (Seitenpanel), `useTasks.js`.
- Akzeptanz: Klick/Enter auf Aufgabe öffnet Panel; `Esc` schliesst; Fokus wird korrekt zurückgegeben.
- Test: Manuell inkl. Tastatur + Screenreader (VoiceOver).

**B6 — Heute-Ansicht**
- Ziel: Die Startseite beantwortet nur: „Was mache ich jetzt?“
- Dateien: `HomeView.vue`, neu `utils/todaySuggestion.js`.
- Inhalt: Max. 3 Aufgaben für heute (selbst gewählt oder Vorschlag: überfällig → dringend → Priorität); grosse „Nächste Aktion“-Karte; kurzes Morgen-Ritual beim ersten Öffnen am Tag („Was sind heute deine 3?“); Empty State „Alles erledigt 🎉“ ohne Druck.
- Akzeptanz: Kein Scrollen nötig; erledigte Heute-Aufgaben zeigen Fortschritt (z. B. 2/3).
- Test: Unit-Test für Vorschlagslogik; manuell über 2 Tage (Tageswechsel).

**B7 — JSON-Backup**
- Ziel: Daten gehören dir. Grundlage für spätere MCP-Variante A.
- Dateien: `SettingsView.vue`, neu `utils/backup.js`.
- Akzeptanz: Export aller Daten als `duedate-backup-JJJJ-MM-TT.json`; Import prüft Schema/Version, zeigt Vorschau („42 Aufgaben, 3 Kunden …“), ersetzt erst nach Bestätigung; „Alle Daten löschen“ mit Bestätigung.
- Test: Unit: Export → Import ergibt identischen Zustand; kaputte Datei → verständliche Fehlermeldung.

**B8 — Planer v2** (aus Nutzer-Feedback; baut auf A6 auf, braucht B1/B2)
- Ziel: Kein Abgabestress mehr. Grosse Aufgaben werden früh und verteilt eingeplant statt als ein Block am letzten Tag.
- Aufwand als **Gesamtstunden** pro Aufgabe (Schnellwahl 2/4/8/16 h + freie Eingabe) statt 30m/1h/2h/3h+; Migration der alten Werte.
- Regeln (deterministisch, ohne KI): Puffer = fertig 1 Tag vor Abgabe (einstellbar) · Sessions max. 90 min · max. ~3 h pro Aufgabe und Tag · gleichmässig auf freie Tage bis zum Ziel verteilen · Dringendes zuerst · rollend: Woche zeigt ihren Anteil, Erledigtes/gearbeitete Zeit wird abgezogen · ehrliche Meldung, wenn die Zeit nicht reicht („Für X fehlen 4 h vor dem 10.12.“).
- Planungshorizont über die aktuelle Woche hinaus (ersetzt die 14-Tage-Grenze aus A4); Woche blättern und Monat/Jahr folgen in B9/B10.
- Akzeptanz: Aufgabe 12 h, Abgabe in 4 Wochen → mehrere Sessions verteilt über die Wochen, letzte Session ≥ 1 Tag vor Abgabe.
- Test: Unit-Tests für Aufteilung, Puffer, Überbuchung, Rundung; Vergleich mehrerer Wochen.
- Optional B8b: Planer-Einstellungen (Arbeitszeitfenster, Puffer-Tage, max. Stunden pro Tag).

**B9 — Kalender: Wochen blättern + Monatsansicht** (aus Nutzer-Feedback)
- Ziel: Nicht nur die aktuelle Woche, sondern ein richtiger Kalender mit Überblick.
- Woche: vor/zurück blättern, „Heute“-Knopf, Tastatur (← → T). Ersetzt „Woche blättern“ aus C6.
- Monat: Raster Mo–So mit Deadlines (rot), geplanten Sessions (blau, als Anzahl/Stunden pro Tag) und belegten Zeiten; Klick auf einen Tag öffnet die Woche.
- Voraussetzung: Planer v2 (B8) rechnet über mehrere Wochen; der Plan wird dafür gespeichert oder pro Woche deterministisch berechnet.
- Dateien: `MyWeekView.vue` → Kalender-Ansicht mit Umschalter Woche/Monat, neu `MonthGrid.vue`, `utils/calendar.js` (Monatsraster, KW).
- Akzeptanz: Beliebige Woche/Monat erreichbar; Deadlines und Sessions stimmen mit dem Planer überein; Monatswechsel inkl. Jahreswechsel korrekt.
- Test: Unit für Monatsraster (Monatsanfang/-ende, Schaltjahr, KW 53); Browser-Test Navigation per Tastatur.

**B10 — Jahresübersicht + Aufräumen**
- Jahr: 12 Mini-Monate, Tage mit Deadlines markiert (Dichte = wie viel ansteht), Klick öffnet den Monat. Gut für Semesterplanung und Freelance-Auslastung.
- Aufräumen: Vergangenes wird standardmässig ausgeblendet (nicht gelöscht). In den Einstellungen: „Erledigte Einträge älter als X Monate löschen“ mit Vorschau und Bestätigung; vorher JSON-Backup anbieten (B7).
- Begründung „ausblenden statt sofort löschen“: Die Historie wird für C2b (Schätzung lernt aus erfasster Zeit) gebraucht.
- Test: Unit für Aufräum-Regel (nur erledigt + älter als X); Browser-Test Jahresansicht.

### ✅ MVP erreicht nach B7 (B8–B10 direkt danach)

---

## Phase C — Gegen Prokrastination

| # | Status | Schritt |
|---|---|---|
| C1 | ⬜ | `feat:` Mikroschritte |
| C2 | ⬜ | `feat:` Fokus-Timer |
| C2b | ⬜ | `feat:` Aufwandsschätzung lernt aus erfasster Zeit |
| C3 | ⬜ | `feat:` Wiedervorlage („wieder zeigen am“) |
| C4 | ⬜ | `feat:` Wiederkehrende Aufgaben (Training) |
| C5 | ⬜ | `feat:` Wochenrückblick |
| C6 | ⬜ | `feat:` Erinnerungen via Kalender |

**C1 — Mikroschritte**: Checkliste pro Aufgabe (manuell, 10–20-Min.-Schritte); Heute-Ansicht zeigt nur den *nächsten* Schritt. Dateien: `TaskDetail.vue`, `useTasks.js`, `HomeView.vue`. Akzeptanz: Schritte hinzufügen/abhaken/sortieren per Tastatur. Test: Unit für Fortschritt; manuell.

**C2b — Schätzung lernt mit** (ohne KI): Vergleich Schätzung vs. erfasste Zeit pro Bereich/Fach → Vorschlag „Du brauchst im Schnitt 1.6× so lange wie geschätzt: 19 h statt 12 h?“. Nur Vorschlag, nie automatisch überschreiben. Braucht C2 (und später D3).

**C2 — Fokus-Timer**: 25/5 (einstellbar), an eine Aufgabe gekoppelt, zeitstempelbasiert (läuft korrekt im Hintergrund-Tab und übersteht Reload), Restzeit im Tab-Titel, Fokusminuten pro Aufgabe gespeichert. Dateien: neu `composables/useFocusTimer.js`, `components/FocusTimer.vue`. Akzeptanz: Timer starten → Tab wechseln 10 Min. → Zeit stimmt. Test: Unit mit gefälschter Uhr.

**C3 — Wiedervorlage**: Feld „wieder zeigen am“ → Aufgabe verschwindet bis zum Datum, erscheint dann oben. Für Follow-ups (Bewerbungen, Offerten). Dateien: `useTasks.js`, `TaskDetail.vue`, Listen-Filter. Akzeptanz: Schnellwahl „morgen / in 3 Tagen / nächste Woche“. Test: Unit mit fixem Datum.

**C4 — Wiederkehrende Aufgaben**: Regel „wöchentlich an Mo/Mi/Fr“ oder „monatlich am X.“; beim Abhaken entsteht die nächste Instanz. Deckt Training und Routinen ab, ohne eigenes Habit-Modul. Dateien: `useTasks.js`, neu `utils/recurrence.js`. Akzeptanz: Abhaken → nächster Termin korrekt (inkl. Monatsende, Jahreswechsel). Test: Unit-Tests für Wiederholungsregeln.

**C5 — Wochenrückblick**: Geführter 5-Min.-Dialog (Sonntag/Montag angeboten): erledigt diese Woche, liegengeblieben (verschieben / löschen / zerlegen), Top 3 nächste Woche. Unterstützende Sprache, keine Vorwürfe. Dateien: neu `views/ReviewView.vue`. Akzeptanz: Durchlauf in < 5 Min. möglich. Test: manuell mit Testdaten.

**C6 — Erinnerungen**: ICS-Export mit Erinnerungseinträgen (z. B. 1 Tag + 2 h vorher) → dein Kalender erinnert zuverlässig, ohne Server; Export pro Aufgabe. (Woche blättern ist nach B9 verschoben.) Dateien: `utils/ics.js`, `MyWeekView.vue`, `scheduler.js`. Akzeptanz: Erinnerung erscheint in Apple/Google Kalender. Test: Unit für ICS-Inhalt; manuell im Kalender.

---

## Phase D — Freelance

| # | Status | Schritt |
|---|---|---|
| D1 | ⬜ | `feat:` Kunden |
| D2 | ⬜ | `feat:` Projekte |
| D3 | ⬜ | `feat:` Zeiterfassung |
| D4 | ⬜ | `feat:` Kalkulation (Zeitaufwand → Preis) |
| D5 | ⬜ | `feat:` Offerte generieren (PDF über Browser-Druck) |
| D6 | ⬜ | `feat:` Offerten-Status + automatisches Follow-up |

**D1 — Kunden**: Name, Firma, Kontakt, Standard-Stundensatz, Währung (CHF). Route `/freelance`. Dateien: neu `composables/useClients.js`, `views/FreelanceView.vue`, Sidebar. Akzeptanz: Anlegen/Bearbeiten/Löschen (mit Rückgängig); Empty State mit klarer Aktion. Test: Unit für Store + Migration.

**D2 — Projekte**: Kunde, Titel, Deadline, Status (Anfrage → Offerte → Aktiv → Abgeschlossen), verknüpfte Aufgaben (Bereich Freelance). Dateien: neu `useProjects.js`, `FreelanceView.vue`, `TaskDetail.vue`. Akzeptanz: Projekt-Deadline erscheint in Deadlines/Heute/ICS. Test: Unit; manuell.

**D3 — Zeiterfassung**: Start/Stopp pro Projekt (zeitstempelbasiert, übersteht Seitenwechsel und Reload), manuelle Einträge, Summen pro Projekt/Woche, CSV-Export. Dateien: neu `useTimeEntries.js`, `components/TimeTracker.vue` (global sichtbar, wenn aktiv). Akzeptanz: Timer läuft beim Wechsel der Ansicht weiter; nur ein aktiver Timer. Test: Unit mit gefälschter Uhr; Rundung auf 5/15 Min. einstellbar.

**D4 — Kalkulation**: Positionen (Beschreibung, geschätzte Stunden, Satz), Risiko-Puffer in %, Zwischensumme, optional MWST (**standardmässig aus**), Total. Vergleich Soll (Kalkulation) vs. Ist (Zeiterfassung) pro Projekt. Dateien: neu `utils/calculation.js`, `components/CalculationEditor.vue`. Akzeptanz: Rappen-genaue Rundung (5 Rp.); Änderungen sofort sichtbar. Test: Unit-Tests für alle Rechenregeln.

**D5 — Offerte generieren**: Aus der Kalkulation eine druckfertige Offerte (Absender, Kunde, Offertnummer, Datum, Gültigkeit, Positionen, Total, Bedingungen) → „Als PDF speichern“ über den Browser-Druckdialog. **Keine neue Dependency.** Absenderdaten werden lokal in den Einstellungen gepflegt — nie im Code. Fortlaufende, kollisionsfreie Offertnummern. Dateien: neu `views/OfferPrintView.vue`, Print-CSS, `SettingsView.vue`. Akzeptanz: PDF sieht professionell aus (A4, Ränder, Seitenumbruch). Test: Druckvorschau in Chrome + Safari.

**D6 — Offerten-Status + Follow-up**: Entwurf → Gesendet → Angenommen/Abgelehnt; beim Senden automatisch Wiedervorlage „Nachfassen“ nach X Tagen (C3). Angenommen → Projekt wird „Aktiv“. Akzeptanz: Follow-up erscheint in Heute. Test: manuell.

---

## Phase E — Mobile-Optimierung (Refactoring)

| # | Status | Schritt |
|---|---|---|
| E1 | ⬜ | `refactor:` Responsive App-Shell (Sidebar → Drawer/Bottom-Navigation) |
| E2 | ⬜ | `refactor:` Listen & Tabellen mobil (Karten statt Tabellen, 44-px-Touchziele) |
| E3 | ⬜ | `feat:` PWA (installierbar, offline) |
| E4 | ⬜ | `test:` Accessibility- und Mobile-Audit |

**E1**: Unter 768 px Sidebar als Drawer oder Bottom-Navigation; Schnellerfassung als schwebender „+“-Button. Dateien: `App.vue`, `AppSidebar.vue`, neu `MobileNav.vue`. Akzeptanz: Keine horizontale Scrollleiste bei 375 px Breite.
**E2**: Deadline-Tabelle → Karten auf Mobile; Wochenraster → Tagesansicht mit Wischen. Akzeptanz: Alle Kernaktionen mit dem Daumen erreichbar.
**E3**: `vite-plugin-pwa` (**neue Dev-Dependency**, Begründung: Installierbarkeit + Offline-Cache, sonst sehr viel Eigenbau). Manifest, Icons, Offline-Fallback; Base-Pfad `/duedate/` beachten. Akzeptanz: Auf iPhone/Android „Zum Home-Bildschirm“ → startet offline.
**E4**: Playwright-Durchlauf (bereits installiert) mit iPhone-Viewport + Accessibility-Check (Kontrast, Fokus, ARIA). Akzeptanz: Keine kritischen Befunde.

---

## Phase F — Persönlich / Job

| # | Status | Schritt |
|---|---|---|
| F1 | ⬜ | `feat:` Bewerbungs-Tracker |
| F2 | ⬜ | `feat:` Monatsexport der Bewerbungen (CSV) |

**F1**: Firma, Stelle, Link, Datum, Status (geplant → beworben → Gespräch → Zusage/Absage), automatische Wiedervorlage zum Nachfassen. Daten bleiben lokal. **F2**: Export aller Bewerbungen eines Monats als CSV für Nachweise.

---

## Später (bewusst nicht terminiert)

| Idee | Voraussetzung / Bemerkung |
|---|---|
| KI: Aufwand schätzen | Aus Beschreibung/PDF einer Aufgabe; erst nach C2b sinnvoll (eigene Daten zuerst) |
| KI: Aufgaben zerlegen | Kleiner Server für den API-Key (z. B. Cloudflare Worker) mit Zugangsschutz; Fallback = manuelle Mikroschritte (C1) |
| KI: Kunden-Briefing → Scope, Rückfragen, Kalkulationsentwurf | Wie oben; Ergebnis landet in Kalkulation (D4) |
| MCP: Claude verbinden | Variante A (JSON-Backup) ab B7 nutzbar. Lokaler MCP-Server (Mac) oder Remote-MCP erst nach Entscheid über Sync |
| Sync Desktop ↔ Mobile | Nur falls Mobile-Nutzung täglich wird; braucht Backend + Login |
| Rechnungen inkl. QR-Rechnung | Erst wenn regelmässig Aufträge laufen |
| Streak (ohne Strafe), Hintergrundgeräusche | Nice-to-have |
| Ausbau Wochenplan-Generator | Eingefroren, bis Nutzung im Alltag belegt ist |

## Bewusst verworfen
Notion-artiger Block-Editor · Kanban-Board · Karteikarten/Quiz · XP/Level/Badges · KI-Priorisierung ·
„Cloud Vault“ ohne Login · Beispieldaten beim ersten Start.

---

## Changelog
- 2026-11 — Roadmap erstellt (Phasen 1–4 der Planung abgeschlossen).

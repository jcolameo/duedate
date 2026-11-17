# Sicherheit

DueDate ist eine lokale App: alle Daten liegen im `localStorage` des Browsers, es gibt
kein Backend, keine Anmeldung und keine Netzwerkanfrage zur Laufzeit. Trotzdem ist
Sicherheit ein Thema, weil die App fremde Daten verarbeitet — CSV-Importe von
Schulplattformen, Backup-Dateien, Kalender-Exporte.

## Eine Schwachstelle melden

Bitte **nicht** als öffentliches Issue. Nutze einen der beiden Wege:

1. GitHub → *Security* → *Report a vulnerability* (Private Vulnerability Reporting).
2. Falls das nicht verfügbar ist: eine E-Mail an den Maintainer, Adresse im
   GitHub-Profil von [@jcolameo](https://github.com/jcolameo).

Hilfreich sind: betroffene Version, Browser, eine kurze Beschreibung und — wenn möglich —
eine Datei oder Eingabe, die das Verhalten auslöst. Bitte keine echten persönlichen Daten
mitschicken; ein minimales Beispiel genügt.

## Was du erwarten kannst

| Schritt | Frist |
|---|---|
| Eingang bestätigt | 3 Werktage |
| Erste Einschätzung (Schwere, Ausnutzbarkeit) | 10 Werktage |
| Behebung oder Zwischenstand | 30 Tage, bei kritischen Funden schneller |

Da dies ein Ein-Personen-Projekt ist, sind das Zielwerte und keine Vertragsfristen. Wenn
eine Frist nicht hält, melde ich mich vorher mit einem neuen Datum.

## Offenlegung

Behoben wird zuerst, veröffentlicht danach. Ein Fix geht zusammen mit seinem
Regressionstest in denselben Commit, damit kein öffentlicher Stand eine offene Lücke
beschreibt, ohne die Behebung daneben zu zeigen. Auf Wunsch nenne ich Melder im
Commit oder im Release — oder halte sie anonym, wie gewünscht.

## Unterstützte Versionen

DueDate wird als statische Seite ausgeliefert; es gibt keine installierten Versionen.
Sicherheitsfixes erscheinen im jeweils aktuellen Stand auf `main` und auf der
veröffentlichten Seite. Ältere Stände werden nicht separat gepflegt.

## Was hier nicht greift

Weil es kein Backend und keine Konten gibt, sind klassische serverseitige Angriffe
(Identitätsdiebstahl, Rechteausweitung, Mandantentrennung) derzeit nicht anwendbar. Die
relevanten Flächen sind:

- **Markdown-Rendering** (`src/utils/markdown.js`) — Ausgabe geht in `v-html`.
- **CSV- und Backup-Import** (`src/utils/backup.js`, `src/utils/csv.js`) — Dateien von aussen.
- **ICS-Export** (`src/utils/ics.js`) — Text aus Aufgaben landet in einer Datei.
- **Abhängigkeiten** — siehe `npm audit`, Dependabot ist aktiv.

Diese Flächen sind durch Tests in `src/utils/__tests__/security.*.test.js` abgedeckt.

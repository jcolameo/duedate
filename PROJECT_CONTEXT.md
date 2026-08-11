# PROJECT_CONTEXT.md — DueDate

## 1. Purpose of this file

This file is the source of truth for Claude Code when working in this repository.

Before changing code:

1. Read this entire file.
2. Inspect the existing codebase and current Git state.
3. Preserve working functionality.
4. Make the smallest safe change that serves the currently approved phase.
5. Do not build future modules merely because they exist in the long-term vision.

---

## 2. Product in one sentence

**DueDate** is a local-first, ADHD-first personal operating system that turns messy inputs and obligations into a calm, prioritized plan with one clear next action.

**Deadlines** is the first working module: it converts school-task CSV exports into structured tasks and `.ics` calendar events without manual calendar entry.

---

## 3. Founder and primary use case

The first user is an Interaction Design student in Switzerland who wants a system that reduces administrative friction across:

- studies, assignments and project deadlines;
- personal projects and creative work;
- freelancing and future client acquisition;
- job applications and RAV administration;
- personal routines, hobbies, training and recovery.

The product must work exceptionally well for the founder’s real life before it is expanded or monetized. It must not become a generic task manager, a Notion clone, or an enterprise dashboard.

---

## 4. Product vision

DueDate is an **external brain**, not just a database of tasks.

It should help the user:

- capture information before it gets forgotten;
- extract tasks, context and deadlines from chaotic inputs;
- reduce decision fatigue and time blindness;
- decide what matters now;
- break large work into small startable actions;
- create realistic weekly work plans;
- protect health, hobbies and recovery without letting them override critical obligations;
- build momentum with supportive, non-shaming gamification.

The desired feeling is:

> “My life is becoming clearer and I know what to do next.”

Not:

> “Here is another overwhelming productivity system to maintain.”

---

## 5. Non-negotiable product principles

### ADHD-first

- Minimize cognitive load, setup and choices.
- Surface one clear next action instead of a wall of equally important tasks.
- Prefer automation followed by a quick review.
- Make actions easy to start in 10–15-minute chunks where appropriate.
- Use supportive language. Never shame the user for missed tasks or broken streaks.

### Local-first and privacy-first

- Process and store data locally by default whenever feasible.
- Do not introduce a backend, authentication, cloud sync, analytics or data collection without explicit approval.
- Do not expose API keys in browser code.
- Any future cloud or AI processing must be transparent and opt-in for sensitive data.

### Capture first, organise second

- Getting information into the system must be fast.
- The system should do as much parsing, categorising and prioritising as possible.
- The user should review and correct rather than manually structure everything.

### Build for one, design for many

- Optimise first for the founder’s actual workflow.
- Do not hard-code personal names, locations, school platforms or a single CSV schema.
- Keep modules extensible, but do not prematurely build SaaS infrastructure.

### Modular, but not fragmented

- Each module must provide value on its own.
- Modules should share a future unified task/project/event model.
- Do not tightly couple modules before the workflow is proven.

### No feature creep

- Finish, test and commit one valuable workflow at a time.
- The current real product is more important than an impressive roadmap.

---

## 6. Current working module: Deadlines

### What it does now

DueDate is a browser-based Vue application. Its Deadlines module currently:

1. Imports a CSV by click-upload or drag-and-drop.
2. Parses it locally in the browser.
3. Detects likely meanings of CSV columns.
4. Lets the user review and correct the column mapping.
5. Normalises rows into internal task fields.
6. Calculates deadline status and days remaining.
7. Sorts and displays tasks in a table.
8. Exports valid deadlines as an `.ics` calendar file.
9. Stores column-mapping preferences in `localStorage`.
10. Allows a wrong saved mapping to be reset through **“⚙️ Mapping ändern”**.

No CSV data should be uploaded to a server in the current version.

### Current expected user flow

1. Student exports a task list from BBNet or another school platform as CSV.
2. Student drops the file into Deadlines.
3. Deadlines proposes field mappings.
4. Student confirms or corrects mappings.
5. Student reviews sorted deadlines and urgency.
6. Student clicks calendar export.
7. Browser downloads `deadlines.ics`.
8. Student opens/imports the `.ics` file in their calendar.

### Typical BBNet CSV fields

A real BBNet CSV may include:

- `Fach`
- `Titel`
- `Beschreibung`
- `Start`
- `Abgabe`
- `Datei(en) zur Aufgabe`
- `Benotet?`

Typical properties:

- semicolon-delimited CSV;
- quoted values;
- German dates such as `24. April 2026`.

The app must support other schemas too. An alternative test CSV used fields such as `Spezies`, `Mission`, `Startdatum`, `Deadline` and `Bewertet?`.

### Current urgency logic

- no valid deadline → `?`
- deadline in the past → `OVERDUE`
- fewer than 3 days remaining → `URGENT`
- fewer than 7 days remaining → `SOON`
- 7 or more days remaining → `OK`

### Important dynamic UI rule

The table has stable system fields such as **Status** and **Tage**. Semantic data headers should use the original mapped CSV labels whenever possible, rather than always forcing labels such as `Fach`, `Titel` or `Abgabe`.

---

## 7. Current technology and architecture

### Stack

- Vue 3
- Vite
- Tailwind CSS
- PapaParse for CSV parsing
- `ics` for calendar-file generation
- Storybook is installed for learning and possible isolated component work
- GitHub Pages is used for static deployment

### Current architecture

The project is currently a frontend-only static application. It has no required backend or database.

Important existing responsibilities include:

- `src/App.vue` — app shell: sidebar navigation + router outlet
- `src/router/index.js` — route definitions (hash-based history, for GitHub Pages compatibility)
- `src/components/AppSidebar.vue` — app navigation; Home and Deadlines are live routes, other modules render as "coming soon"
- `src/views/HomeView.vue` — Home placeholder
- `src/views/DeadlinesView.vue` — the Deadlines module: CSV import, mapping, table and ICS export (moved here from the former single-page `App.vue` during the app-shell phase)
- `src/composables/useCSVImport.js` — file selection, drag/drop, parsing and raw CSV state
- `src/composables/useTaskEnrichment.js` — task normalisation, dates, urgency and sorting
- `src/composables/useICSExport.js` — calendar-event creation and `.ics` download
- `src/composables/useColumnMapping.js` — mapping detection/review state and `localStorage` persistence
- `src/utils/columnDetector.js` — alias and value-based field-role detection
- `src/components/ColumnMappingConfirm.vue` — mapping review and confirmation UI

The exact current implementation is the codebase, not this document. Inspect files before assuming details.

---

## 8. Completed work

### Phase 1 — Deadline Engine

- Vue/Vite/Tailwind project setup
- CSV upload via drag-and-drop and file picker
- local CSV parsing
- task table
- German-date parsing
- deadline sorting
- urgency states
- `.ics` calendar export
- Git repository and GitHub Pages deployment setup

### Phase 1.5 — Smart CSV

- column alias detection
- value-based detection heuristics
- manual mapping-confirmation flow
- mapping persistence using `localStorage`
- recovery flow through **“⚙️ Mapping ändern”**
- normalised internal fields for later use
- mapping-driven export
- testing with both BBNet and deliberately different CSV schemas
- Storybook installation for learning

### Phase A — App Shell & Routing

- `vue-router` added (hash history, for GitHub Pages compatibility without a server rewrite)
- app shell (`App.vue`) with sidebar navigation, matching the confirmed target IA nav order
- former single-page app moved unchanged into a `Deadlines` route/module — no logic or behaviour changes
- placeholder `Home` route
- other future modules (Stundenplan, My Week, Projects, Life Planner, Capture, Freelance, Jobs) shown in navigation as visually disabled "coming soon" entries, not yet routed
- product renamed: the umbrella app is **DueDate**; the CSV-import module is **Deadlines** (previously the module itself was informally called "DueDate")
- deployed to GitHub Pages and verified live: deep-linking to `#/deadlines` with a hard refresh, and a full CSV import/mapping/export cycle, both confirmed working on the production URL

### Phase B — Visual System Pass

- restyled the shell and Deadlines screen using the Figma prototype's spacing/color/depth language: base surface deepened (`slate-900` → `slate-950`), cards sit one layer lighter for depth, more generous spacing throughout, status badges are pill-shaped, consistent `rounded-2xl`/`rounded-xl` radius scale
- dark mode only at this point; no logic or markup-structure changes, Tailwind classes only

### Phase C — Theme Toggle & Settings

- Tailwind `light` custom variant added (`@custom-variant light (&:where(.light, .light *));` in `style.css`); default/no-class stays the existing dark palette untouched, `.light` class on `<html>` activates light overrides
- `src/composables/useTheme.js` — theme state (`dark`/`light`), persisted to `localStorage` (`duedate.theme.v1`), same pattern as the existing column-mapping preference
- light-mode classes added across the shell, Deadlines, mapping-confirm panel, and status badges
- sidebar footer now has a live theme-toggle button and a live `Settings` nav entry (previously these were deliberately omitted rather than shipped as non-functional placeholders)
- `src/views/SettingsView.vue` (new) — minimal Settings page, Appearance section only (theme switch), matching the confirmed Phase C scope
- verified live: theme persists across a hard reload, both themes checked against the full CSV import/mapping/export flow

### Known verification item

The deployed GitHub Pages site previously appeared to show an older UI version without the mapping-reset button. Before new feature work, verify:

1. local changes are committed;
2. the intended branch is pushed;
3. the Pages workflow/source is correct;
4. deployment has completed successfully;
5. cache has been bypassed with a hard refresh;
6. the deployed build contains the expected commit.

Do not rewrite Vue logic before checking deployment and Git state.

---

## 9. Target product information architecture

The Figma prototype represents the **long-term design direction**, not a command to build all modules at once.

Expected app-shell navigation:

- Home
- Deadlines
- Stundenplan / Weekly Plan
- My Week
- Projects
- Life Planner
- Capture
- Freelance
- Jobs
- Theme toggle (dark/light)
- Settings

### Design direction

- minimal and Apple-like in hierarchy and spacing;
- Notion-like modularity;
- warm, playful and wellness-inspired, but never childish;
- dark mode and light mode;
- low density, clear grouping and calm surfaces;
- one primary action per screen where possible;
- no generic corporate SaaS aesthetic.

If a Figma prototype link and/or exported screens are supplied, treat them as the visual source of truth. First analyse them and propose implementation phases; do not blindly recreate every future screen.

---

## 10. Future module: Smart Weekly Planner / Stundenplan

This is the natural extension of Deadlines, not an unrelated module.

### Goal

Use imported deadlines, projects, task effort estimates and availability to propose a realistic weekly work plan. The user reviews it and can export the plan as `.ics` events.

### Intended flow

1. Tasks originate from the Deadlines CSV import and, later, projects/capture.
2. User sets or confirms effort estimates, for example `1h`, `2h`, `half day`, `full day`.
3. User marks unavailable blocks and recurring commitments.
4. The planning engine proposes work sessions ahead of deadlines.
5. User reviews, adjusts, locks or regenerates the weekly plan.
6. User exports deadlines and work blocks as an `.ics` calendar file.

### Future persistence direction

Imported tasks and planned work blocks should eventually be saved locally in a structured local data model, rather than being only temporary CSV rows. Do not decide whether this is CSV, IndexedDB, SQLite/Tauri, or another storage layer without an approved implementation plan. For the current static web app, `localStorage` or IndexedDB may be considered only when the scope explicitly calls for persistence beyond mapping preferences.

---

## 11. Priority model for planning

The system must not treat hobbies, study and paid work as equal. It must schedule according to real consequences while still protecting wellbeing.

### Tier 1 — Critical

Examples:

- school deadlines
- graded assignments
- client deliverables
- job-application deadlines

These have real consequences and hard deadlines. They are scheduled first.

### Tier 2 — Important

Examples:

- freelance work without an immediate hard deadline
- personal long-term projects
- job applications without a fixed deadline

These matter for long-term progress and are scheduled after Tier 1 coverage.

### Tier 3 — Hobbies and personal life

Examples:

- gym
- boxing
- YouTube creation
- reading
- language learning
- creative projects
- social time
- recovery

These must not override critical work, but they are not disposable. The system should protect minimum wellbeing blocks and schedule the user’s highest-ranked hobbies first when capacity is limited.

### Within Tier 1 and Tier 2: urgency × importance

The planning system should rank tasks by:

- **Urgency:** overdue, due within 3 days, 7 days, 14 days, or later.
- **Importance:** e.g. graded assignment/client deliverable = high; ungraded preparation = medium; optional reading = low.

The user must be able to override automated rankings. Future UI should make the reasoning understandable, not present an opaque AI score.

### Within Tier 3: user-defined hobby priority

Users can add any hobby or personal activity. They set:

- name, emoji and colour;
- preferred frequency;
- typical duration;
- preferred time of day;
- personal priority order.

When capacity is limited, the planner uses this priority order and explains reductions clearly, for example:

> “This week is heavy. Gym and Boxing are protected; YouTube was moved to Saturday.”

---

## 12. Future module: My Week

**My Week** is the calm command-centre calendar view. It combines:

- hard deadlines;
- suggested study/work blocks;
- recurring availability blocks;
- personal/hobby/recovery blocks;
- daily focus quests.

The user should be able to understand their week quickly and export a combined `.ics` calendar file.

Suggested visual language:

- school/work: green
- personal/fitness: blue or purple
- creative: orange/yellow
- deadlines: red markers
- quests: subtle highlight

---

## 13. Future module: Capture

### Goal

Capture raw input with near-zero friction, then let AI extract structured tasks, deadlines and context.

Potential inputs:

- pasted text
- screenshots
- PDFs
- voice notes
- forwarded messages
- email, later

Desired interaction:

`Capture → AI extraction/classification → short review → task, project, reminder or calendar action`

Long-term capture principles:

- maximum one user action to capture;
- fast confirmation;
- AI does parsing and categorisation;
- show only the necessary next step;
- quiet, non-shaming reminders.

This requires a secure processing architecture and is not current frontend-only scope.

---

## 14. Future modules: Projects and Freelance CRM

### Projects

A project should eventually connect tasks, milestones, notes, files, deadlines and progress. A future PDF-to-project-plan flow may extract deliverables and propose a realistic plan from an assignment brief.

### Freelance CRM

A lightweight personal CRM may manage leads, contacts, clients, outreach, follow-ups, proposals and project work. It must remain personal and simple rather than enterprise-like.

---

## 15. Future module: Jobs AI Agent

The Jobs module is intended to evolve beyond a passive application tracker.

### Intended user experience

The user can provide:

- CV;
- cover-letter / Motivationsschreiben template;
- role preferences;
- relevant skills and keywords;
- location preferences, such as Switzerland: Aargau, Zürich, Bern, Basel, and Remote;
- seniority preferences.

A future AI agent may:

1. Search for suitable job listings online.
2. Rank them with transparent reasons for fit.
3. Let the user save or start an application.
4. Draft/adapt application documents for the specific job.
5. Present a preview with clear changes and editing controls.
6. Require explicit user approval before any submission.
7. Track application status and follow-up dates.

### Important implementation boundary

Internet searching, CV processing, document adaptation, Canva integration, email sending, secure file storage and automatic submission require backend services, secure credentials, permissions and deliberate compliance/privacy decisions.

They must **not** be implemented as fake working functionality or browser-only automation in the current phase. In the current application they may be designed as static UI or local prototype states only when explicitly approved.

No application may be sent without a visible final user confirmation.

---

## 16. Gamification: supportive, subtle and anti-shame

Gamification is a motivational layer, not the core product.

Potential elements:

- XP for meaningful actions (task completion, importing/exporting, applications, captures);
- gentle daily activity streaks;
- level and progress indicator;
- 1–3 achievable daily focus quests;
- achievement badges;
- satisfying but restrained completion feedback;
- momentum/progress view on Home.

Rules:

- never punish missed days;
- never use childish, noisy or cartoon styling;
- reward progress and consistency, not unrealistic hustle;
- make recovery and wellbeing valid parts of a successful week;
- keep the layer optional/subtle and visually consistent with the app.

---

## 17. Data-model direction (future, not a mandate to build now)

Future modules should converge on a unified local model rather than inventing isolated formats. Likely core entities:

- `CaptureItem`
- `Task`
- `Project`
- `Event` / planned work block
- `Habit` / personal activity
- `Application`
- `Contact` / client or lead
- `Reminder`

Do not invent final database schemas or API fields. Propose and validate a small data model only when a specific approved phase requires it.

---

## 18. Current scope and roadmap

### Immediate priority: stabilise Deadlines

1. Verify GitHub Pages deployment.
2. Test real BBNet exports for at least one week.
3. Record actual pain points and bugs.
4. Improve only validated issues.
5. Keep commits small, focused and descriptive.

Possible validated improvements:

- clearer invalid-date errors;
- reset-all mapping option;
- support for additional date formats;
- mapping-confidence hints;
- responsive/mobile refinements;
- stronger empty states;
- improved import guidance.

### Next likely functional phase

After Deadlines is stable: define a small, local-first planning-data model and build the **Stundenplan** flow incrementally:

1. retain imported tasks locally;
2. add effort estimate and task priority controls;
3. add availability blocks;
4. create a simple deterministic weekly-plan suggestion;
5. preview and export planned blocks as ICS;
6. test using real weeks before adding AI scheduling.

### Later phases

- PDF → project-plan workflow
- capture inbox
- broader unified task/project/event data model
- life planner and My Week
- supportive gamification
- freelance CRM
- Jobs agent, only with appropriate secure architecture

---

## 19. Rules for Claude Code

When working in this repository:

1. Read relevant existing files before changing them.
2. Check `git status` before edits and show the planned files to change.
3. Use the smallest safe change; do not rewrite working code gratuitously.
4. Preserve current Deadlines functionality: CSV import, mapping, enrichment, table and ICS export.
5. Do not introduce a major dependency without explaining why and asking first.
6. Do not invent APIs, storage schemas, credentials or external integrations.
7. Keep user data local by default.
8. For complex changes, first give a short plan and identify assumptions.
9. Test the affected flow after making changes.
10. Make focused commits only after user approval.
11. Distinguish clearly between:
    - functional code that can run locally now;
    - UI prototypes of future features;
    - features requiring backend/AI/cloud infrastructure later.
12. Do not build all Figma screens at once. Establish the reusable app shell and migrate the existing Deadlines module incrementally.

---

## 20. Definition of success

### Deadlines success

Deadlines succeeds when a student can import an unfamiliar school CSV, confirm the field mapping when necessary, see reliable deadlines, export a valid calendar file, and save time compared with manual calendar entry.

### DueDate success

The broader product succeeds when it can turn chaotic input into a realistic, prioritised plan quickly, while giving the user one immediately startable next action and maintaining a feeling of control rather than pressure.

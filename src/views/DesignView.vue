<script setup>
/**
 * Design reference page (#/design): tokens and base components in one place,
 * to review the visual language in both themes. Developer-facing, not part of
 * the product navigation — its sample copy is therefore not translated.
 */
import { ref } from 'vue'
import {
  PhPlus, PhCalendarBlank, PhTrash, PhDotsThree, PhGraduationCap, PhBriefcase, PhHouse,
  PhWarning, PhTray, PhMoon, PhSun, PhClock,
} from '@phosphor-icons/vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseTag from '../components/ui/BaseTag.vue'
import BaseKbd from '../components/ui/BaseKbd.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { useTheme } from '../composables/useTheme.js'
import { useToast } from '../composables/useToast.js'

const { theme, setTheme } = useTheme()
const toast = useToast()

const COLORS = [
  { name: 'canvas', note: 'Hintergrund' },
  { name: 'surface', note: 'Karten, Panels' },
  { name: 'surface-muted', note: 'Hover, Felder' },
  { name: 'line', note: 'Trennlinien' },
  { name: 'line-strong', note: 'Feldränder' },
  { name: 'ink', note: 'Text' },
  { name: 'ink-muted', note: 'Sekundärtext' },
  { name: 'accent', note: 'Primäraktion' },
  { name: 'focus', note: 'Fokusring' },
]

const AREA_OPTIONS = [
  { value: 'study', label: 'Studium' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'personal', label: 'Privat' },
]

const title = ref('')
const area = ref('study')
const dialogOpen = ref(false)

function showUndoToast() {
  toast.show('„Plakat Entwurf“ erledigt', {
    tone: 'success',
    action: { label: 'Rückgängig', onClick: () => toast.show('Wieder offen: „Plakat Entwurf“') },
  })
}

function showErrorToast() {
  toast.show('Die Datei konnte nicht gelesen werden. Ist es eine CSV?', { tone: 'error' })
}
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink">
    <div class="mx-auto max-w-5xl px-6 py-12 sm:px-10">
      <header class="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">DueDate · Design-Basis</p>
          <h1 class="mt-2 font-serif text-4xl leading-[1.1] tracking-[-0.02em]">Gestaltung</h1>
          <p class="mt-2 max-w-xl text-ink-muted">
            Tokens und Bausteine für alle Screens. Regeln und Begründungen stehen in <code class="font-mono text-[13px]">DESIGN.md</code>.
          </p>
        </div>
        <div class="flex gap-1 rounded-lg border border-line bg-surface p-1" role="group" aria-label="Farbschema">
          <BaseButton size="sm" :variant="theme === 'dark' ? 'primary' : 'ghost'" :icon="PhMoon" :aria-pressed="theme === 'dark'" @click="setTheme('dark')">Dunkel</BaseButton>
          <BaseButton size="sm" :variant="theme === 'light' ? 'primary' : 'ghost'" :icon="PhSun" :aria-pressed="theme === 'light'" @click="setTheme('light')">Hell</BaseButton>
        </div>
      </header>

      <!-- Colors -->
      <section class="mt-12" aria-labelledby="s-colors">
        <h2 id="s-colors" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Farben</h2>
        <ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <li v-for="c in COLORS" :key="c.name" class="overflow-hidden rounded-lg border border-line bg-surface">
            <div class="h-14 border-b border-line" :style="{ background: `var(--dd-${c.name})` }"></div>
            <div class="px-3 py-2">
              <p class="font-mono text-[12px] text-ink">{{ c.name }}</p>
              <p class="text-[12px] text-ink-muted">{{ c.note }}</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Meaning -->
      <section class="mt-12" aria-labelledby="s-meaning">
        <h2 id="s-meaning" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Farbe nur mit Bedeutung</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <BaseCard>
            <p class="text-sm font-medium">Bereiche</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseTag tone="blue" :icon="PhGraduationCap">Studium</BaseTag>
              <BaseTag tone="green" :icon="PhBriefcase">Freelance</BaseTag>
              <BaseTag tone="yellow" :icon="PhHouse">Privat</BaseTag>
            </div>
          </BaseCard>
          <BaseCard>
            <p class="text-sm font-medium">Deadline-Status</p>
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <BaseTag tone="red" :icon="PhWarning">Überfällig</BaseTag>
              <span class="font-medium text-red-ink">In 2 Tagen</span>
              <span class="text-ink-muted">In 5 Tagen</span>
              <span class="text-ink-muted">24. Nov.</span>
            </div>
            <p class="mt-3 text-[13px] text-ink-muted">Nur was Aufmerksamkeit braucht, bekommt Farbe.</p>
          </BaseCard>
        </div>
      </section>

      <!-- Typography -->
      <section class="mt-12" aria-labelledby="s-type">
        <h2 id="s-type" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Typografie</h2>
        <BaseCard class="mt-4" padding="lg">
          <p class="font-serif text-4xl leading-[1.1] tracking-[-0.02em]">Was steht heute an?</p>
          <p class="mt-1 text-[12px] text-ink-muted">Serif · nur Seitentitel (H1)</p>
          <p class="mt-6 text-lg font-semibold">Diese Woche</p>
          <p class="text-[12px] text-ink-muted">Sans · Abschnitte</p>
          <p class="mt-4 max-w-prose">
            Drei Aufgaben sind für heute geplant. Fang mit der kleinsten an, die anderen laufen nicht weg.
          </p>
          <p class="mt-1 text-sm text-ink-muted">Sekundärtext für Hinweise und Metadaten.</p>
          <p class="mt-4 font-mono text-sm tabular-nums">24.11.2026 · 2 h 30 min · CHF 1'240.00</p>
          <p class="text-[12px] text-ink-muted">Mono · Daten, Dauer, Beträge</p>
        </BaseCard>
      </section>

      <!-- Buttons -->
      <section class="mt-12" aria-labelledby="s-buttons">
        <h2 id="s-buttons" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Buttons</h2>
        <BaseCard class="mt-4">
          <div class="flex flex-wrap items-center gap-3">
            <BaseButton variant="primary" :icon="PhPlus">Aufgabe erfassen</BaseButton>
            <BaseButton :icon="PhCalendarBlank">In Kalender exportieren</BaseButton>
            <BaseButton variant="ghost">Abbrechen</BaseButton>
            <BaseButton variant="danger" :icon="PhTrash">Löschen</BaseButton>
            <BaseButton variant="ghost" :icon="PhDotsThree" icon-only label="Weitere Aktionen" />
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <BaseButton size="sm" variant="primary">Klein</BaseButton>
            <BaseButton size="sm">Klein, sekundär</BaseButton>
            <BaseButton loading>Speichert …</BaseButton>
            <BaseButton disabled>Deaktiviert</BaseButton>
          </div>
          <p class="mt-4 text-[13px] text-ink-muted">Pro Screen nur eine Primäraktion.</p>
        </BaseCard>
      </section>

      <!-- Fields -->
      <section class="mt-12" aria-labelledby="s-fields">
        <h2 id="s-fields" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Felder</h2>
        <BaseCard class="mt-4">
          <div class="grid gap-5 sm:grid-cols-2">
            <BaseInput v-model="title" label="Titel" placeholder="z. B. Plakat Entwurf abgeben" hint="Kurz und konkret: Was ist der nächste Schritt?" />
            <BaseSelect v-model="area" label="Bereich" :options="AREA_OPTIONS" />
            <BaseInput label="Fällig am" type="date" />
            <BaseInput label="Aufwand" model-value="3 Tage" error="Bitte in Stunden angeben, z. B. 2 h." />
          </div>
        </BaseCard>
      </section>

      <!-- Card example -->
      <section class="mt-12" aria-labelledby="s-cards">
        <h2 id="s-cards" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Karten und Listen</h2>
        <BaseCard class="mt-4" padding="none">
          <ul class="divide-y divide-line">
            <li class="flex items-center gap-4 px-5 py-3">
              <span class="size-4 shrink-0 rounded border border-line-strong" aria-hidden="true"></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">Serie Stadtlicht abgeben</p>
                <p class="text-[13px] text-ink-muted">Fotografie · 12 Bilder digital</p>
              </div>
              <BaseTag tone="red" :icon="PhWarning">Überfällig</BaseTag>
            </li>
            <li class="flex items-center gap-4 px-5 py-3">
              <span class="size-4 shrink-0 rounded border border-line-strong" aria-hidden="true"></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">Offerte Website-Relaunch senden</p>
                <p class="text-[13px] text-ink-muted">Freelance · Kalkulation steht</p>
              </div>
              <span class="flex items-center gap-1.5 font-mono text-[13px] text-red-ink"><PhClock class="size-3.5" aria-hidden="true" />morgen</span>
            </li>
            <li class="flex items-center gap-4 px-5 py-3">
              <span class="size-4 shrink-0 rounded border border-line-strong" aria-hidden="true"></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">Lesejournal Kapitel 3–5</p>
                <p class="text-[13px] text-ink-muted">Theorie</p>
              </div>
              <span class="font-mono text-[13px] text-ink-muted">20. Nov.</span>
            </li>
          </ul>
        </BaseCard>
      </section>

      <!-- Keys + empty state -->
      <section class="mt-12 grid gap-4 sm:grid-cols-2" aria-labelledby="s-misc">
        <h2 id="s-misc" class="sr-only">Tastenkürzel und leerer Zustand</h2>
        <BaseCard>
          <p class="text-sm font-medium">Tastenkürzel</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li class="flex items-center justify-between"><span>Aufgabe erfassen</span><BaseKbd>N</BaseKbd></li>
            <li class="flex items-center justify-between"><span>Suchen</span><BaseKbd>/</BaseKbd></li>
            <li class="flex items-center justify-between"><span>Fokus-Timer</span><BaseKbd>F</BaseKbd></li>
            <li class="flex items-center justify-between"><span>Schliessen</span><BaseKbd>Esc</BaseKbd></li>
          </ul>
        </BaseCard>
        <EmptyState :icon="PhTray" title="Noch keine Aufgaben" description="Erfasse deine erste Aufgabe oder importiere eine CSV aus BBNet.">
          <BaseButton variant="primary" :icon="PhPlus">Aufgabe erfassen</BaseButton>
        </EmptyState>
      </section>

      <!-- Feedback -->
      <section class="mt-12" aria-labelledby="s-feedback">
        <h2 id="s-feedback" class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Rückmeldungen</h2>
        <BaseCard class="mt-4">
          <div class="flex flex-wrap gap-3">
            <BaseButton @click="showUndoToast">Toast mit Rückgängig</BaseButton>
            <BaseButton @click="showErrorToast">Fehler-Toast</BaseButton>
            <BaseButton @click="dialogOpen = true">Dialog öffnen</BaseButton>
          </div>
        </BaseCard>
      </section>

      <BaseDialog v-model:open="dialogOpen" title="Aufgabe löschen?" description="„Plakat Entwurf“ wird entfernt. Du kannst es direkt danach rückgängig machen.">
        <p class="text-sm text-ink-muted">Planung und Notizen dieser Aufgabe gehen ebenfalls verloren.</p>
        <template #actions>
          <BaseButton variant="ghost" @click="dialogOpen = false">Abbrechen</BaseButton>
          <BaseButton variant="primary" :icon="PhTrash" @click="dialogOpen = false">Löschen</BaseButton>
        </template>
      </BaseDialog>
    </div>
  </div>
</template>

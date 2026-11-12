import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  toISODate, fromISODate, rowToFields, rowsToTasks, createTask, isTouched,
  mergeImport, migrateLegacy, enrichTask, compareByDue, withStatus, isOpen,
} from '../taskModel.js'
import { taskId } from '../taskId.js'

const NOW = new Date('2026-11-11T09:00:00Z')
const MAPPING = { title: 'Titel', deadline: 'Abgabe', category: 'Fach', description: 'Beschreibung', graded: 'Benotet?', files: 'Datei(en) zur Aufgabe' }
const ROWS = [
  { Fach: 'Typo', Titel: 'Plakat', Beschreibung: 'A3', Abgabe: '20. November 2026', 'Datei(en) zur Aufgabe': 'brief.pdf', 'Benotet?': 'Ja' },
  { Fach: 'Theorie', Titel: 'Lesejournal', Beschreibung: '', Abgabe: '13.11.2026', 'Datei(en) zur Aufgabe': '', 'Benotet?': 'Nein' },
]

describe('dates', () => {
  it('toISODate uses the local calendar day (no UTC shift)', () => {
    expect(toISODate(new Date(2026, 3, 24, 0, 0))).toBe('2026-04-24')
    expect(toISODate(new Date(2026, 3, 24, 23, 59))).toBe('2026-04-24')
  })

  it('fromISODate returns local midnight and rejects garbage', () => {
    const d = fromISODate('2026-04-24')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 3, 24, 0])
    expect(fromISODate('24.04.2026')).toBeNull()
    expect(fromISODate(null)).toBeNull()
  })
})

describe('rowToFields / rowsToTasks', () => {
  it('reads all mapped fields and normalises the due date', () => {
    expect(rowToFields(ROWS[0], MAPPING)).toEqual({
      title: 'Plakat', dueRaw: '20. November 2026', due: '2026-11-20', start: null,
      category: 'Typo', description: 'A3', graded: true, files: 'brief.pdf',
    })
  })

  it('falls back to legacy column names without a mapping', () => {
    expect(rowToFields({ Titel: 'X', Abgabe: '1.12.2026' }, {})).toMatchObject({ title: 'X', due: '2026-12-01' })
  })

  it('keeps the pre-B1 ID so calendar UIDs and planning still match', () => {
    const [task] = rowsToTasks([ROWS[0]], MAPPING, NOW)
    expect(task.id).toBe(taskId('Plakat', '20. November 2026'))
    expect(task).toMatchObject({ source: 'csv', sourceKey: task.id, status: 'open', area: 'study' })
  })

  it('gives duplicate title + date different IDs (collision fix)', () => {
    const tasks = rowsToTasks([ROWS[0], ROWS[0], ROWS[0]], MAPPING, NOW)
    const base = taskId('Plakat', '20. November 2026')
    expect(tasks.map(t => t.id)).toEqual([base, `${base}-2`, `${base}-3`])
  })

  it('skips completely empty rows', () => {
    expect(rowsToTasks([{ Titel: '', Abgabe: '' }], MAPPING, NOW)).toEqual([])
  })

  it('keeps a task with an unparseable date (shown as "kein Datum")', () => {
    const [t] = rowsToTasks([{ Titel: 'X', Abgabe: '31.02.2026' }], MAPPING, NOW)
    expect(t).toMatchObject({ dueRaw: '31.02.2026', due: null })
  })
})

describe('isTouched', () => {
  const base = createTask({ id: 'a', source: 'csv' }, NOW)
  it.each([
    [{}, false],
    [{ status: 'done' }, true],
    [{ priority: 'high' }, true],
    [{ effort: '2h' }, true],
    [{ notes: 'x' }, true],
    [{ steps: [{ id: 1 }] }, true],
    [{ area: 'freelance' }, true],
  ])('%j -> %s', (patch, touched) => {
    expect(isTouched({ ...base, ...patch })).toBe(touched)
  })
})

describe('mergeImport (re-importing a CSV)', () => {
  const first = rowsToTasks(ROWS, MAPPING, NOW)

  it('is idempotent: same file twice changes nothing', () => {
    expect(mergeImport(first, rowsToTasks(ROWS, MAPPING, NOW), NOW)).toEqual(first)
  })

  it('refreshes CSV fields but keeps what the user changed', () => {
    const edited = first.map(t => (t.title === 'Plakat' ? { ...t, priority: 'low', effort: '3h+', status: 'done' } : t))
    const changedRows = [{ ...ROWS[0], Beschreibung: 'A2 statt A3' }, ROWS[1]]
    const merged = mergeImport(edited, rowsToTasks(changedRows, MAPPING, NOW), NOW)
    const plakat = merged.find(t => t.title === 'Plakat')
    expect(plakat).toMatchObject({ description: 'A2 statt A3', priority: 'low', effort: '3h+', status: 'done' })
  })

  it('adds new rows and never duplicates existing ones', () => {
    const more = [...ROWS, { Titel: 'Neu', Abgabe: '1.12.2026' }]
    const merged = mergeImport(first, rowsToTasks(more, MAPPING, NOW), NOW)
    expect(merged.map(t => t.title)).toEqual(['Plakat', 'Lesejournal', 'Neu'])
  })

  it('removes untouched tasks that are gone (e.g. after fixing a wrong mapping)', () => {
    const wrong = rowsToTasks(ROWS, { title: 'Fach', deadline: 'Abgabe' }, NOW) // titles "Typo", "Theorie"
    const merged = mergeImport(wrong, first, NOW)
    expect(merged.map(t => t.title)).toEqual(['Plakat', 'Lesejournal'])
  })

  it('keeps gone tasks the user has touched', () => {
    const touched = first.map((t, i) => (i === 0 ? { ...t, notes: 'wichtig' } : t))
    const merged = mergeImport(touched, rowsToTasks([ROWS[1]], MAPPING, NOW), NOW)
    expect(merged.map(t => t.title)).toEqual(['Plakat', 'Lesejournal'])
  })

  it('never touches manual tasks', () => {
    const manual = createTask({ id: 'm1', title: 'Offerte senden', source: 'manual' }, NOW)
    const merged = mergeImport([manual, ...first], [], NOW)
    expect(merged).toEqual([manual])
  })
})

describe('migrateLegacy (pre-B1 storage -> tasks)', () => {
  it('returns no tasks for empty storage', () => {
    expect(migrateLegacy({ rows: [], mapping: {}, planning: {} }, NOW)).toEqual([])
  })

  it('converts rows and keeps priority and effort from the old planning store', () => {
    const id = taskId('Plakat', '20. November 2026')
    const tasks = migrateLegacy({ rows: ROWS, mapping: MAPPING, planning: { [id]: { effort: '2h', priority: 'low' } } }, NOW)
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({ id, effort: '2h', priority: 'low' })
    expect(tasks[1]).toMatchObject({ effort: null, priority: null })
  })

  it('gives former duplicates the planning they used to share', () => {
    const id = taskId('Plakat', '20. November 2026')
    const tasks = migrateLegacy({ rows: [ROWS[0], ROWS[0]], mapping: MAPPING, planning: { [id]: { effort: '1h' } } }, NOW)
    expect(tasks.map(t => t.effort)).toEqual(['1h', '1h'])
  })

  it('survives corrupt input', () => {
    expect(migrateLegacy({ rows: 'nope', mapping: null, planning: 'x' }, NOW)).toEqual([])
  })
})

describe('enrichTask', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 11, 10, 0)) })
  afterEach(() => vi.useRealTimers())

  it('derives days and status code from the due date', () => {
    const t = enrichTask(createTask({ id: 'a', title: 'X', due: '2026-11-12', dueRaw: '12.11.2026' }, NOW))
    expect(t).toMatchObject({ _id: 'a', _title: 'X', _days: 1, _statusCode: 'urgent', _deadline: '12.11.2026' })
  })

  it('formats the date for display when there is no original text', () => {
    expect(enrichTask(createTask({ id: 'm', due: '2026-12-01' }, NOW))._deadline).toBe('01.12.2026')
  })

  it.each([['2026-11-10', 'overdue'], ['2026-11-15', 'soon'], ['2026-11-30', 'ok'], [null, 'unknown']])(
    'due %s -> %s', (due, code) => {
      expect(enrichTask(createTask({ id: 'a', due }, NOW))._statusCode).toBe(code)
    })

  it('sorts tasks without a date last', () => {
    const list = [{ _days: null }, { _days: 5 }, { _days: -1 }].sort(compareByDue)
    expect(list.map(x => x._days)).toEqual([-1, 5, null])
  })
})

describe('done state (B2)', () => {
  const task = createTask({ id: 'a', title: 'Plakat' }, NOW)
  const later = new Date('2026-11-12T10:00:00Z')

  it('withStatus done sets completedAt, open clears it', () => {
    const done = withStatus(task, 'done', later)
    expect(done).toMatchObject({ status: 'done', completedAt: later.toISOString(), updatedAt: later.toISOString() })
    expect(withStatus(done, 'open', later)).toMatchObject({ status: 'open', completedAt: null })
  })

  it('does not mutate the original task', () => {
    withStatus(task, 'done', later)
    expect(task.status).toBe('open')
  })

  it('rejects unknown status values', () => {
    expect(() => withStatus(task, 'archived', later)).toThrow()
  })

  it('isOpen and _isDone agree', () => {
    const done = withStatus(task, 'done', later)
    expect([isOpen(task), isOpen(done)]).toEqual([true, false])
    expect([enrichTask(task)._isDone, enrichTask(done)._isDone]).toEqual([false, true])
  })

  it('a done task survives re-import as done (user change)', () => {
    const done = withStatus({ ...task, source: 'csv', sourceKey: 'a' }, 'done', later)
    const incoming = [{ ...createTask({ id: 'a', title: 'Plakat', source: 'csv', sourceKey: 'a' }, NOW) }]
    expect(mergeImport([done], incoming, later)[0].status).toBe('done')
  })
})


describe('manual tasks (B4)', () => {
  it('createManualTask gives a unique manual ID and keeps given fields', async () => {
    const { createManualTask } = await import('../taskModel.js')
    const a = createManualTask({ title: 'Offerte', area: 'freelance', due: '2026-11-13', priority: 'high' }, NOW)
    const b = createManualTask({ title: 'Offerte' }, NOW)
    expect(a).toMatchObject({ title: 'Offerte', area: 'freelance', due: '2026-11-13', priority: 'high', source: 'manual', sourceKey: null, status: 'open' })
    expect(a.id).toMatch(/^m-/)
    expect(a.id).not.toBe(b.id)
  })

  it('survives a CSV re-import untouched', async () => {
    const { createManualTask } = await import('../taskModel.js')
    const m = createManualTask({ title: 'Training' }, NOW)
    expect(mergeImport([m], rowsToTasks(ROWS, MAPPING, NOW), NOW)[0]).toBe(m)
  })
})

describe('upgradeToV3 (B5b: notes -> description for manual tasks)', () => {
  it('moves notes of manual tasks into the description', async () => {
    const { upgradeToV3 } = await import('../taskModel.js')
    const m = createTask({ id: 'm', source: 'manual', notes: 'Stundensatz klären' }, NOW)
    expect(upgradeToV3([m])[0]).toMatchObject({ description: 'Stundensatz klären', notes: '' })
  })

  it('appends to an existing description', async () => {
    const { upgradeToV3 } = await import('../taskModel.js')
    const m = createTask({ id: 'm', source: 'manual', description: 'A', notes: 'B' }, NOW)
    expect(upgradeToV3([m])[0].description).toBe('A\n\nB')
  })

  it('leaves CSV tasks and empty notes alone (same array)', async () => {
    const { upgradeToV3 } = await import('../taskModel.js')
    const list = [createTask({ id: 'c', source: 'csv', notes: 'eigene Notiz', description: 'aus CSV' }, NOW), createTask({ id: 'm' }, NOW)]
    expect(upgradeToV3(list)).toBe(list)
  })
})

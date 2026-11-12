import { describe, it, expect } from 'vitest'
import {
  BACKUP_FORMAT, BACKUP_VERSION, createBackup, parseBackup, applyBackup, clearAllData, summarize, backupFilename,
} from '../backup.js'
import { createTask, SCHEMA_VERSION } from '../taskModel.js'
import { shouldHint } from '../../composables/useBackup.js'

const NOW = new Date(2026, 10, 12, 14, 20)

/** Minimal Storage stand-in */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    keys: () => [...map.keys()].sort(),
    snapshot: () => Object.fromEntries([...map.entries()].sort()),
  }
}

const tasks = [
  createTask({ id: 'a', title: 'Plakat', due: '2026-11-20', area: 'study', tags: ['t1'], description: '- [ ] Skizze\n- [x] Brief', source: 'csv', sourceKey: 'a' }, NOW),
  createTask({ id: 'm-1', title: 'Offerte', area: 'freelance', status: 'done', completedAt: NOW.toISOString(), tags: ['t1', 't2'] }, NOW),
]
const FULL = {
  'duedate.taskStore.v1': JSON.stringify({ tasks }),
  'duedate.schemaVersion': '3',
  'duedate.tags.v1': JSON.stringify({ tags: [{ id: 't1', name: 'Huber AG', color: 'orange' }, { id: 't2', name: 'typo', color: 'green' }] }),
  'duedate.availability.v1': JSON.stringify([{ id: 'b1', label: 'Arbeit', days: ['Mon', 'Tue'], startTime: '08:00', endTime: '17:00' }]),
  'duedate.today.v1': JSON.stringify({ date: '2026-11-12', ids: ['a'], skipped: [] }),
  'duedate.columnMapping.v1': JSON.stringify({ title: 'Titel', deadline: 'Abgabe' }),
  'duedate.tasks.v1': JSON.stringify({ fileName: 'x.csv', rows: [{ Titel: 'Plakat', Abgabe: '20.11.2026' }] }),
  'duedate.theme.v1': 'light',
  'duedate.locale.v1': 'en',
}

describe('createBackup', () => {
  it('collects everything with format, versions and date', () => {
    const b = createBackup(fakeStorage(FULL), NOW)
    expect(b).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, schema: SCHEMA_VERSION, exportedAt: NOW.toISOString() })
    expect(b.data.tasks).toHaveLength(2)
    expect(b.data.tags).toHaveLength(2)
    expect(b.data.availability).toHaveLength(1)
    expect(b.data.csv.rows).toHaveLength(1)
    expect(b.data.settings).toEqual({ theme: 'light', locale: 'en' })
  })

  it('an empty app gives an empty, valid backup', () => {
    const b = createBackup(fakeStorage(), NOW)
    expect(b.data).toEqual({ tasks: [], tags: [], availability: [], today: null, columnMapping: null, csv: null, settings: { theme: null, locale: null } })
    expect(parseBackup(JSON.stringify(b)).backup).toBeTruthy()
  })

  it('survives corrupt storage content', () => {
    const b = createBackup(fakeStorage({ 'duedate.taskStore.v1': '{nope', 'duedate.tags.v1': '"x"' }), NOW)
    expect(b.data.tasks).toEqual([])
    expect(b.data.tags).toEqual([])
  })
})

describe('export -> import is lossless', () => {
  it('restores the identical state into an empty storage', () => {
    const backup = createBackup(fakeStorage(FULL), NOW)
    const target = fakeStorage()
    applyBackup(parseBackup(JSON.stringify(backup)).backup, target)
    expect(createBackup(target, NOW)).toEqual(backup)
  })

  it('replaces the current data instead of mixing', () => {
    const target = fakeStorage({
      'duedate.taskStore.v1': JSON.stringify({ tasks: [createTask({ id: 'old', title: 'Alt' }, NOW)] }),
      'duedate.tags.v1': JSON.stringify({ tags: [{ id: 'x', name: 'alt', color: 'gray' }] }),
      'duedate.today.v1': JSON.stringify({ date: '2026-11-11', ids: ['old'], skipped: [] }),
    })
    const small = createBackup(fakeStorage({ 'duedate.taskStore.v1': JSON.stringify({ tasks: [tasks[0]] }) }), NOW)
    applyBackup(small, target)
    const after = createBackup(target, NOW)
    expect(after.data.tasks.map(t => t.id)).toEqual(['a'])
    expect(after.data.tags).toEqual([])
    expect(after.data.today).toBeNull()
  })

  it('keeps the task ids, so calendar UIDs stay stable', () => {
    const target = fakeStorage()
    applyBackup(createBackup(fakeStorage(FULL), NOW), target)
    expect(JSON.parse(target.getItem('duedate.taskStore.v1')).tasks.map(t => t.id)).toEqual(['a', 'm-1'])
  })
})

describe('older and sloppy backups', () => {
  it('upgrades schema 2 (notes of manual tasks move into the description)', () => {
    const old = { ...createBackup(fakeStorage(), NOW), schema: 2 }
    old.data.tasks = [{ ...createTask({ id: 'm', title: 'X', source: 'manual' }, NOW), notes: 'alte Notiz' }]
    const target = fakeStorage()
    applyBackup(old, target)
    expect(JSON.parse(target.getItem('duedate.taskStore.v1')).tasks[0]).toMatchObject({ description: 'alte Notiz', notes: '' })
  })

  it('fills missing task fields with defaults', () => {
    const b = createBackup(fakeStorage(), NOW)
    b.data.tasks = [{ id: 'bare', title: 'Nur Titel' }]
    const target = fakeStorage()
    applyBackup(b, target)
    expect(JSON.parse(target.getItem('duedate.taskStore.v1')).tasks[0]).toMatchObject({ id: 'bare', status: 'open', area: 'study', tags: [], priority: null })
  })

  it('drops tag ids that point to no tag', () => {
    const b = createBackup(fakeStorage(), NOW)
    b.data.tasks = [{ ...createTask({ id: 'a', title: 'A' }, NOW), tags: ['gone', 't1'] }]
    b.data.tags = [{ id: 't1', name: 'x', color: 'blue' }]
    const target = fakeStorage()
    applyBackup(b, target)
    expect(JSON.parse(target.getItem('duedate.taskStore.v1')).tasks[0].tags).toEqual(['t1'])
  })
})

describe('parseBackup gives readable errors', () => {
  const valid = () => createBackup(fakeStorage(FULL), NOW)
  const code = (value) => parseBackup(typeof value === 'string' ? value : JSON.stringify(value)).error?.code

  it('accepts a valid file and summarizes it', () => {
    const r = parseBackup(JSON.stringify(valid()))
    expect(r.error).toBeUndefined()
    expect(r.summary).toEqual({ tasks: 2, open: 1, done: 1, tags: 2, blocks: 1, csvRows: 1 })
  })

  it('not JSON', () => {
    expect(code('{"kaputt": ')).toBe('not_json')
    expect(code('')).toBe('not_json')
  })

  it('JSON that is not a DueDate backup', () => {
    expect(code({ hello: 'world' })).toBe('wrong_format')
    expect(code([1, 2])).toBe('wrong_format')
    expect(code('null')).toBe('wrong_format')
  })

  it('a file from a newer app version', () => {
    expect(parseBackup(JSON.stringify({ ...valid(), version: 99 })).error).toEqual({ code: 'too_new', params: { version: 99 } })
    expect(code({ ...valid(), version: 'x' })).toBe('too_new')
  })

  it('broken content', () => {
    expect(code({ ...valid(), data: null })).toBe('invalid_data')
    expect(code({ ...valid(), data: { tasks: 'x' } })).toBe('invalid_data')
    const noId = valid(); noId.data.tasks.push({ title: 'ohne id' })
    expect(parseBackup(JSON.stringify(noId)).error).toEqual({ code: 'invalid_tasks', params: { count: 1 } })
    const dup = valid(); dup.data.tasks.push({ ...dup.data.tasks[0] })
    expect(code(dup)).toBe('duplicate_ids')
    const badTag = valid(); badTag.data.tags = [{ name: 'x' }]
    expect(code(badTag)).toBe('invalid_tags')
    const badBlock = valid(); badBlock.data.availability = ['x']
    expect(code(badBlock)).toBe('invalid_availability')
  })
})

describe('clearAllData / helpers', () => {
  it('removes data and looks-only state but keeps theme and language', () => {
    const s = fakeStorage({ ...FULL, 'duedate.areaFilter.v1': 'study', 'duedate.lastBackup.v1': 'x', 'duedate.taskPlanning.v1': '{}' })
    clearAllData(s)
    expect(s.keys()).toEqual(['duedate.locale.v1', 'duedate.theme.v1'])
  })

  it('summarize copes with nothing', () => {
    expect(summarize(null)).toEqual({ tasks: 0, open: 0, done: 0, tags: 0, blocks: 0, csvRows: 0 })
  })

  it('file name uses the local date', () => {
    expect(backupFilename(new Date(2026, 0, 5, 23, 59))).toBe('duedate-backup-2026-01-05.json')
  })
})

describe('backup reminder rule', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = Date.parse('2026-11-12T12:00:00Z')
  const ask = (o) => shouldHint({ taskCount: 10, lastBackupISO: null, hintUntilMs: 0, now, ...o })

  it('asks when there never was a backup and there is something to lose', () => {
    expect(ask({})).toBe(true)
  })

  it('stays quiet with almost no data', () => {
    expect(ask({ taskCount: 2 })).toBe(false)
  })

  it('stays quiet after a recent backup, asks after two weeks', () => {
    expect(ask({ lastBackupISO: new Date(now - 3 * DAY).toISOString() })).toBe(false)
    expect(ask({ lastBackupISO: new Date(now - 15 * DAY).toISOString() })).toBe(true)
  })

  it('respects "later" and treats a broken date as no backup', () => {
    expect(ask({ hintUntilMs: now + DAY })).toBe(false)
    expect(ask({ hintUntilMs: now - 1 })).toBe(true)
    expect(ask({ lastBackupISO: 'kaputt' })).toBe(true)
  })
})

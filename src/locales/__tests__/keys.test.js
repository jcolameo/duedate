import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { de } from '../de.js'
import { en } from '../en.js'

/**
 * Every literal t('a.b') key used in the source must exist in both
 * languages (dynamic keys like t('areas.' + x) are not checked here).
 */
const SRC = join(__dirname, '..', '..')

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === '__tests__' || name === 'locales') return []
    if (statSync(path).isDirectory()) return files(path)
    return /\.(vue|js)$/.test(name) ? [path] : []
  })
}

function has(dict, key) {
  return typeof key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict) === 'string'
}

const used = new Set()
for (const file of files(SRC)) {
  for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1])
}

describe('locale keys', () => {
  it('finds keys in the source', () => expect(used.size).toBeGreaterThan(50))

  it.each([['de', de], ['en', en]])('all used keys exist in %s', (_, dict) => {
    expect([...used].filter(key => !key.endsWith('.') && !key.endsWith('_') && !has(dict, key))).toEqual([])
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { t, tn, _setLangState } from './i18n-core.js'
import de from '../locales/de.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Every plural key the app actually asks tn() for, read off the source.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])
const tnKeys = () => {
  const keys = new Set()
  const re = /\btn\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3/gs
  for (const f of walk(SRC)) {
    if (!/\.(jsx?|mjs)$/.test(f) || /\.test\./.test(f) || /[\\/]locales[\\/]/.test(f)) continue
    const s = readFileSync(f, 'utf8')
    let m
    while ((m = re.exec(s))) keys.add(m[4])
  }
  return [...keys]
}

describe('tn() — plural forms from the pack', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  it('falls back to the English two-form split with no pack', () => {
    _setLangState('en', {}, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe('1 exercise')
    expect(tn('{0} exercise', '{0} exercises', 2)).toBe('2 exercises')
    expect(tn('{0} exercise', '{0} exercises', 0)).toBe('0 exercises')
  })

  it('leaves a pack that answers with a plain string exactly as it was', () => {
    // German has two forms and says so with ordinary strings; nothing about it changes.
    _setLangState('de', de, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe(de['{0} exercise'].replace('{0}', 1))
    expect(tn('{0} exercise', '{0} exercises', 7)).toBe(de['{0} exercises'].replace('{0}', 7))
  })

  // German needs only two forms, but a pack may answer a plural key with an object of CLDR forms
  // for a language that needs more; the mechanism is pinned here with a made-up pack.
  it('picks a form by the CLDR category when the pack answers with forms', () => {
    _setLangState('de', { '{0} exercises': { one: '{0} Übung', other: '{0} Übungen' } }, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe('1 Übung')
    expect(tn('{0} exercise', '{0} exercises', 5)).toBe('5 Übungen')
    expect(tn('{0} exercise', '{0} exercises', 0)).toBe('0 Übungen')
  })

  it('fills every placeholder, not just the count', () => {
    _setLangState('de', { '{0} sets · {1} work': { one: '{0} Satz · {1} Arbeit', other: '{0} Sätze · {1} Arbeit' } }, null, null)
    expect(tn('{0} set · {1} work', '{0} sets · {1} work', 1, 3)).toBe('1 Satz · 3 Arbeit')
    expect(tn('{0} set · {1} work', '{0} sets · {1} work', 5, 4)).toBe('5 Sätze · 4 Arbeit')
  })

  it('does not crash when a plural key is read through plain t()', () => {
    _setLangState('de', { '{0} exercises': { one: '{0} Übung', other: '{0} Übungen' } }, null, null)
    expect(t('{0} exercises', 5)).toBe('5 Übungen')
  })

  it('gives every tn() key a German plural', () => {
    const keys = tnKeys()
    expect(keys.length).toBeGreaterThan(20)
    for (const k of keys) expect(de[k], k).toBeTruthy()
  })
})

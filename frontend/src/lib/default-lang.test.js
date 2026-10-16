// #303: an instance-wide default language, and the browser's, apply only to a copy nobody has
// picked a language for — never to an existing profile, whose `lang: 'en'` may be a choice.
import { describe, expect, it } from 'vitest'
import { matchLocale, autoLang } from './default-lang.js'

describe('matchLocale', () => {
  it('matches the full tag first, in any case or separator', () => {
    expect(matchLocale('de-CH')).toBe('de-CH')
    expect(matchLocale('de_ch')).toBe('de-CH')
    expect(matchLocale(' DE-ch ')).toBe('de-CH')
  })
  it('falls back to the base language, and to nothing for one the app does not have', () => {
    expect(matchLocale('de-AT')).toBe('de')
    expect(matchLocale('en-US')).toBe('en')
    expect(matchLocale('de')).toBe('de')
    expect(matchLocale('nl-NL')).toBe(null)
    expect(matchLocale('pt-BR')).toBe(null)
    expect(matchLocale('')).toBe(null)
    expect(matchLocale(undefined)).toBe(null)
  })
})

describe('autoLang', () => {
  const fresh = { lang: 'en', langAuto: true }
  it('leaves a copy alone that chose, or that predates the mark', () => {
    expect(autoLang({ lang: 'en' }, { default_lang: 'de-CH' }, ['de-DE'])).toBe(null)
    expect(autoLang({ lang: 'en', langAuto: false }, { default_lang: 'de-CH' }, ['de-DE'])).toBe(null)
  })
  it('puts DEFAULT_LANG before the browser, the browser before English', () => {
    expect(autoLang(fresh, { default_lang: 'de-CH' }, ['de-DE'])).toBe('de-CH')
    expect(autoLang(fresh, {}, ['nl-NL', 'de-DE'])).toBe('de')
    expect(autoLang(fresh, {}, ['nl-NL'])).toBe('en')
    expect(autoLang(fresh, { default_lang: 'xx' }, ['de-AT'])).toBe('de')
  })
})

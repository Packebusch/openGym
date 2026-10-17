// @vitest-environment happy-dom
// History's search and month headings (design audit, proposal 11).
import { describe, expect, it } from 'vitest'
import { historyRows, filterHistory, byMonth } from './History.jsx'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'

const BENCH = '0025', SQUAT = '0043'
const w = (id, d, name, ...ex) => ({ id, d, start: Date.parse(d + 'T10:00:00Z'), name, entries: ex.map(e => ({ id: e, sets: [] })) })
const S = {
  workouts: [w('a', '2026-09-28', 'Push', BENCH), w('b', '2026-10-02', 'Legs', SQUAT), w('c', '2026-10-05', 'Push', BENCH)],
  dayNotes: { '2026-10-03': { text: 'Knee sore, rested', _ts: 1 } },
}

describe('History search', () => {
  it('finds a session by an exercise in it, not only by its name', () => {
    const word = exerciseNameFor(exOr(SQUAT)).split(' ').at(-1)
    expect(filterHistory(historyRows(S), word).map(r => r.w?.id)).toEqual(['b'])
  })
  it('finds by name, every word, any case', () => {
    expect(filterHistory(historyRows(S), 'PUSH').map(r => r.w.id)).toEqual(['c', 'a'])
  })
  it('finds a day note by its text', () => {
    expect(filterHistory(historyRows(S), 'knee').map(r => r.d)).toEqual(['2026-10-03'])
  })
  it('an empty search leaves everything', () => {
    expect(filterHistory(historyRows(S), '  ')).toHaveLength(4)
  })
})

describe('History by month', () => {
  it('groups newest first, notes in their month', () => {
    const months = byMonth(historyRows(S))
    expect(months.map(m => m.key)).toEqual(['2026-10', '2026-09'])
    expect(months[0].rows.map(r => r.w?.id ?? r.d)).toEqual(['c', '2026-10-03', 'b'])
  })
})

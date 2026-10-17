import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, tn, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { WorkoutRow, DayNoteRow, workoutDetailSheet, logPastWorkoutSheet } from '../sheets.jsx'
import { Button, SearchField } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { dayNoteOf } from '../lib/day-notes.js'
import { goBack } from '../lib/nav.js'
import { EXIDX } from '../lib/exercises.js'

// Newest first: every workout, and in between them the days off you left a note on (#261). A
// note on a day that has a workout too stays in the day sheet; the workout speaks for that day.
export function historyRows(S) {
  const trained = new Set((S.workouts || []).map(w => w?.d))
  const notes = Object.keys(S.dayNotes || {}).filter(d => !trained.has(d)).map(d => ({ d, note: dayNoteOf(S, d) })).filter(x => x.note)
  const rows = [...(S.workouts || []).map(w => ({ d: w.d, w })), ...notes]
  // Stable, so workouts keep the order they are stored in (by day, then start) within a day.
  return rows.map((r, i) => [r, i]).sort((a, b) => (a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : b[1] - a[1])).map(([r]) => r)
}

// The search over History (design audit, proposal 11): a workout matches by its name, its note or
// any exercise in it — "squat" finds every session with a squat, whatever the routine was called.
// A day note matches by its text. Case and accents do not count.
const fold = s => String(s || '').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export function filterHistory(rows, q) {
  const words = fold(q).split(/\s+/).filter(Boolean)
  if (!words.length) return rows
  return rows.filter(r => {
    const hay = r.w
      ? fold([r.w.name, r.w.note, ...(r.w.entries || []).map(e => (EXIDX[e?.id] ? exerciseNameFor(EXIDX[e.id]) : e?.n))].join(' '))
      : fold(r.note?.text)
    return words.every(w => hay.includes(w))
  })
}

// Rows under a heading per month, newest first: [{ key: '2026-10', rows }].
export function byMonth(rows) {
  const out = []
  for (const r of rows) {
    const key = String(r.d || '').slice(0, 7)
    if (out.at(-1)?.key !== key) out.push({ key, rows: [] })
    out.at(-1).rows.push(r)
  }
  return out
}

const monthName = key => {
  try { return new Date(key + '-15T12:00:00').toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) } catch { return key }
}

export default function History() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const all = historyRows(S)
  const rows = filterHistory(all, q)
  const row = r => r.w
    ? <WorkoutRow key={r.w.id} w={r.w} onClick={() => workoutDetailSheet(r.w)} />
    : <DayNoteRow key={'note-' + r.d} iso={r.d} note={r.note} />
  return <>
    <div className="hdr"><button className="iconbtn" onClick={() => goBack('/stats')} aria-label={t('Progress')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('History')}</h1><div className="sub">{tn('{0} workout', '{0} workouts', S.workouts.length)}</div></div></div>
    <Button icon="plus" onClick={logPastWorkoutSheet} style={{ marginBottom: 12 }}>{t('Log a past workout')}</Button>
    {all.length > 0 && <div className="history-search">
      <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')}
        placeholder={t('Search by workout or exercise')} aria-label={t('Search history')} inputMode="search" enterKeyHint="search" autoComplete="off" />
    </div>}
    {!all.length ? <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet. Your first one will land here.')}</div>
      : !rows.length ? <div className="empty">{t('Nothing matches “{0}”.', q.trim())}</div>
      : byMonth(rows).map(m => <section key={m.key} className="history-month">
        <h4 className="sec">{monthName(m.key)} <span className="dim">· {tn('{0} workout', '{0} workouts', m.rows.filter(r => r.w).length)}</span></h4>
        <div className="list">{m.rows.map(row)}</div>
      </section>)}
  </>
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutines, effectiveRoutineIds, nextTrainingDay, streakWeeks, lastBW, setsDoneActive, workoutDay } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekStartOf, weekDayOffset, exerciseNameText, exCount, DAYS, DAYN } from '../lib/format.js'
import { t, tn, dateLocale } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startSheet, starterPlanSheet, bwDeltaColor, sessionPreviewSheet, openDaySheet, menuSheet, moveSessionSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import QueueRow from '../components/QueueRow.jsx'
import { queueOf, queueView, weekTally, pinState } from '../lib/queue.js'
import { scheduleModeOf } from '../lib/rotation.js'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf } from '../lib/glyphs.js'
import { dayNoteOf } from '../lib/day-notes.js'
import { exOr } from '../lib/exercises.js'
import { sessionPreview, firstOf } from '../lib/session-preview.js'
import { speedUnitOf } from '../lib/speed.js'
import { canMoveSession } from '../lib/day-move.js'
import { useUI } from '../store/useUI.js'

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)
  const toast = (m, o) => useUI.getState().toast(m, o)
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  // A weekday can hold several routines. `todayRoutines` is the whole day; `routine` is the
  // first, kept for the one-routine glyph. The derived session name joins them (§9).
  const todayRoutines = effectiveRoutines(S, todayISO())
  const routine = todayRoutines[0] || null
  const todayName = todayRoutines.map(r => r.name).join(' + ')
  // A fulfilled pin (a coach session pinned to today and since done) reads as no override.
  const todayOvr = S.dayPlan[todayISO()] !== undefined && pinState(S, S.dayPlan[todayISO()]) !== 'done'
  // An open editor on a saved workout (lib/session-edit.js) holds S.active too, but it is not a
  // session in progress: the row takes you back to it as an edit, the way the tab bar does.
  const editingSaved = !!S.active?.editingWorkoutId
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  // With a starting weight set, the arrow tells how far you have come since then; without one,
  // how far the last weigh-in moved from the one before.
  const fromStart = Number.isFinite(S.startW) && S.startW > 0
  const delta = bw ? (fromStart ? bw.w - S.startW : prevBW ? bw.w - prevBW.w : null) : null

  const ws = weekStartOf(S)
  // The first day of the shown week. Named for the role, not for Monday — which day that is
  // is the setting.
  const wkStart = new Date(today)
  wkStart.setDate(today.getDate() - weekDayOffset(today.getDay(), ws) + weekOffset * 7)
  // Workouts by the day they count for — the same grouping the month calendar uses, so a tap on
  // a trained day here opens what was done there, as it does in the calendar.
  const byDay = {}
  S.workouts.forEach(w => { const day = workoutDay(w); if (day) (byDay[day] = byDay[day] || []).push(w) })
  // The last session logged for today, if any — what the row below reports instead of asking
  // you to start the one you already did. Last wins, so a second session names itself. Only once
  // today's plan is covered, though: a freestyle session on a planned day, or the rotation's
  // first session done when its next one is today's too, leaves the row offering what is still
  // to do, as Start and the progress row already do. A queue session is never "covered" by an
  // earlier workout: the queue only names one it does not count as done yet.
  const loggedToday = S.workouts.filter(w => w.d === todayISO())
  const queueIds = queueOf(S)?.ids || []
  const coveredToday = id => !queueIds.includes(id) && loggedToday.some(w => (Array.isArray(w.routineIds) ? w.routineIds : [w.routineId]).includes(id))
  const doneToday = (todayRoutines.every(r => coveredToday(r.id)) && loggedToday.at(-1)) || null
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(wkStart); d.setDate(wkStart.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineIds(S, iso).length > 0, ovr = S.dayPlan[iso] !== undefined, done = !!byDay[iso]
    // A day off with a note (#261) reads as excused, not as a plan that went by.
    const dot = done ? ' done' : dayNoteOf(S, iso) ? ' noted' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    // The dot's colour says it to the eye; the name says it to a screen reader.
    const said = { ' done': 'Trained', ' noted': 'Day note', ' ovr': 'Rescheduled', ' plan': 'Planned' }[dot]
    const name = [iso === todayISO() && t('Today'), t(DAYS[d.getDay()]) + ' ' + d.getDate(), said && t(said)].filter(Boolean).join(', ')
    strip.push(<div key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} aria-label={name} {...tappable(() => openDaySheet(iso, byDay[iso]))}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></div>)
  }
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${wkStart.getDate()} ${wkStart.toLocaleDateString(dateLocale(), { month: 'short' })} – ${wkEnd.getDate()} ${wkEnd.toLocaleDateString(dateLocale(), { month: 'short' })}`

  // A coach week (S.queue) read through the same tolerant reader QueueRow uses, so a malformed
  // queue from another client shows the weekday dots, never an empty card.
  const queue = queueView(S, todayISO())
  // This card shows one thing or the other — QueueRow for a live queue, or Rotation chosen with
  // nothing built yet (S.scheduleMode), in which case there is no queue for QueueRow to render and
  // an empty-state card takes its place. Plan does the same in rotation mode: no weekday grid, only
  // the days that add a routine the loop does not have (Plan.jsx, "Also on fixed days").
  const rotating = scheduleModeOf(S) === 'rotation'
  // A planner-written queue (no rotationId) still names its weekday when it hasn't started yet —
  // that copy predates rotation and stays as it is. Our own rotation has no weekday of its own
  // (lib/rotation.js): naming one here — including on the pass's own one-day empty gap (THE
  // ONE-DAY BOUNDARY, rotation.js) or before a first routine is even added — would be the
  // fixed-week model leaking into a schedule that was never weekday-based.
  const liveQ = queueOf(S)
  const plannerQueue = !!queue && !liveQ?.rotationId
  // Ownership, not mere presence of a rotationId: a stale id left over from a rebuilt rotation
  // would otherwise still read as "this app manages it" (lib/rotation.js).
  const managedQueue = !!liveQ && !!S.rotation && liveQ.rotationId === S.rotation.id
  // On a rest day, saying when you train next beats leaving the row as a full stop.
  const next = !S.active && !todayRoutines.length && !(rotating && !plannerQueue) ? nextTrainingDay(S, todayISO()) : null
  // The streak card's fraction: this calendar week's workouts over the weekdays with a plan, or,
  // in a coach week, the queue's sessions and your own days together (lib/queue.js weekTally).
  const { done: doneThisWeek, planned: plannedPerWeek } = weekTally(S, todayISO())
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))

  // The hero card (design audit, proposal 3): what today holds, with the numbers it opens at and
  // which of them went up, so the plan is read before the gym floor rather than on it. Start
  // opens the Start sheet with today picked — the one door (proposal 1); the card's ⋯ holds the
  // rest: the whole session, moving it to another day, skipping it, picking something else.
  const todayIds = todayRoutines.length ? effectiveRoutineIds(S, todayISO()) : []
  const planned = !!routine && !S.active && !doneToday
  const p = useMemo(() => planned ? sessionPreview(S, todayIds, { speedUnit: speedUnitOf(S) }) : null, [S, planned, todayIds.join('+')])
  const lifts = p ? firstOf(p.items.map((_, i) => i), 4) : null
  // A chip on the coach week's progress row shows that one routine, with Start on the sheet, in
  // any order. A session already in progress wins, as on the today row — starting another would
  // overwrite it.
  const onQueueStart = id => { if (S.active) nav('/workout'); else sessionPreviewSheet([id]) }
  const skipToday = () => {
    const was = S.dayPlan[todayISO()]
    update(s => { s.dayPlan = { ...s.dayPlan, [todayISO()]: 'rest' } })
    toast(t('{0} set to rest', t('Today')), { action: t('Undo'), onAction: () => update(s => {
      const next = { ...s.dayPlan }
      if (was === undefined) delete next[todayISO()]; else next[todayISO()] = was
      s.dayPlan = next
    }) })
  }
  const heroMenu = () => menuSheet({
    title: todayName,
    items: [
      { icon: 'list', label: t('See all exercises'), onClick: () => sessionPreviewSheet(todayIds) },
      canMoveSession(S, todayISO()) && { icon: 'calendar', label: t('Move to another day'), onClick: () => moveSessionSheet(todayISO()) },
      { icon: 'swap', label: t('Train something else today'), onClick: () => dayOverrideSheet(todayISO()) },
      !rotating && { icon: 'moon', label: t('Skip today'), onClick: skipToday },
    ],
  })
  // A bare number is all a card that only shows up after two weigh-ins needs to explain itself:
  // the curve is the point, and one point is not a curve.
  const showWeight = S.showWeightCard !== false && S.bodyweight.length >= 2

  const hero = S.active ? <div className="card hero live" {...tappable(() => nav('/workout'))}>
    <div className="hero-head">
      <span className="lrow-i" style={{ background: 'var(--live)' }}><Icon name={editingSaved ? 'pencil' : 'play'} /></span>
      <div className="grow"><div className="lbl2">{editingSaved ? t('Editing') : t('In progress')}</div><div className="hero-name">{S.active.name}</div></div>
    </div>
    <Button variant="primary" icon={editingSaved ? 'pencil' : 'play'} onClick={e => { e.stopPropagation(); nav('/workout') }}>{editingSaved ? t('Edit') : t('Resume')}</Button>
  </div>
  : doneToday ? <div className="card hero done">
    <div className="hero-head">
      <span className="lrow-i" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="checkCircle" /></span>
      <div className="grow"><div className="lbl2">{t('Today')}</div><div className="hero-name">{doneToday.name ? t('{0} (done)', doneToday.name) : t('Workout done')}</div>
        {next && <div className="ss">{t('Next session: {0}, {1}', t(DAYN[next.weekday]), next.routine.name)}</div>}</div>
    </div>
    <Button variant="ghost" icon="plus" onClick={() => startSheet()}>{t('Train again')}</Button>
  </div>
  : planned ? <div className="card hero">
    <div className="hero-head">
      <span className="lrow-i" style={{ background: 'var(--acc)' }}><Icon name={glyphOf(routine.emoji)} /></span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="lbl2">{t('Today')}</div>
        <div className="hero-name">{todayName}{todayOvr ? ' · ' + t('rescheduled') : ''}</div>
        <div className="ss">{exCount(p.items.length)}{p.sets ? ' · ' + t('{0} sets', p.sets) : ''}</div>
      </div>
      <button className="iconbtn" onClick={heroMenu} aria-label={t('Today’s options')}><Icon name="more" /></button>
    </div>
    <div className="hero-lifts" {...tappable(() => sessionPreviewSheet(todayIds))}>
      {lifts.shown.map(i => {
        const it = p.items[i]
        return <div key={i} className="hero-lift">
          <span className="grow ellipsis">{exerciseNameText(exOr(it.id))}</span>
          <span className="hero-line">{it.kind === 'up' && <Icon name="arrowUp" className="up" aria-label={t('Target goes up today')} />}{it.line}</span>
        </div>
      })}
      {lifts.more > 0 && <div className="small muted">{t('+{0} more', lifts.more)}</div>}
    </div>
    <Button variant="primary" icon="play" onClick={() => startSheet(todayIds)}>{t('Start {0}', todayName)}</Button>
  </div>
  : <div className="card hero rest">
    <div className="hero-head">
      <span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="moon" /></span>
      <div className="grow"><div className="lbl2">{t('Today')}</div><div className="hero-name">{t('Rest day')}</div>
        {next && <div className="ss">{t('Next session: {0}, {1}', t(DAYN[next.weekday]), next.routine.name)}</div>}</div>
    </div>
    {S.routines.length > 0 && <div className="row" style={{ gap: 'var(--sp-2)' }}>
      <Button size="sm" variant="tinted" icon="play" onClick={() => startSheet()}>{t('Start a workout anyway')}</Button>
      <Button size="sm" variant="ghost" icon="calendar" onClick={() => dayOverrideSheet(todayISO())}>{t('Plan today')}</Button>
    </div>}
  </div>

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{user ? t('Hi {0}', user.name) : t('Today')}</h1><div className="sub">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
    </div>

    {!S.routines.length && !S.active ? (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span className="lrow-i"><Icon name="calendar" /></span>
          <div className="big" style={{ fontSize: 'var(--fs-xl)' }}>{t('Welcome!')}</div>
        </div>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Set up your weekly routine to get going, or grab a ready-made starter plan.')}</div>
        <Button variant="primary" icon="clipboard" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
        <div style={{ height: 8 }} /><Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    ) : hero}

    <div className="card">
      {/* A coach week runs by order, not by weekday, so its progress row stands in for the
          seven dots (components/QueueRow.jsx). */}
      {rotating ? (queue ? <QueueRow S={S} today={todayISO()} onStart={onQueueStart} managed={managedQueue} /> : <div className="empty">
        {t('No rotation yet. Add routines to it in Plan.')}
        <div style={{ marginTop: 10 }}><Button size="sm" variant="tinted" onClick={() => nav('/plan')}>{t('Set up in Plan')}</Button></div>
      </div>) : <>
        <div className="row between" style={{ marginBottom: 8 }}>
          <button className="iconbtn wk-arrow" onClick={() => setWeekOffset(w => w - 1)} aria-label={t('Previous week')}><Icon name="chevronLeft" /></button>
          <div className="small muted" style={{ fontWeight: 500 }}>{wkLabel}</div>
          <button className="iconbtn wk-arrow" onClick={() => setWeekOffset(w => w + 1)} aria-label={t('Next week')}><Icon name="chevronRight" /></button>
        </div>
        <div className="week">{strip}</div>
      </>}
      {/* The streak used to be a card of its own; it is a line under the week it counts now, and
          still the way into the month calendar. */}
      <button type="button" className="streak-line" onClick={() => calendarSheet()}>
        <Icon name="flame" style={{ color: 'var(--live)' }} />
        <span><b>{t('{0} week streak', streakWeeks(S))}</b> · <span className="streak-tally">{doneThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {tn('{0} workout total', '{0} workouts total', S.workouts.length)}</span></span>
        <Icon name="chevronRight" className="chev" />
      </button>
    </div>

    {showWeight && <div className="card">
      <div className="row between bw-head" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--goal)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
        <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></div>
        {/* only when it actually moved — an unchanged weight used to read as "− 0" */}
        {!!delta && (
          <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
            <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />
            {fmtNum(Math.abs(delta))}{fromStart && ' ' + t('since start')}
          </span>
        )}
        <span className="dim small" style={{ marginInlineStart: 'auto' }}>{fmtDate(bw.d, true)}</span>
      </div>
      <div className="chart" style={{ marginTop: 8 }}><LineChart points={bwPoints} h={110} unit={S.unit} goal={S.targetW} /></div>
    </div>}
  </div>
}

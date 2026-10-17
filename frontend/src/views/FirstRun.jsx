import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { Button, Segmented } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { starterPlanOptions } from '../lib/starter.js'
import { recommendPlan, PLACES } from '../lib/first-run.js'
import { newProfile, ACC_V } from '../lib/equipment.js'
import { loadStarterPlan, planCopy } from '../sheets.jsx'

// The first run (design audit, proposal 10): three steps between signing in and a Today screen
// with session 1 ready. Every step can be skipped, and skipping ends it for good: the Plan tab
// and the starter plans are where they always were. Nothing is written until the last step, so
// leaving half-way leaves the profile as it was.
export default function FirstRun() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const setUnit = useStore(s => s.setUnit)
  const [step, setStep] = useState(0)
  const [days, setDays] = useState(3)
  const [experienced, setExperienced] = useState(false)
  const [plan, setPlan] = useState(null)
  const [place, setPlace] = useState('gym')
  const [unit, setUnitChoice] = useState(S.unit || 'kg')
  const [weekStart, setWeekStart] = useState(S.weekStart === 0 ? 0 : 1)
  const recommended = recommendPlan({ days, experienced })
  const chosen = plan ?? recommended

  const done = () => update(s => { s.setupDone = true })
  const finish = () => {
    // No data yet, so the unit is a label to set, not numbers to convert.
    if (unit !== (S.unit || 'kg')) setUnit(unit, { convert: false })
    let profile = null
    if (PLACES[place]) {
      profile = { ...newProfile(place === 'home' ? t('Home') : t('Body weight only')), equipment: PLACES[place], accV: ACC_V }
    }
    update(s => {
      s.weekStart = weekStart
      if (profile) {
        s.equipProfiles = [...(s.equipProfiles || []), profile]
        s.activeEquipId = profile.id
        s.equipFilterOn = true
      }
    })
    if (chosen !== 'own') loadStarterPlan(chosen, profile)
    done()
  }

  const choice = (on, onClick, title, sub, badge) => <div className={'item fr-choice' + (on ? ' on' : '')} {...tappable(onClick)} role="radio" aria-checked={on}>
    <div className="grow"><div className="tt">{title}{badge && <span className="tag acc fr-badge">{badge}</span>}</div>{sub && <div className="ss">{sub}</div>}</div>
    <span className="start-radio" aria-hidden="true">{on && <Icon name="check" />}</span>
  </div>

  const steps = [
    <>
      <h1>{t('Welcome to openGym')}</h1>
      <p className="muted fr-lead">{t('Three questions, and your first workout is ready to start.')}</p>
      <h4 className="sec">{t('How many days a week can you train?')}</h4>
      <Segmented value={days} onChange={setDays} options={[2, 3, 4, 5, 6].map(n => ({ value: n, label: String(n) }))} />
      <h4 className="sec">{t('How long have you been lifting?')}</h4>
      <div className="list" role="radiogroup" aria-label={t('How long have you been lifting?')}>
        {choice(!experienced, () => setExperienced(false), t('New to it'), t('Less than a year, or starting over'))}
        {choice(experienced, () => setExperienced(true), t('A while'), t('I know the squat, bench and deadlift'))}
      </div>
    </>,
    <>
      <h1>{t('Pick a program')}</h1>
      <p className="muted fr-lead">{t('Every one of them adds weight for you as you get stronger. You can change anything later in Plan.')}</p>
      <div className="list" role="radiogroup" aria-label={t('Pick a program')}>
        {starterPlanOptions().map(({ id, days: n }) => {
          const { name, about } = planCopy(id)
          return <div key={id}>{choice(chosen === id, () => setPlan(id), name, t('{0} days per week', n) + ' · ' + about, id === recommended ? t('Recommended') : null)}</div>
        })}
        {choice(chosen === 'own', () => setPlan('own'), t('I’ll build my own'), t('Start with an empty plan'))}
      </div>
    </>,
    <>
      <h1>{t('Your setup')}</h1>
      <p className="muted fr-lead">{t('So the weights and the exercises fit what you have.')}</p>
      <h4 className="sec">{t('Where do you train?')}</h4>
      <div className="list" role="radiogroup" aria-label={t('Where do you train?')}>
        {choice(place === 'gym', () => setPlace('gym'), t('A gym'), t('Barbells, machines, the lot'))}
        {choice(place === 'home', () => setPlace('home'), t('At home'), t('Dumbbells and a bench'))}
        {choice(place === 'bodyweight', () => setPlace('bodyweight'), t('Body weight only'), t('A pull-up bar at most'))}
      </div>
      <h4 className="sec">{t('Weight unit')}</h4>
      <Segmented value={unit} onChange={setUnitChoice} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
      <h4 className="sec">{t('Week starts on')}</h4>
      <Segmented value={weekStart} onChange={setWeekStart} options={[{ value: 1, label: t('Monday') }, { value: 0, label: t('Sunday') }]} />
    </>,
  ]
  const last = step === steps.length - 1
  return <div className="narrow first-run">
    <div className="fr-top">
      <div className="fr-dots" aria-label={t('Step {0} of {1}', step + 1, steps.length)}>
        {steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}
      </div>
      <button className="plan-textbtn" onClick={done}>{t('Skip')}</button>
    </div>
    {steps[step]}
    <div className="fr-actions">
      {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>{t('Back')}</Button>}
      <Button variant="primary" onClick={last ? finish : () => setStep(step + 1)}>{last ? t('Done') : t('Next')}</Button>
    </div>
  </div>
}

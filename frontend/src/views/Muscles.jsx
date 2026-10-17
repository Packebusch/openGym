import { t } from '../lib/i18n.js'
import MuscleExplorer from '../components/MuscleExplorer.jsx'
import { exerciseDetailSheet, addToRoutineSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { goBack } from '../lib/nav.js'

export default function Muscles() {
  return <>
    <div className="hdr"><button className="iconbtn" onClick={() => goBack('/plan')} aria-label={t('Exercises')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Explore muscles')}</h1><div className="sub">{t('Choose a muscle to see exercises that train it.')}</div></div></div>

    <MuscleExplorer onDetail={exerciseDetailSheet} onPlan={addToRoutineSheet} />
  </>
}

import { Ico, Riyal } from './icons.jsx'
import { Checkbox } from './primitives.jsx'
import { STATUS, fmtMoney } from '../lib/format.js'
import { RowMenu, docMenu } from './rowmenu.jsx'

/* ============================================================
   قائمة الإشعارات — دائنة ومدينة على نفس الشبكة.
   الفرق الوحيد بينهم اتجاه الأثر: الدائن بيقلّل اللي على العميل،
   والمدين بيزوّده. عشان كده الاتنين بيقروا من نفس الكمبوننت
   ويختلفوا في الليبل والاتجاه بس.

   الحاجة اللي بتفرّق الإشعار عن أي مستند تاني: **مالوش معنى لوحده**.
   دايمًا ضد فاتورة، ودايمًا ليه سبب. الاتنين لازم يبانوا في الصف.
   ============================================================ */

export const NGROUPS = [
  { id: 'act',    t: 'محتاج تصرّف', note: 'مرفوضة من الهيئة' },
  { id: 'issued', t: 'صادرة',       note: 'اتقبلت أو لسه عند الهيئة' },
  { id: 'draft',  t: 'مسودات',      note: 'لسه ما اتصدرتش' },
  { id: 'closed', t: 'مقفولة',      note: 'ملغاة' },
]

export function ngroupOf(n) {
  if (n.zatca === 'bad') return 0
  if (n.status === 'draft') return 2
  if (['void', 'cancelled'].includes(n.status)) return 3
  return 1
}

function actionOf(n) {
  if (n.zatca === 'bad')       return { label: 'إعادة الإرسال', tone: 'crit' }
  if (n.status === 'draft')    return { label: 'إصدار', tone: 'go' }
  if (n.status === 'issued')   return { label: 'إرسال للعميل', tone: 'quiet' }
  return null
}

function Amount({ v, soft, sign, minus }) {
  return (
    <span className={`amt${soft ? ' amt--soft' : ''}`}>
      {minus && <span className="amt__sgn">−</span>}
      <span className="amt__n">{fmtMoney(v).split('.')[0]}</span>
      {sign && <Riyal />}
    </span>
  )
}

function NState({ status }) {
  const s = STATUS[status] || STATUS.draft
  return <span className={`st st--${s.tone}`}>{s.label}</span>
}

function ZatcaState({ state, reason }) {
  if (!state || state === 'ok') return null
  const bad = state === 'bad'
  return (
    <span className={`zs${bad ? ' zs--bad' : ''}`} title={bad ? reason : 'في انتظار رد الهيئة'}>
      <i className="zs__box">{bad ? '!' : '⋯'}</i>
      {bad ? 'رفض الهيئة' : 'عند الهيئة'}
    </span>
  )
}

export function NRow({ n, kind, selected, onSelect }) {
  const act = actionOf(n)
  const soft = ['void', 'cancelled'].includes(n.status)

  return (
    <div className={`row${selected ? ' is-sel' : ''}`} data-component="NoteRow">
      <span className="row__cb"><Checkbox checked={selected} onChange={onSelect} /></span>

      <span className="row__party">
        <b>{n.c.ar}</b>
        <span className="row__doc">{n.no}</span>
      </span>

      <span className="row__mid">
        <span className="row__st">
          <NState status={n.status} />
          <ZatcaState state={n.zatca} reason={n.zatcaReason} />
        </span>
        {/* المرجع والسبب — من غيرهم الإشعار مجرد رقم */}
        <span className="row__ref">
          <b>{n.src}</b>
          <em>{n.reason}</em>
        </span>
      </span>

      <span className="row__amt">
        <Amount v={n.total} soft={soft} minus={kind === 'credit'} />
      </span>

      <span className="row__act">
        {act && <button className={`act act--${act.tone}`}>{act.label}</button>}
        <RowMenu label={`خيارات ${n.no}`} items={docMenu({ zatca: n.zatca })} />
      </span>
    </div>
  )
}

export function NGroup({ group, rows, kind, selected, onSelect }) {
  if (!rows.length) return null
  const sum = rows.reduce((a, r) => a + r.total, 0)
  return (
    <section className={`grp grp--${group.id}`} data-component="NoteGroup">
      <header className="grp__h">
        <h2 className="grp__t">{group.t}</h2>
        <span className="grp__note">{group.note}</span>
        <span className="grp__sum">
          <span className="grp__c">{rows.length}</span>
          {group.id !== 'closed' && sum > 0 && (
            <span className="grp__owed">قيمتها <Amount v={sum} /></span>
          )}
        </span>
      </header>
      {rows.map((n) => (
        <NRow key={n.no} n={n} kind={kind} selected={selected.has(n.no)}
          onSelect={() => onSelect(n.no)} />
      ))}
    </section>
  )
}

/* ---------- رأس الأرقام ----------
   السؤال هنا مش «أنا كويس؟» — السؤال «إحنا بنرجّع كام، وليه؟».
   الرقم الثالث هو اللي بيدي المعنى: النسبة من المبيعات. */
export function NMoneyHead({ rows, sales, kind }) {
  const has = (st) => rows.filter((r) => st.includes(r.status))
  const issued = has(['issued'])
  const draft  = has(['draft'])
  const closed = has(['void', 'cancelled'])
  const bad    = rows.filter((r) => r.zatca === 'bad')

  const issuedSum = issued.reduce((a, r) => a + r.total, 0)
  const draftSum  = draft.reduce((a, r) => a + r.total, 0)
  const salesSum  = sales.reduce((a, r) => a + r.total, 0)
  const ratio     = salesSum ? (issuedSum / salesSum) * 100 : 0

  const pc = (n, d) => (d ? (n / d) * 100 : 0)
  const credit = kind === 'credit'

  const SPLIT = [
    ['bad',    'var(--viz-attention)', () => bad,    'a', 'مرفوضة من الهيئة'],
    ['issued', 'var(--viz-positive)',  () => issued, 'p', 'صادرة'],
    ['draft',  'var(--viz-neutral)',   () => draft,  'n', 'مسودة'],
    ['closed', 'var(--viz-faint)',     () => closed, 'f', 'ملغاة'],
  ]

  return (
    <div className="ins" data-component="NoteInsights">

      <article className="ins__c">
        <span className="ins__lbl">الإشعارات هذه الفترة</span>
        <span className="ins__v"><span className="ins__n">{rows.length}</span><em>إشعار</em></span>
        <span className="ins__bar">
          {SPLIT.map(([key, c, list]) => list().length > 0 && (
            <i key={key} style={{ width: `${pc(list().length, rows.length)}%`, background: c }} />
          ))}
        </span>
        <span className="ins__leg">
          {SPLIT.map(([key, , list, dot, label]) => list().length > 0 && (
            <b key={key}><i data-c={dot} />{list().length} {label}</b>
          ))}
        </span>
      </article>

      <article className="ins__c">
        <span className="ins__lbl">{credit ? 'المخصوم من العملاء' : 'المضاف على العملاء'}</span>
        <span className="ins__v"><Amount v={issuedSum} sign /></span>
        <span className="ins__bar">
          <i style={{ width: `${pc(issuedSum, issuedSum + draftSum)}%`, background: 'var(--viz-positive)' }} />
          <i style={{ width: `${pc(draftSum, issuedSum + draftSum)}%`, background: 'var(--viz-neutral)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="p" />صادرة <Amount v={issuedSum} sign /></b>
          {draftSum > 0 && <b><i data-c="n" />في المسودات <Amount v={draftSum} sign /></b>}
        </span>
      </article>

      {/* النسبة من المبيعات — الرقم اللي بيقول إذا كان فيه مشكلة ولا لأ */}
      <article className="ins__c">
        <span className="ins__lbl">نسبتها من المبيعات</span>
        <span className="ins__v">
          <span className="ins__n">{ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}</span><em>٪</em>
        </span>
        <span className="ins__bar">
          <i style={{ width: `${Math.min(ratio, 100)}%`, background: 'var(--viz-attention)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="a" /><Amount v={issuedSum} sign /> من <Amount v={salesSum} sign /> اتفوترت</b>
        </span>
      </article>
    </div>
  )
}

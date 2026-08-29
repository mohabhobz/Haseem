import { Ico, Riyal } from './icons.jsx'
import { Checkbox } from './primitives.jsx'
import { STATUS, fmtDate, fmtMoney, daysFrom } from '../lib/format.js'
import { isPrf, qKindAr } from '../data/mock.js'
import { RowMenu } from './rowmenu.jsx'

/* ============================================================
   قائمة عروض الأسعار — نفس شبكة قائمة الفواتير وقواعدها، بس
   الحياة هنا مختلفة: العرض مش بيتحصّل، العرض بيستنى ردّ.
   فالسؤال اللي الصفحة بتجاوب عليه: «أي عرض محتاج مني حركة دلوقتي؟»
   ============================================================ */

/* ---------- أربع مجموعات — نفس قاعدة الـ٤ ---------- */
export const QGROUPS = [
  { id: 'act',   t: 'محتاج تصرّف',    note: 'مقبول لسه ما اتحوّلش · قارب على الانتهاء · منتهي' },
  { id: 'wait',  t: 'بانتظار الرد',   note: 'اترسل للعميل وفي مهلته' },
  { id: 'draft', t: 'مسودات',         note: 'لسه ما اترسلتش' },
  { id: 'done',  t: 'مقفولة',         note: 'اتحوّلت لفاتورة · مرفوضة · ملغاة' },
]

export function qgroupOf(q) {
  const d = daysFrom(q.valid)
  if (q.status === 'accepted') return 0                      /* مقبول ولسه فاتورة ما اتعملتش */
  if (q.status === 'expired') return 0
  if (q.status === 'sent' && d !== null && d <= 7) return 0   /* هينتهي قريب */
  if (q.status === 'sent') return 1
  if (q.status === 'draft') return 2
  return 3
}

/* ---------- أمر واحد لكل صف، الحالة هي اللي بتقرره ----------
   والنوع بيغيّر **اللفظ** مش المنطق: العرض بيستنى موافقة،
   والفاتورة المبدئية بتستنى سداد. تذكير واحد بكلمتين مختلفتين. */
function actionOf(q) {
  const prf = isPrf(q)
  if (q.status === 'draft')     return { id: 'send',    label: 'إرسال',        tone: 'go' }
  if (q.status === 'accepted')  return { id: 'convert', label: 'تحويل لفاتورة', tone: 'go' }
  if (q.status === 'sent')      return { id: 'remind',  label: prf ? 'تذكير بالسداد' : 'تذكير', tone: 'quiet' }
  if (q.status === 'expired')   return { id: 'renew',   label: 'تجديد', tone: 'quiet' }
  if (q.status === 'rejected')  return { id: 'revise',  label: 'نسخة معدّلة',   tone: 'quiet' }
  if (q.status === 'converted') return { id: 'goinv',   label: 'فتح الفاتورة',  tone: 'quiet' }
  return null
}

/* الرمز بيظهر في كروت الأرقام بس. في الصفوف مالوش لازمة —
   الصفحة معلنة العملة فوق، وتكراره ٢٠ مرة في عمود واحد ضوضاء. */
function Amount({ v, soft, sign }) {
  return (
    <span className={`amt${soft ? ' amt--soft' : ''}`}>
      <span className="amt__n">{fmtMoney(v).split('.')[0]}</span>
      {sign && <Riyal />}
    </span>
  )
}

function QState({ status }) {
  const s = STATUS[status] || STATUS.draft
  return <span className={`st st--${s.tone}`}>{s.label}</span>
}

/* ---------- الصف ---------- */
export function QRow({ q, selected, onSelect, onOpen, on }) {
  const act = actionOf(q)
  const soft = ['rejected', 'cancelled', 'expired'].includes(q.status)
  const d = daysFrom(q.valid)

  /* سطر المهلة — بيتكلم بس لما يكون فيه كلام مفيد */
  let sub = null, cls = ''
  if (q.status === 'sent' && d !== null) {
    if (d < 0) { sub = `انتهت مهلته`; cls = ' is-late' }
    else if (d === 0) { sub = 'ينتهي اليوم'; cls = ' is-soon' }
    else if (d <= 7) { sub = `ينتهي خلال ${d} يوم`; cls = ' is-soon' }
    else sub = fmtDate(q.valid)
  } else if (q.status === 'expired') {
    sub = `انتهى من ${Math.abs(d)} يوم`; cls = ' is-late'
  } else if (q.status === 'converted' && q.linked) {
    sub = q.linked
  } else if (q.status === 'accepted') {
    sub = 'ينتظر التحويل'; cls = ' is-soon'
  }

  return (
    <div className={`row${selected ? ' is-sel' : ''}`} data-component="QuoteRow"
      role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? (e) => { if (!e.target.closest('button,input,label')) onOpen() } : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter') onOpen() } : undefined}>
      <span className="row__cb"><Checkbox checked={selected} onChange={onSelect} /></span>

      <span className="row__party">
        <b>{q.c.ar}</b>
        <span className="row__doc">{q.no} · {qKindAr(q)}</span>
      </span>

      <span className="row__mid">
        <span className="row__st"><QState status={q.status} /></span>
        <span className={`row__due${cls}`}>{sub}</span>
      </span>

      <span className="row__amt">
        <Amount v={q.total} soft={soft} />
      </span>

      <span className="row__act">
        {act && (
          <button className={`act act--${act.tone}`} onClick={() => on?.(act.id, q)}>
            {act.label}
          </button>
        )}
        <RowMenu label={`خيارات ${q.no}`} items={[
          { label: isPrf(q) ? 'عرض المستند' : 'عرض العرض', Ic: Ico.search, onClick: onOpen },
          { sep: true },
          { label: 'تنزيل PDF', Ic: Ico.download, onClick: () => on?.('pdf', q) },
          { label: 'طباعة',     Ic: Ico.print, onClick: () => on?.('print', q) },
          { label: 'إرسال بالبريد', Ic: Ico.send, onClick: () => on?.('mail', q) },
          { sep: true },
          { label: 'نسخة جديدة', Ic: Ico.copy, onClick: () => on?.('dup', q) },
          { label: isPrf(q) ? 'إلغاء المستند' : 'إلغاء العرض', Ic: Ico.close, tone: 'crit',
            onClick: () => on?.('cancel', q),
            off: ['converted','cancelled'].includes(q.status),
            why: q.status === 'converted' ? 'اتحوّل لفاتورة' : 'ملغي أصلًا' },
        ]} />
      </span>
    </div>
  )
}

export function QGroup({ group, rows, selected, onSelect, onOpen, on }) {
  if (!rows.length) return null
  /* قيمة المجموعة — بس للمجموعات اللي القيمة فيها معناها حاجة */
  const sum = rows.reduce((a, r) => a + r.total, 0)
  return (
    <section className={`grp grp--${group.id}`} data-component="QuoteGroup">
      <header className="grp__h">
        <h2 className="grp__t">{group.t}</h2>
        <span className="grp__note">{group.note}</span>
        <span className="grp__sum">
          <span className="grp__c">{rows.length}</span>
          {group.id !== 'done' && sum > 0 && (
            <span className="grp__owed">قيمتها <Amount v={sum} /></span>
          )}
        </span>
      </header>
      {rows.map((q) => (
        <QRow key={q.no} q={q} selected={selected.has(q.no)} onSelect={() => onSelect(q.no)}
          onOpen={onOpen ? () => onOpen(q.no) : undefined} on={on} />
      ))}
    </section>
  )
}

/* ---------- رأس الأرقام ----------
   الرقم اللي بيجاوب «المستندات دي رايحة على فين؟»:
   كام مستند، وقيمة اللي لسه شغّال، ونسبة القبول.

   ★ نسبة القبول بتتحسب على **العروض بس**. الفاتورة المبدئية
   مش بتتقبل ولا بتترفض — بتتدفع أو بتنتهي، فخلطها في النسبة
   كان هيدّي رقم مالوش معنى. */
export function QMoneyHead({ rows }) {
  const has = (st) => rows.filter((r) => st.includes(r.status))
  const sent      = has(['sent'])
  const accepted  = has(['accepted'])
  const draft     = has(['draft'])
  const converted = has(['converted'])
  const lost      = has(['rejected', 'expired', 'cancelled'])

  const openSum     = [...sent, ...accepted].reduce((a, r) => a + r.total, 0)
  const acceptedSum = accepted.reduce((a, r) => a + r.total, 0)
  const sentSum     = sent.reduce((a, r) => a + r.total, 0)

  /* نسبة القبول: اللي العميل ردّ عليه بموافقة من اللي ردّ عليه أصلًا */
  const quotes   = (l) => l.filter((r) => !isPrf(r))
  const answered = quotes([...accepted, ...converted, ...has(['rejected', 'expired'])])
  const won      = quotes([...accepted, ...converted])
  const rate     = answered.length ? Math.round((won.length / answered.length) * 100) : 0

  const prfN = rows.filter(isPrf).length
  const pc = (n, d) => (d ? (n / d) * 100 : 0)

  const SPLIT = [
    ['sent',      'var(--viz-attention)', () => sent,      'a', 'بانتظار الرد'],
    ['accepted',  'var(--viz-positive)',  () => accepted,  'p', 'مقبولة'],
    ['draft',     'var(--viz-neutral)',   () => draft,     'n', 'مسودة'],
    ['converted', 'var(--viz-info)',      () => converted, 'i', 'محوّلة'],
    ['lost',      'var(--viz-faint)',     () => lost,      'f', 'ما تمّتش'],
  ]

  return (
    <div className="ins" data-component="QuoteInsights">

      {/* ١ — العدد وتقسيمته */}
      <article className="ins__c">
        <span className="ins__lbl">المستندات هذه الفترة</span>
        <span className="ins__v">
          <span className="ins__n">{rows.length}</span>
          <em>{prfN ? `منها ${prfN} فاتورة مبدئية` : 'عرض'}</em>
        </span>
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

      {/* ٢ — القيمة اللي لسه شغّالة */}
      <article className="ins__c">
        <span className="ins__lbl">القيمة المفتوحة</span>
        <span className="ins__v"><Amount v={openSum} sign /></span>
        <span className="ins__bar">
          <i style={{ width: `${pc(acceptedSum, openSum)}%`, background: 'var(--viz-positive)' }} />
          <i style={{ width: `${pc(sentSum, openSum)}%`, background: 'var(--viz-attention)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="p" />مقبولة <Amount v={acceptedSum} sign /></b>
          <b><i data-c="a" />بانتظار الرد <Amount v={sentSum} sign /></b>
        </span>
      </article>

      {/* ٣ — نسبة القبول */}
      <article className="ins__c">
        <span className="ins__lbl">نسبة قبول العروض</span>
        <span className="ins__v"><span className="ins__n">{rate}</span><em>٪</em></span>
        <span className="ins__bar">
          <i style={{ width: `${rate}%`, background: 'var(--viz-positive)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="p" />{won.length} مقبول</b>
          <b><i data-c="f" />{answered.length - won.length} ما تمّش</b>
          {prfN > 0 && <b className="is-quiet">الفواتير المبدئية برّه الحساب</b>}
        </span>
      </article>
    </div>
  )
}

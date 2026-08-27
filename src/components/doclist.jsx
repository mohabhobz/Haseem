import { Ico, Riyal } from './icons.jsx'
import { Checkbox } from './primitives.jsx'
import { STATUS, fmtDate, fmtMoney, daysFrom } from '../lib/format.js'
import { RowMenu, docMenu } from './rowmenu.jsx'

/* ============================================================
   قائمة المستندات — شبكة واحدة ثابتة تمشي من أول الصفحة لآخرها.
   كل صف على نفس القضبان: عميل · حالة · الهيئة · الاستحقاق · المبلغ · أكشن.
   مفيش كروت جوه كروت، ومفيش تكرار للأولوية في كنترولين.
   ============================================================ */

/* ---------- أربع مجموعات بس — قاعدة الـ٤ ---------- */
export const GROUPS = [
  { id: 'act',    t: 'محتاج تصرّف',   note: 'مرفوضة من الهيئة · متأخرة · تستحق خلال أسبوع' },
  { id: 'live',   t: 'تحت التحصيل',   note: 'صادرة وفي مهلتها' },
  { id: 'draft',  t: 'مسودات',        note: 'لسه ما اتصدرتش' },
  { id: 'closed', t: 'مقفولة',        note: 'محصّلة أو ملغاة' },
]

export function groupOf(v) {
  if (v.zatca === 'bad') return 0
  if (v.status === 'overdue') return 0
  const d = daysFrom(v.due)
  if ((v.status === 'issued' || v.status === 'partial') && d !== null && d <= 7) return 0
  if (v.status === 'issued' || v.status === 'partial') return 1
  if (v.status === 'draft') return 2
  return 3
}

/* ---------- أكشن واحد، بيتحدد من حالة الصف ---------- */
function actionOf(v) {
  if (v.zatca === 'bad') return { label: 'إعادة الإرسال', tone: 'crit' }
  if (v.status === 'draft') return { label: 'إصدار', tone: 'go' }
  if (['overdue', 'partial', 'issued'].includes(v.status)) return { label: 'تسجيل دفعة', tone: 'go' }
  if (v.status === 'paid') return { label: 'إرسال', tone: 'quiet' }
  return null
}

/* ---------- مبلغ: الأرقام على محور واحد، الرمز جنبها ---------- */
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

/* ---------- حالة المستند: تاج ---------- */
function DocState({ status }) {
  const s = STATUS[status] || STATUS.draft
  return <span className={`st st--${s.tone}`}>{s.label}</span>
}

/* ---------- حالة الهيئة: تاج تابع، بيقف جنب حالة المستند مش في عمود لوحده.
   «مقبولة» هي الوضع الطبيعي — سكوت، عشان العين تشوف الاستثناء بس. ---------- */
function ZatcaState({ state, reason }) {
  if (!state || state === 'ok') return null
  const bad = state === 'bad'
  return (
    <span className={`zs${bad ? ' zs--bad' : ''}`} title={bad ? reason : 'في انتظار رد الهيئة'}>
      <i className="zs__box">{bad ? '!' : '\u22EF'}</i>
      {bad ? 'رفض الهيئة' : 'عند الهيئة'}
    </span>
  )
}

/* ---------- الصف ---------- */
export function Row({ v, selected, onSelect, onOpen }) {
  const rem = v.total - v.paid
  const live = ['issued', 'partial', 'overdue'].includes(v.status)
  const closed = ['paid', 'void', 'cancelled'].includes(v.status)
  const act = actionOf(v)
  const d = daysFrom(v.due)

  let due = null, lateCls = ''
  if (live && d !== null) {
    if (d < 0) { due = `متأخرة ${Math.abs(d)} يوم`; lateCls = ' is-late' }
    else if (d === 0) { due = 'تستحق النهاردة'; lateCls = ' is-soon' }
    else if (d <= 7) { due = `تستحق خلال ${d} يوم`; lateCls = ' is-soon' }
    else due = fmtDate(v.due)
  }

  return (
    <div className={`row${selected ? ' is-sel' : ''}`} data-component="DocRow"
      role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? (e) => { if (!e.target.closest('button,input,label')) onOpen() } : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter') onOpen() } : undefined}>
      <span className="row__cb"><Checkbox checked={selected} onChange={onSelect} /></span>

      <span className="row__party">
        <b>{v.c.ar}</b>
        <span className="row__doc">{v.no}</span>
      </span>

      {/* الوسط: الحالة (ومعاها الهيئة لو فيه مشكلة) + الاستحقاق */}
      <span className="row__mid">
        <span className="row__st">
          <DocState status={v.status} />
          <ZatcaState state={v.zatca} reason={v.zatcaReason} />
        </span>
        <span className={`row__due${lateCls}`}>{due}</span>
      </span>

      <span className="row__amt">
        <Amount v={v.total} soft={closed && v.status !== 'paid'} />
        {live && rem > 0 && rem < v.total && (
          <span className="row__rem">متبقّي <Amount v={rem} /></span>
        )}
      </span>

      <span className="row__act">
        {act && <button className={`act act--${act.tone}`}>{act.label}</button>}
        <RowMenu label={`خيارات ${v.no}`}
          items={[...docMenu({ zatca: v.zatca, onView: onOpen }),
            { sep: true },
            { label: 'إشعار دائن', Ic: Ico.retry,
              off: v.status === 'draft', why: 'الفاتورة لسه مسودة' },
            { label: 'إلغاء الفاتورة', Ic: Ico.close, tone: 'crit',
              off: ['cancelled','void'].includes(v.status), why: 'ملغاة أصلًا' },
          ]} />
      </span>
    </div>
  )
}

/* ---------- المجموعة: عنوان + خط، والصفوف على نفس شبكة الصفحة ---------- */
export function Group({ group, rows, selected, onSelect, onOpen }) {
  if (!rows.length) return null
  const owed = rows.reduce((a, r) =>
    ['issued', 'partial', 'overdue'].includes(r.status) ? a + (r.total - r.paid) : a, 0)
  return (
    <section className={`grp grp--${group.id}`} data-component="DocGroup">
      <header className="grp__h">
        <h2 className="grp__t">{group.t}</h2>
        <span className="grp__note">{group.note}</span>
        <span className="grp__sum">
          <span className="grp__c">{rows.length}</span>
          {owed > 0 && <span className="grp__owed">مستحق <Amount v={owed} /></span>}
        </span>
      </header>
      {rows.map((v) => (
        <Row key={v.no} v={v} selected={selected.has(v.no)} onSelect={() => onSelect(v.no)}
          onOpen={onOpen ? () => onOpen(v.no) : undefined} />
      ))}
    </section>
  )
}

/* ---------- رأس الأرقام — الرقم اللي بيجاوب «أنا كويس؟» ----------
   أكبر خط في الصفحة على الرقم الرئيسي، والباقي تابع له. */
export function MoneyHead({ rows }) {
  const has = (st) => rows.filter((r) => st.includes(r.status))
  const open   = has(['issued', 'partial', 'overdue'])
  const draft  = has(['draft'])
  const done   = has(['paid'])
  const closed = has(['cancelled', 'void'])

  const owed    = open.reduce((a, r) => a + (r.total - r.paid), 0)
  const late    = open.filter((r) => r.status === 'overdue')
  const lateSum = late.reduce((a, r) => a + (r.total - r.paid), 0)
  const onTime  = owed - lateSum

  /* نسبة التحصيل: اللي اتحصّل من اللي اتصدر فعلًا */
  const issued    = [...open, ...done]
  const issuedSum = issued.reduce((a, r) => a + r.total, 0)
  const paidSum   = issued.reduce((a, r) => a + r.paid, 0)
  const rate      = issuedSum ? Math.round((paidSum / issuedSum) * 100) : 0

  const pc = (n, d) => (d ? (n / d) * 100 : 0)

  const SPLIT = [
    ['open',   'var(--viz-attention)', () => open,   'a', 'مفتوحة'],
    ['draft',  'var(--viz-neutral)',   () => draft,  'n', 'مسودة'],
    ['done',   'var(--viz-positive)',  () => done,   'p', 'محصّلة'],
    ['closed', 'var(--viz-faint)',     () => closed, 'f', 'ملغاة'],
  ]

  return (
    <div className="ins" data-component="InvoiceInsights">

      {/* ١ — العدد وتقسيمته */}
      <article className="ins__c">
        <span className="ins__lbl">الفواتير هذه الفترة</span>
        <span className="ins__v"><span className="ins__n">{rows.length}</span><em>فاتورة</em></span>
        {/* الصفر مش معلومة — القسم اللي مفيهوش حاجة ما بيتعرضش أصلًا */}
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

      {/* ٢ — المستحق وتقسيمته */}
      <article className="ins__c">
        <span className="ins__lbl">المستحق لك</span>
        <span className="ins__v"><Amount v={owed} sign /></span>
        <span className="ins__bar">
          <i style={{ width: `${pc(lateSum, owed)}%`, background: 'var(--viz-attention)' }} />
          <i style={{ width: `${pc(onTime, owed)}%`, background: 'var(--viz-positive)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="a" />متأخر <Amount v={lateSum} sign /></b>
          <b><i data-c="p" />في مهلته <Amount v={onTime} sign /></b>
        </span>
      </article>

      {/* ٣ — التحصيل */}
      <article className="ins__c">
        <span className="ins__lbl">نسبة التحصيل</span>
        <span className="ins__v"><span className="ins__n">{rate}</span><em className="ins__pc">٪</em></span>
        <span className="ins__bar">
          <i style={{ width: `${rate}%`, background: 'var(--viz-positive)' }} />
        </span>
        <span className="ins__leg">
          <b><i data-c="p" />محصّل <Amount v={paidSum} sign /></b>
          <b className="is-quiet">من <Amount v={issuedSum} sign /> أصدرتها</b>
        </span>
      </article>
    </div>
  )
}

/* ---------- سطر التغييرات — سطر واحد، مش كارت ---------- */
export function ChangeLine({ items, onOpen }) {
  if (!items?.length) return null
  return (
    <p className="chline" data-component="ChangeLine">
      <b>{items.length} تغييرات</b> من آخر مرة دخلت
      <span className="chline__s">{items.join(' · ')}</span>
      <button onClick={onOpen}>عرضها</button>
    </p>
  )
}

const VIEWS = [
  { id: 'list',  label: 'قائمة', Ic: Ico.viewlist },
  { id: 'table', label: 'جدول',  Ic: Ico.viewtable },
]

export function ViewToggle({ value, onChange }) {
  return (
    <div className="vtog" role="group" aria-label="طريقة العرض" data-component="ViewToggle">
      {VIEWS.map((v) => (
        <button key={v.id} className={value === v.id ? 'on' : ''}
          aria-pressed={value === v.id} aria-label={v.label} title={v.label}
          onClick={() => onChange(v.id)}><v.Ic size={17} /></button>
      ))}
    </div>
  )
}

export function JobLine({ label, done, total }) {
  return (
    <p className="jobline" data-component="JobLine">
      <span className="jobline__bar"><i style={{ width: `${Math.round((done / total) * 100)}%` }} /></span>
      {label} — <b>{done}</b> من <b>{total}</b>
      <span className="jobline__s">تقدر تكمّل شغلك، هنبلّغك أول ما تخلص</span>
    </p>
  )
}

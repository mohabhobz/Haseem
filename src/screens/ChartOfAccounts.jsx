import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip } from '../components/layout.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter } from '../components/pagefilter.jsx'
import { Modal } from '../components/modal.jsx'
import { toast } from '../components/feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   دليل الحسابات.

   في سيستم العميل الشجرة دي **بتظهر بلغتين**: عربي في فورم
   المصروف (`الصندوق الرئيسي`) وإنجليزي في دفتر الأستاذ
   (`Cash on hand`) — نفس الحساب باسمين حسب الشاشة اللي جاي منها.
   وفيها كمان `3000 - Share capital (legal-form templated)` —
   ملاحظة مطوّر متسرّبة للمستخدم.

   وأهم من اللغة: الشجرة عنده **قايمة مسطّحة** من ٥٦ حساب من غير
   تجميع، وعشان كده فورم المصروف بيعرضهم كلهم فتقدر تقيّد مصروف
   على رأس المال.

   هنا:
   • **مجمّعة بالطبيعة** — أصول · التزامات · حقوق ملكية · إيرادات
     · تكلفة · مصروفات، وكل مجموعة بإجماليها.
   • **الرصيد جنب كل حساب** متحسب من الدفتر، وبيقول مدين ولا دائن.
   • **«اتستخدم في كام قيد»** — الحساب اللي ما اتحركش عمره يبان،
     ودي أول خطوة لتنضيف شجرة فيها حسابات تجارب.
   ============================================================ */

const GROUPS = [
  { id: 'asset',     ar: 'الأصول',          note: 'اللي المنشأة تملكه', dr: true },
  { id: 'liability', ar: 'الالتزامات',      note: 'اللي على المنشأة للغير', dr: false },
  { id: 'equity',    ar: 'حقوق الملكية',    note: 'حق الملاك بعد سداد الالتزامات', dr: false },
  { id: 'revenue',   ar: 'الإيرادات',       note: 'اللي المنشأة بتكسبه', dr: false },
  { id: 'cogs',      ar: 'تكلفة الإيراد',   note: 'تكلفة اللي اتباع', dr: true },
  { id: 'expense',   ar: 'المصروفات',       note: 'مصروفات التشغيل', dr: true },
]

const FGROUPS = [
  {
    id: 'used', label: 'الاستخدام',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'yes',  label: 'عليه حركة',  test: (a) => a.n > 0 },
      { id: 'no',   label: 'ما اتحركش',  test: (a) => a.n === 0 },
    ],
  },
  {
    id: 'nat', label: 'الطبيعة',
    options: [
      { id: 'all', label: 'الكل' },
      ...GROUPS.map((g) => ({ id: g.id, label: g.ar, test: (a) => a.type === g.id })),
    ],
  },
]

export default function ChartOfAccounts() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [form, setForm] = useState(false)

  const rows = useMemo(() => {
    const ps = R.postings(null, DATA.TODAY)
    const hit = {}
    ps.forEach((l) => { hit[l.acc] = (hit[l.acc] || 0) + 1 })
    return DATA.accounts.map((a) => ({
      ...a,
      label: DATA.accLabel(a),
      n: hit[a.id] || 0,
      bal: R.balanceOf(a.id, DATA.TODAY),
    }))
  }, [])

  const shown = useMemo(
    () => applyFilter(rows, FGROUPS, filter, q, (a) => [a.id, a.label]),
    [rows, filter, q])

  const grouped = GROUPS.map((g) => {
    const list = shown.filter((a) => a.type === g.id)
    const total = list.reduce((s, a) => s + (g.dr ? a.bal : -a.bal), 0)
    return { ...g, list, total: +total.toFixed(2) }
  }).filter((g) => g.list.length > 0)

  const idle = rows.filter((a) => a.n === 0).length

  return (
    <AppShell search="ابحث برقم الحساب أو اسمه…">
      <div className="tophead">
        <PageHeader title="دليل الحسابات"
          sub={<>شجرة الحسابات اللي كل قيد في السيستم بيتكتب عليها<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="دفتر الأستاذ" variant="outline"
            onClick={() => nav('/accounting/ledger')} />
          <Button label="حساب جديد" variant="primary" icon="＋"
            onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label="عدد الحسابات"
        value={rows.length} money={false} unit="حساب"
        note="مجمّعة بالطبيعة — الحساب بياخد قيود من نوعه بس"
        items={[
          { label: 'عليها حركة', value: String(rows.length - idle), money: false },
          { label: 'ما اتحركتش ولا مرة', value: String(idle), money: false, alert: idle > 0 },
        ]}
      />

      <section className="sect" data-component="ChartOfAccounts">
        <header className="sect__h">
          <h2 className="sect__t">الحسابات<span className="sect__n">{shown.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الرقم أو الاسم…" width={250} value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={shown.length} total={rows.length} />

        {grouped.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش حسابات بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو امسح البحث.</span>
          </div>
        ) : grouped.map((g) => (
          <div key={g.id} className="coa">
            <header className="coa__h">
              <h3 className="coa__t">{g.ar}</h3>
              <span className="coa__note">{g.note}</span>
              <span className="coa__sum">
                <span className="coa__c">{g.list.length}</span>
                <b><SAR v={g.total} /></b>
              </span>
            </header>
            <ul className="coa__list">
              {g.list.map((a) => {
                const natural = g.dr ? a.bal >= 0 : a.bal <= 0
                return (
                  <li key={a.id} className={a.n === 0 ? 'is-idle' : ''}
                    role="button" tabIndex={0}
                    onClick={() => nav(`/accounting/ledger?acc=${a.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') nav(`/accounting/ledger?acc=${a.id}`) }}>
                    <span className="coa__no num">{a.id}</span>
                    <span className="coa__n">
                      <b>{a.label}</b>
                      <em>{a.n > 0 ? `${a.n} حركة` : 'ما اتحركش ولا مرة'}</em>
                    </span>
                    <span className={`coa__side${natural ? '' : ' is-odd'}`}>
                      {a.bal === 0 ? '—' : (a.bal > 0 ? 'مدين' : 'دائن')}
                    </span>
                    <span className="coa__bal"><SAR v={Math.abs(a.bal)} dec /></span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <p className="fnote fnote--quiet">
          الرصيد جنب كل حساب متحسب من <b>دفتر اليومية</b> لحد النهارده — مش
          مخزّن. والحساب اللي طبيعته مدين وظهر دائن (أو العكس) بيتعلّم، لأنها
          غالبًا غلطة تقييد مش رصيد حقيقي.
        </p>
      </section>

      {form && <LedgerAccountForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}

/* ---------- حساب جديد في الشجرة ---------- */
function LedgerAccountForm({ onClose }) {
  const [ar, setAr] = useState('')
  const [type, setType] = useState('expense')
  const [id, setId] = useState('')
  const [touched, setTouched] = useState(false)

  const taken = DATA.accounts.some((a) => a.id === id.trim())
  const bad = !ar.trim() || !/^\d{4}$/.test(id.trim()) || taken

  const save = () => {
    setTouched(true)
    if (bad) {
      toast.bad('الحساب ناقص', {
        sub: taken ? 'الرقم ده متاخد' : 'الاسم ورقم من ٤ خانات لازمين' })
      return
    }
    /* API: POST /accounting/accounts → { id, ar, type } */
    toast.ok(`${id} — ${ar} اتضاف`, { sub: 'جاهز يستقبل قيود من نوعه' })
    onClose()
  }

  return (
    <Modal title="حساب جديد" sub="حساب في الشجرة — طبيعته بتحدد مكانه في التقارير"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>إنشاء الحساب</button>
        </>
      }>
      <div className="fld">
        <span className="fld__l">الطبيعة</span>
        <div className="pick">
          {GROUPS.map((g) => (
            <button key={g.id} className={`pick__o${type === g.id ? ' is-on' : ''}`}
              onClick={() => setType(g.id)} aria-pressed={type === g.id}>
              <b>{g.ar}</b><em>{g.note}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">اسم الحساب</span>
          <input className={`fld__i${touched && !ar.trim() ? ' is-bad' : ''}`} value={ar}
            placeholder="مصاريف ضيافة" onChange={(e) => setAr(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">رقم الحساب</span>
          <input className={`fld__i num${touched && (taken || !/^\d{4}$/.test(id.trim())) ? ' is-bad' : ''}`}
            value={id} placeholder="5160" inputMode="numeric"
            onChange={(e) => setId(e.target.value)} />
          {taken
            ? <em className="fld__e">الرقم ده متاخد بالفعل</em>
            : <em className="fld__h">٤ خانات — الأصول تبدأ ١ والالتزامات ٢ والمصروفات ٥</em>}
        </label>
      </div>

      <p className="fnote fnote--quiet">
        الطبيعة مش تصنيف شكلي: هي اللي بتحدد الحساب يبان في <b>الميزانية</b> ولا في
        <b> قائمة الدخل</b>، وبتحدد الفورمات اللي هتعرضه.
      </p>
    </Modal>
  )
}

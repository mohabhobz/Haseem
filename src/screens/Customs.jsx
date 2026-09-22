import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip } from '../components/layout.jsx'
import { DataTable } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, SAR, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { Modal } from '../components/modal.jsx'
import { useSort, byDate, byNum } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney } from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   البيانات الجمركية.

   دي أنضف شاشة في سيستم العميل من ناحية الكلام — التلميحات
   مكتوبة صح («انقل الأرقام كما وردت في البيان الجمركي، لا كما
   وردت في فاتورة المورد») والوعاء بيتحسب لوحده.

   المشكلة الوحيدة إن الشاشة نفسها **فاضية**: تلات كروت وجملة
   «لا توجد بيانات جمركية بعد». وكل الشرح مدفون جوّه المودال —
   يعني اللي مش فاتح المودال مش هيعرف الشاشة دي بتعمل إيه ولا
   إمتى يحتاجها.

   هنا الشرح طلع برّا: الشاشة الفاضية بتقول **مين محتاج البيان
   ده وإمتى**، والصف بيوضّح إن الوعاء ≠ فاتورة المورد.
   ============================================================ */

export default function Customs() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)

  const all = useDocs('customs').filter((d) => !d.deleted)

  const S = useSort({
    date: byDate('date'),
    base: (a, b) => DATA.customsBase(a) - DATA.customsBase(b),
    vat:  (a, b) => DATA.customsVat(a) - DATA.customsVat(b),
  }, 'date')

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const f = !s ? all : all.filter((d) =>
      [d.no, d.decl, d.port, d.sadad, DATA.supplierOf(d.s)?.ar]
        .some((x) => String(x || '').toLowerCase().includes(s)))
    return S.apply(f)
  }, [all, q, S.sort])

  const posted = rows.filter((d) => d.status === 'posted')
  const sum = {
    vat: posted.reduce((a, d) => a + DATA.customsVat(d), 0),
    base: posted.reduce((a, d) => a + DATA.customsBase(d), 0),
    duty: posted.reduce((a, d) => a + d.duty, 0),
    drafts: rows.filter((d) => d.status === 'draft').length,
  }

  const tableRows = rows.map((d) => ({
    key: d.no,
    openLabel: 'تعديل', onOpen: () => setForm(d),
    action: d.status === 'draft'
      ? { label: 'ترحيل', tone: 'go', onClick: () => ACT.postCustoms(d, fmtMoney(DATA.customsVat(d))) }
      : null,
    menu: [
      { label: 'فتح البيان', Ic: Ico.search, onClick: () => setForm(d) },
      { label: 'ترحيل البيان', Ic: Ico.check,
        onClick: () => ACT.postCustoms(d, fmtMoney(DATA.customsVat(d))),
        off: d.status !== 'draft', why: 'البيان مُرحَّل خلاص' },
    ],
    cells: [
      <span className="itcell">
        <b className="num">{d.decl || <em className="hint">من غير رقم بيان</em>}</b>
        <em>{d.port || 'منفذ غير محدد'}</em>
      </span>,

      <span>{fmtDate(d.date)}</span>,

      d.s
        ? <button className="cell-doc cell-doc--link"
            onClick={(e) => { e.stopPropagation(); nav(`/purchases/suppliers/${d.s}`) }}>
            {DATA.supplierOf(d.s)?.ar}
          </button>
        : <span className="hint">مش مربوط</span>,

      <StatusCell status={d.status} />,

      <span className="netvat">
        <b><Money value={DATA.customsBase(d)} /></b>
        <em>سيف {fmtMoney(d.cif)} + رسوم {fmtMoney(d.duty)}</em>
      </span>,

      <span className="netvat">
        <b><Money value={DATA.customsVat(d)} /></b>
        <em>{Math.round(d.rate * 100)}٪ · الخانة ٨</em>
      </span>,
    ],
  }))

  const col = S.col

  return (
    <AppShell search="ابحث برقم البيان أو المنفذ…">
      <div className="tophead">
        <PageHeader title="البيانات الجمركية"
          sub={<>ضريبة الاستيراد اللي بتغذّي الخانة ٨ من الإقرار<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', 'customs', rows.map((d) => d.no))} />
          <Button label="إنشاء بيان جمركي" variant="primary" icon="＋" onClick={() => setForm('new')} />
        </div>
      </div>

      <SummaryStrip
        label="ضريبة الاستيراد المسجّلة"
        value={sum.vat}
        note={`من ${posted.length} بيان مُرحَّل — دي اللي بتدخل الخانة ٨`}
        items={[
          { label: 'وعاء الضريبة', value: sum.base },
          { label: 'الرسوم الجمركية', value: sum.duty },
          { label: 'مسودات', value: String(sum.drafts), money: false, alert: sum.drafts > 0 },
        ]}
      />

      <section className="sect" data-component="CustomsTable">
        <header className="sect__h">
          <h2 className="sect__t">البيانات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="رقم البيان أو المنفذ أو مرجع السداد…" width={280}
              value={q} onChange={setQ} />
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="sect__empty sect__empty--tall">
            <b>مفيش بيانات جمركية</b>
            <span>
              الشاشة دي بتلزمك لما تستورد بضاعة من برّا السعودية. الجمارك بتقدّر قيمة
              الشحنة وتحسب عليها ضريبة — والرقم ده <b>مش</b> اللي في فاتورة المورد،
              وبتاخده من المخلّص الجمركي أو من منصة فسح.
            </span>
            <Button label="سجّل أول بيان" variant="primary" onClick={() => setForm('new')} />
          </div>
        ) : (
          <DataTable
            columns={[
              { label: 'رقم البيان والمنفذ' },
              col('التاريخ', 'date', { width: '124px' }),
              { label: 'المورد', width: '180px' },
              { label: 'الحالة', width: '124px' },
              col('وعاء الضريبة', 'base', { num: true, width: '200px' }),
              col('ضريبة الاستيراد', 'vat', { num: true, width: '176px' }),
            ]}
            rows={tableRows}
          />
        )}

        <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
          الوعاء = <b>القيمة الجمركية (سيف) + الرسوم الجمركية</b>. إجمالي فاتورة المورد
          ما بيدخلش أي خانة في الإقرار — البيان الجمركي هو المصدر.
        </p>
      </section>

      {form && <CustomsForm d={form === 'new' ? null : form} onClose={() => setForm(null)} />}
    </AppShell>
  )
}

/* ---------- فورم البيان ---------- */
function CustomsForm({ d, onClose }) {
  const edit = !!d
  const readOnly = d?.status === 'posted'
  const [decl, setDecl]   = useState(d?.decl || '')
  const [date, setDate]   = useState(d?.date || DATA.TODAY)
  const [port, setPort]   = useState(d?.port || '')
  const [sup, setSup]     = useState(d?.s || '')
  const [cif, setCif]     = useState(String(d?.cif ?? ''))
  const [duty, setDuty]   = useState(String(d?.duty ?? 0))
  const [rate, setRate]   = useState(String(d?.rate ?? 0.15))
  const [sadad, setSadad] = useState(d?.sadad || '')
  const [links, setLinks] = useState(d?.bills || [])
  const [tried, setTried] = useState(false)

  const c = Number(cif) || 0, du = Number(duty) || 0, r = Number(rate) || 0
  const base = +(c + du).toFixed(2)
  const vat = +(base * r).toFixed(2)

  const errs = {
    decl: !decl.trim() ? 'رقم البيان مطلوب — هو المرجع عند الهيئة' : null,
    cif: c <= 0 ? 'القيمة الجمركية مطلوبة' : null,
  }
  const show = (k) => (tried ? errs[k] : null)
  const bad = Object.values(errs).some(Boolean)

  const openBills = DATA.bills.filter((b) => b.status !== 'cancelled')

  const save = async () => {
    setTried(true)
    if (bad) return
    const ok = await ACT.saveCustoms({ no: d?.no || 'CD-جديد', decl }, edit)
    if (ok) onClose()
  }

  return (
    <Modal
      title={readOnly ? `البيان ${d.decl || d.no}` : edit ? `تعديل ${d.no}` : 'بيان جمركي جديد'}
      sub="انقل الأرقام زي ما هي في البيان الجمركي — مش زي ما هي في فاتورة المورد."
      onClose={onClose} wide
      footer={readOnly ? (
        <button className="btn btn--ghost" onClick={onClose}>إغلاق</button>
      ) : (
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          {edit && (
            <button className="btn btn--outline"
              onClick={() => ACT.postCustoms(d, fmtMoney(vat)).then((ok) => ok && onClose())}>
              ترحيل البيان
            </button>
          )}
          <button className="btn btn--primary" onClick={save}>
            {edit ? 'حفظ التعديلات' : 'حفظ البيان'}
          </button>
        </>
      )}>

      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">رقم البيان</span>
          <input className={`fld__i num${show('decl') ? ' is-bad' : ''}`} value={decl} disabled={readOnly}
            dir="ltr" onChange={(e) => setDecl(e.target.value)} placeholder="20260812-4471" />
          {show('decl')
            ? <em className="fld__e">{show('decl')}</em>
            : <em className="fld__h">الرقم المدوّن على البيان الجمركي.</em>}
        </label>
        <DateField label="تاريخ البيان" value={date} onChange={setDate} disabled={readOnly} />
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">منفذ الدخول</span>
          <input className="fld__i" value={port} disabled={readOnly}
            onChange={(e) => setPort(e.target.value)} placeholder="ميناء جدة الإسلامي" />
        </label>
        <label className="fld">
          <span className="fld__l">المورد <em>اختياري</em></span>
          <Select className="fld__i" value={sup} disabled={readOnly}
            onChange={(e) => setSup(e.target.value)}>
            <option value="">مش مربوط بمورد</option>
            {DATA.suppliers.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
          </Select>
          <em className="fld__h">للربط مع سجل المورد بس — مش بيأثر على الأرقام.</em>
        </label>
      </div>

      <h3 className="fsub" style={{ marginTop: 20 }}>وعاء ضريبة الاستيراد</h3>
      <p className="fsub__h">
        الوعاء هو <b>القيمة الجمركية المقدّرة (سيف) + الرسوم الجمركية</b>.
        إجمالي فاتورة المورد ما بيدخلش أي خانة من الإقرار.
      </p>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">القيمة الجمركية (سيف)</span>
          <input className={`fld__i num${show('cif') ? ' is-bad' : ''}`} type="number" step="0.01"
            value={cif} disabled={readOnly} onChange={(e) => setCif(e.target.value)} />
          {show('cif')
            ? <em className="fld__e">{show('cif')}</em>
            : <em className="fld__h">زي ما قدّرتها الجمارك السعودية — مش إجمالي فاتورة المورد.</em>}
        </label>
        <label className="fld">
          <span className="fld__l">الرسوم الجمركية</span>
          <input className="fld__i num" type="number" step="0.01" value={duty} disabled={readOnly}
            onChange={(e) => setDuty(e.target.value)} />
          <em className="fld__h">الرسوم المحتسبة على البيان.</em>
        </label>
      </div>

      {/* الحساب قدام المستخدم — رقمين مدخلين وتلاتة متحسبين */}
      <div className="calcbox">
        <div className="calcbox__r">
          <span>القيمة الجمركية</span><b className="num">{fmtMoney(c)}</b>
        </div>
        <div className="calcbox__r">
          <span>+ الرسوم الجمركية</span><b className="num">{fmtMoney(du)}</b>
        </div>
        <div className="calcbox__r calcbox__r--sum">
          <span>= وعاء الضريبة</span><b className="num">{fmtMoney(base)}</b>
        </div>
        <div className="calcbox__r calcbox__r--big">
          <span>× {Math.round(r * 100)}٪ = ضريبة الاستيراد</span>
          <b><SAR v={vat} dec /></b>
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">نسبة الضريبة</span>
          <Select className="fld__i" value={rate} disabled={readOnly}
            onChange={(e) => setRate(e.target.value)}>
            <option value="0.15">١٥٪</option>
            <option value="0">٠٪</option>
          </Select>
          <em className="fld__h">ضريبة الاستيراد إما ١٥٪ أو صفر.</em>
        </label>
        <label className="fld">
          <span className="fld__l">مرجع سداد <em>اختياري</em></span>
          <input className="fld__i num" value={sadad} disabled={readOnly} dir="ltr"
            onChange={(e) => setSadad(e.target.value)} placeholder="SD-…" />
          <em className="fld__h">رقم السداد اللي دُفعت بيه الضريبة عند التخليص.</em>
        </label>
      </div>

      <h3 className="fsub" style={{ marginTop: 20 }}>الفواتير المرتبطة</h3>
      <p className="fsub__h">اربط فواتير المورد اللي تخص الشحنة دي. اختياري — للتتبع بس.</p>
      <ul className="linklist">
        {openBills.slice(0, 6).map((b) => {
          const on = links.includes(b.no)
          return (
            <li key={b.no}>
              <button className={`linklist__b${on ? ' on' : ''}`} disabled={readOnly}
                onClick={() => setLinks(on ? links.filter((x) => x !== b.no) : [...links, b.no])}>
                <span className="linklist__n">
                  <b className="num">{b.no}</b>
                  <em>{b.s.ar}</em>
                </span>
                <span className="num"><SAR v={b.total} /></span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

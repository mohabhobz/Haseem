import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, Pagination } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byText } from '../components/pagefilter.jsx'
import { fmtDate } from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   الموردون.

   دي أفقر شاشة في سيستم العميل: بحث بس، والصف بيقول الاسم
   والبريد والنوع. **مش بيقول الرصيد** — يعني السؤال الوحيد اللي
   بتفتح الشاشة عشانه («أنا مديون لمين؟») مالوش إجابة إلا لو فتحت
   كشف كل مورد لوحده.

   والداتا عنده فيها موردين مكرّرين — `Riyadh Steel & Rebar` تلات
   مرات و`Google` مرتين — لأن مفيش أي منع تكرار.

   هنا: **الرصيد عمود** ورقم فوق، والمكرّر بيتمنع على الاسم والرقم
   الضريبي في الفورم نفسه.
   ============================================================ */

const TABS = [
  { id: 'all',  label: 'كل الموردين', test: () => true },
  { id: 'due',  label: 'عليّ لهم فلوس', test: (s) => DATA.supplierBalance(s.id) > 0.009 },
  { id: 'late', label: 'عندهم متأخر',   test: (s) => DATA.billsOf(s.id).some((b) => DATA.isLate(b)) },
  { id: 'vat',  label: 'مش مسجّلين ضريبيًا', test: (s) => !s.vat },
]

const CITIES = [...new Set(DATA.suppliers.map((s) => s.city).filter(Boolean))]
const CATS = [...new Set(DATA.suppliers.map((s) => s.cat).filter(Boolean))]

const FGROUPS = [
  {
    id: 'type', label: 'النوع',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'company', label: 'شركة', test: (s) => s.type === 'company' },
      { id: 'person',  label: 'فرد',  test: (s) => s.type === 'person' },
    ],
  },
  {
    id: 'city', label: 'المدينة',
    options: [{ id: 'all', label: 'الكل' },
      ...CITIES.map((c) => ({ id: c, label: c, test: (s) => s.city === c }))],
  },
  {
    id: 'cat', label: 'مجال التوريد',
    options: [{ id: 'all', label: 'الكل' },
      ...CATS.map((c) => ({ id: c, label: c, test: (s) => s.cat === c }))],
  },
  {
    id: 'bal', label: 'الرصيد',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'open', label: 'عليه رصيد', test: (s) => DATA.supplierBalance(s.id) > 0.009 },
      { id: 'zero', label: 'مقفول',     test: (s) => DATA.supplierBalance(s.id) <= 0.009 },
    ],
  },
]

const supText = (s) => [s.ar, s.en, s.id, s.vat, s.cr, s.email, s.phone, s.city]
const PER_PAGE = 12

export default function Suppliers() {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(null)   // null | 'new' | supplier
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = useDocs('suppliers').filter((s) => !s.deleted)

  const S = useSort({
    name: byText('ar'),
    bal:  (a, b) => DATA.supplierBalance(a.id) - DATA.supplierBalance(b.id),
    docs: (a, b) => DATA.billsOf(a.id).length - DATA.billsOf(b.id).length,
    last: (a, b) => String(DATA.lastBuy(a.id)?.date || '').localeCompare(String(DATA.lastBuy(b.id)?.date || '')),
  }, 'bal')

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])
  const inTab = useMemo(() => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])
  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, supText)),
    [inTab, filter, q, S.sort])

  const sum = useMemo(() => ({
    total: rows.reduce((a, s) => a + DATA.supplierBalance(s.id), 0),
    open:  rows.filter((s) => DATA.supplierBalance(s.id) > 0.009).length,
    late:  rows.filter((s) => DATA.billsOf(s.id).some((b) => DATA.isLate(b))).length,
  }), [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const open = (id) => nav(`/purchases/suppliers/${id}`)

  const tableRows = shown.map((s) => {
    const bal = DATA.supplierBalance(s.id)
    const bills = DATA.billsOf(s.id)
    const lateN = bills.filter((b) => DATA.isLate(b)).length
    const last = DATA.lastBuy(s.id)
    return {
      key: s.id,
      onOpen: () => open(s.id),
      action: bal > 0.009 ? { label: 'الفواتير', tone: 'go',
        onClick: () => nav(`/purchases/bills?sup=${s.id}&tab=unpaid`) } : null,
      menu: [
        { label: 'فتح المورد', Ic: Ico.search, onClick: () => open(s.id) },
        { label: 'كشف الحساب', Ic: Ico.ledger, onClick: () => nav(`/purchases/suppliers/${s.id}?tab=ledger`) },
        { label: 'تعديل البيانات', Ic: Ico.edit, onClick: () => setForm(s) },
        { sep: true },
        { label: 'فاتورة مشتريات جديدة', Ic: Ico.plus, onClick: () => nav('/purchases/bills/new') },
        { label: 'أمر شراء جديد', Ic: Ico.plus, onClick: () => nav('/purchases/orders/new') },
        { sep: true },
        { label: 'حذف المورد', Ic: Ico.trash, tone: 'crit',
          onClick: () => ACT.deleteSupplier(s, bills.length) },
      ],
      cells: [
        <span className="itcell">
          <b>{s.ar}</b>
          <em className="num">{s.id}{s.en ? ` · ${s.en}` : ''}</em>
        </span>,

        <span className={`kind kind--${s.type === 'company' ? 'product' : 'service'}`}>
          {s.type === 'company' ? 'شركة' : 'فرد'}
        </span>,

        s.vat
          ? <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{s.vat}</span>
          : <span className="hint">غير مسجّل</span>,

        <span className="dcell">
          {s.city}
          <em>{s.terms || 'من غير شروط سداد'}</em>
        </span>,

        <span className="dcell">
          {bills.length ? `${bills.length} فاتورة` : <span className="hint">مفيش فواتير</span>}
          {last && <em>آخر شرا {fmtDate(last.date)}</em>}
        </span>,

        bal > 0.009
          ? <span className={`balcell${lateN ? ' is-late' : ''}`}>
              <b><Money value={bal} /></b>
              {lateN > 0 && <em>{lateN} فاتورة متأخرة</em>}
            </span>
          : <span className="hint">مقفول</span>,
      ],
    }
  })

  const col = S.col

  return (
    <AppShell search="ابحث بالاسم أو الرمز أو الرقم الضريبي…">
      <div className="tophead">
        <PageHeader title="الموردون"
          sub={<>مين بتشتري منه، وعليك له كام<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', 'suppliers', rows.map((s) => s.id))} />
          <Button label="إنشاء مورد" variant="primary" icon="＋" onClick={() => setForm('new')} />
        </div>
      </div>

      <SummaryStrip
        label="إجمالي المستحق للموردين"
        value={sum.total}
        note={`${sum.open} مورد عليه رصيد من ${rows.length}`}
        items={[
          { label: 'عندهم فواتير متأخرة', value: String(sum.late), money: false, alert: sum.late > 0 },
          { label: 'إجمالي الموردين', value: String(rows.length), money: false },
          { label: 'مش مسجّلين ضريبيًا', value: String(rows.filter((s) => !s.vat).length), money: false },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="SuppliersTable">
        <header className="sect__h">
          <h2 className="sect__t">الموردون<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الاسم أو الرمز أو الرقم الضريبي…" width={280}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش موردين بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('المورد', 'name'),
                { label: 'النوع', width: '78px' },
                { label: 'الرقم الضريبي', width: '148px' },
                { label: 'المدينة والشروط', width: '176px' },
                col('التعامل', 'docs', { width: '160px' }),
                col('الرصيد عليك', 'bal', { num: true, width: '156px' }),
              ]}
              rows={tableRows}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      {form && (
        <SupplierForm
          s={form === 'new' ? null : form}
          all={all}
          onClose={() => setForm(null)}
        />
      )}
    </AppShell>
  )
}

/* ============================================================
   فورم المورد.

   في سيستم العميل عنوان المودال **`Add Supplier`** بالإنجليزي جوّه
   واجهة عربية، ومفيش أي تحقق على الرقم الضريبي ولا منع تكرار.

   هنا: نفس حقوله، + تحقق الرقم الضريبي (١٥ رقم تبدأ وتنتهي بـ٣)،
   + **منع التكرار** على الاسم والرقم الضريبي — وده اللي كان هيمنع
   `Riyadh Steel & Rebar` من إنه يتسجّل تلات مرات.
   ============================================================ */
const CITIES_SA = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الخبر', 'الطائف', 'أبها', 'تبوك', 'الخرج', 'بريدة']

function SupplierForm({ s, all, onClose }) {
  const edit = !!s
  const [type, setType]   = useState(s?.type || 'company')
  const [ar, setAr]       = useState(s?.ar || '')
  const [en, setEn]       = useState(s?.en || '')
  const [showEn, setEnOn] = useState(!!s?.en)
  const [id, setId]       = useState(s?.id || `SUP-${Math.floor(1000 + Math.random() * 9000)}`)
  const [vat, setVat]     = useState(s?.vat || '')
  const [cr, setCr]       = useState(s?.cr || '')
  const [city, setCity]   = useState(s?.city || 'الرياض')
  const [phone, setPhone] = useState(s?.phone || '')
  const [email, setEmail] = useState(s?.email || '')
  const [terms, setTerms] = useState(s?.terms || 'صافي 30 يوم')
  const [openBal, setOpen] = useState(String(s?.open ?? 0))
  const [cat, setCat]     = useState(s?.cat || '')
  const [note, setNote]   = useState(s?.note || '')
  const [tried, setTried] = useState(false)

  const others = all.filter((x) => x.id !== s?.id)
  const dupName = ar.trim() && others.some((x) => x.ar.trim() === ar.trim())
  const dupVat  = vat.trim() && others.some((x) => x.vat && x.vat === vat.trim())
  const vatBad  = vat && !/^3\d{13}3$/.test(vat)

  const errs = {
    ar: !ar.trim() ? 'اسم المورد مطلوب' : dupName ? 'فيه مورد بنفس الاسم بالظبط — راجعه قبل ما تضيف تاني' : null,
    vat: vatBad ? 'الرقم الضريبي ١٥ رقم يبدأ بـ٣ وينتهي بـ٣'
       : dupVat ? 'الرقم الضريبي ده مسجّل على مورد تاني' : null,
    contact: !phone.trim() && !email.trim() ? 'محتاج وسيلة تواصل واحدة على الأقل' : null,
  }
  const show = (k) => (tried ? errs[k] : null)
  const bad = Object.values(errs).some(Boolean)

  const save = async () => {
    setTried(true)
    if (bad) return
    const ok = await ACT.saveSupplier({ ar, id }, edit)
    if (ok) onClose()
  }

  return (
    <Modal title={edit ? 'تعديل بيانات المورد' : 'مورد جديد'}
      sub={edit ? s.id : 'اللي بتشتري منه — بيظهر في فواتير المشتريات وأوامر الشراء.'}
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            {edit ? 'حفظ التعديلات' : 'إضافة المورد'}
          </button>
        </>
      }>
      <div className="fld">
        <span className="fld__l">نوع المورد</span>
        <div className="segs segs--wide" role="group" aria-label="نوع المورد">
          <button className={type === 'company' ? 'on' : ''} onClick={() => setType('company')}>شركة</button>
          <button className={type === 'person' ? 'on' : ''} onClick={() => setType('person')}>فرد</button>
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">{type === 'company' ? 'اسم الشركة' : 'الاسم'}</span>
          <input className={`fld__i${show('ar') ? ' is-bad' : ''}`} value={ar}
            onChange={(e) => setAr(e.target.value)} placeholder="مصنع الرياض للحديد" />
          {show('ar')
            ? <em className="fld__e">{show('ar')}</em>
            : !showEn && (
              <button className="linkish" onClick={() => setEnOn(true)}>+ أضف الاسم بالإنجليزية</button>
            )}
        </label>
        <label className="fld">
          <span className="fld__l">رمز المورد</span>
          <input className="fld__i num" value={id} onChange={(e) => setId(e.target.value)} />
          <em className="fld__h">بيتولّد لوحده — عدّله لو عندك ترقيم خاص.</em>
        </label>
      </div>

      {showEn && (
        <label className="fld" style={{ marginTop: 12 }}>
          <span className="fld__l">الاسم بالإنجليزية</span>
          <input className="fld__i" value={en} dir="ltr"
            onChange={(e) => setEn(e.target.value)} placeholder="Riyadh Steel Factory" />
        </label>
      )}

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">الرقم الضريبي <em>لو مسجّل</em></span>
          <input className={`fld__i num${show('vat') ? ' is-bad' : ''}`} value={vat} dir="ltr"
            inputMode="numeric" maxLength={15}
            onChange={(e) => setVat(e.target.value.replace(/\D/g, ''))} placeholder="3XXXXXXXXXXXX3" />
          {show('vat')
            ? <em className="fld__e">{show('vat')}</em>
            : <em className="fld__h">{vat.length}/15 — لازم يكون صح عشان تخصم ضريبة مدخلات فاتورته.</em>}
        </label>
        <label className="fld">
          <span className="fld__l">السجل التجاري / الرقم الموحد</span>
          <input className="fld__i num" value={cr} dir="ltr"
            onChange={(e) => setCr(e.target.value)} />
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">الجوال</span>
          <input className={`fld__i num${show('contact') ? ' is-bad' : ''}`} value={phone} dir="ltr"
            onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
        </label>
        <label className="fld">
          <span className="fld__l">البريد الإلكتروني</span>
          <input className={`fld__i${show('contact') ? ' is-bad' : ''}`} value={email} dir="ltr" type="email"
            onChange={(e) => setEmail(e.target.value)} placeholder="orders@supplier.sa" />
        </label>
      </div>
      {show('contact') && <em className="fld__e">{show('contact')}</em>}
      {!show('contact') && (
        <em className="fld__h">من غير وسيلة تواصل مش هتقدر تبعتله أمر شراء ولا كشف حساب.</em>
      )}

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">المدينة</span>
          <input className="fld__i" value={city} list="supcities"
            onChange={(e) => setCity(e.target.value)} />
          <datalist id="supcities">
            {CITIES_SA.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="fld">
          <span className="fld__l">مجال التوريد <em>اختياري</em></span>
          <input className="fld__i" value={cat} list="supcats"
            onChange={(e) => setCat(e.target.value)} placeholder="مواد بناء" />
          <datalist id="supcats">
            {CATS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">شروط السداد</span>
          <Select className="fld__i" value={terms} onChange={(e) => setTerms(e.target.value)}>
            {['عند الاستلام', 'صافي 10 أيام', 'صافي 15 يوم', 'صافي 30 يوم', 'صافي 45 يوم', 'صافي 60 يوم', 'سنوي مقدّم']
              .map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <em className="fld__h">منها بيتحسب تاريخ استحقاق فاتورته لوحده.</em>
        </label>
        <label className="fld">
          <span className="fld__l">الرصيد الافتتاحي</span>
          <input className="fld__i num" type="number" step="0.01" value={openBal}
            onChange={(e) => setOpen(e.target.value)} />
          <em className="fld__h">اللي عليك له قبل ما تبدأ تسجّل في حسيم.</em>
        </label>
      </div>

      <label className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">ملاحظات داخلية <em>اختياري</em></span>
        <textarea className="fld__i" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="مثلًا: التوصيل بياخد أسبوعين، أو التعامل مع أبو محمد." />
      </label>
    </Modal>
  )
}

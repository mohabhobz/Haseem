import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, fmtDate } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   إنشاء فاتورة مشتريات / أمر شراء.

   المستندين دول **نفس المستند تقريبًا**: مورد + بنود + تواريخ.
   الفرق حرفيًا حاجتين: أمر الشراء عنده «تاريخ متوقع» بدل
   «تاريخ استحقاق»، ومالوش «رقم مستند المورد» لأن المورد لسه
   ما بعتش حاجة. عشان كده شاشة واحدة بمفتاح، مش شاشتين.

   اللي زوّدناه على سيستم العميل:
   ١. **الحساب مفلتر على المصروفات** — عنده القايمة بتعرض شجرة
      الحسابات كلها فتقدر تحط بند شراء على حساب بنكي.
   ２. **الحساب بيتملّي لوحده** من نوع الصنف — منتج ← تكلفة بضاعة،
      خدمة ← مصروفات تشغيلية. أول قيمة صح بدل حقل فاضي.
   ٣. **تحذير سعر** — لو سعر البند بعيد عن آخر سعر اشتريت بيه من
      نفس المورد، بيقولك قبل ما تحفظ.
   ٤. **جاهزية المستند** في الرَّيل بدل ما تكتشف الناقص بعد الحفظ.
   ============================================================ */

const nextNo = (p) => `${p}-${Math.floor(100000 + Math.random() * 900000)}`
const addDays = (iso, n) => {
  const d = new Date(iso); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const termDays = (t) => {
  const m = /(\d+)/.exec(t || '')
  return m ? Number(m[1]) : 0
}

let seq = 0
const blank = () => ({ key: `l${++seq}`, sku: '', qty: '1', price: '', tax: 'S', acc: '5020' })

export default function BillNew({ mode = 'bill' }) {
  const nav = useNavigate()
  const { no: editNo } = useParams()
  const isPO = mode === 'po'
  const kind = isPO ? 'purchaseOrders' : 'bills'
  const src = useDoc(kind, editNo)

  const K = isPO
    ? { t: 'أمر شراء جديد', back: '/purchases/orders', backT: 'أوامر الشراء',
        go: 'حفظ الأمر', dateL: 'التاريخ المتوقع', prefix: 'PO' }
    : { t: 'فاتورة مشتريات جديدة', back: '/purchases/bills', backT: 'فواتير المشتريات',
        go: 'حفظ الفاتورة', dateL: 'تاريخ الاستحقاق', prefix: 'BL' }

  const [no, setNo]     = useState(src?.no || nextNo(K.prefix))
  const [sup, setSup]   = useState(src?.s?.id || '')
  const [ref, setRef]   = useState(src?.ref || '')
  const [date, setDate] = useState(src?.date || DATA.TODAY)
  const [due, setDue]   = useState(src?.due || src?.expect || '')
  const [dueTouched, setDueT] = useState(!!(src?.due || src?.expect))
  const [store, setStore] = useState(src?.store || 'WH-01')
  const [note, setNote] = useState(src?.note || '')
  const [lines, setLines] = useState(() =>
    src?.lines?.length
      ? src.lines.map((l) => ({ key: `l${++seq}`, sku: l.sku, qty: String(l.qty),
          price: String(l.price), tax: l.tax, acc: l.acc }))
      : [blank()])
  const [tried, setTried] = useState(false)

  const s = DATA.supplierOf(sup)

  /* شروط المورد بتملّي تاريخ الاستحقاق — لحد ما المستخدم يعدّله بإيده */
  const setSupplier = (id) => {
    setSup(id)
    const x = DATA.supplierOf(id)
    if (x && !dueTouched) {
      const d = termDays(x.terms)
      setDue(addDays(date, isPO ? Math.max(d, 14) : d))
    }
  }

  const setLine = (key, ch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...ch } : l)))

  /* اختيار الصنف بيملّي السعر والحساب — أول قيمة صح بدل حقل فاضي */
  const pick = (key, sku) => {
    const it = DATA.findItem(sku)
    setLines((ls) => ls.map((l) => (l.key === key ? {
      ...l, sku,
      price: it ? String(it.cost || it.sell) : l.price,
      tax: it?.tax === 'S' ? 'S' : l.tax,
      acc: it ? (it.kind === 'product' ? '5010' : '5020') : l.acc,
    } : l)))
  }

  const calc = useMemo(() => {
    const per = lines.map((l) => {
      const qty = Number(l.qty) || 0
      const price = Number(l.price) || 0
      const net = +(qty * price).toFixed(2)
      const vat = +(net * (DATA.taxOf(l.tax)?.rate || 0)).toFixed(2)
      return { ...l, qty, price, net, vat }
    })
    const net = +per.reduce((a, l) => a + l.net, 0).toFixed(2)
    const vat = +per.reduce((a, l) => a + l.vat, 0).toFixed(2)
    return { per, net, vat, total: +(net + vat).toFixed(2) }
  }, [lines])

  const anyProduct = calc.per.some((l) => DATA.findItem(l.sku)?.kind === 'product')

  /* تحذير السعر — بيقارن بآخر سعر اتشرى بيه من نفس المورد */
  const priceWarn = useMemo(() => {
    if (!sup) return []
    const hist = {}
    DATA.billsOf(sup).filter((b) => b.status === 'posted')
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((b) => (b.lines || []).forEach((l) => { if (!(l.sku in hist)) hist[l.sku] = l.price }))
    return calc.per.flatMap((l) => {
      const old = hist[l.sku]
      if (!old || !l.price) return []
      const diff = (l.price - old) / old
      if (Math.abs(diff) < 0.1) return []
      return [{ sku: l.sku, old, now: l.price, up: diff > 0, pct: Math.round(Math.abs(diff) * 100) }]
    })
  }, [sup, calc.per])

  const errs = {
    sup:   !sup ? 'لازم تختار مورد' : null,
    lines: calc.per.every((l) => !l.sku) ? 'محتاج بند واحد على الأقل'
         : calc.per.some((l) => l.sku && (!l.qty || !l.price)) ? 'فيه بند ناقصه الكمية أو السعر'
         : null,
    date:  !date ? 'التاريخ مطلوب' : null,
  }
  const nErr = Object.values(errs).filter(Boolean).length
  const show = (k) => (tried ? errs[k] : null)

  /* جاهزية المستند — نفس فكرة كارت العميل: الأسئلة اللي مفيش حقل بيجاوبها */
  const ready = [
    { ok: !!sup, t: 'المورد محدّد' },
    { ok: !!s?.vat, t: 'المورد مسجّل ضريبيًا', why: 'من غير رقم ضريبي مش هتخصم ضريبة مدخلات الفاتورة دي' },
    { ok: calc.per.some((l) => l.sku), t: 'فيه بنود' },
    { ok: !isPO ? !!ref : true, t: 'رقم مستند المورد مكتوب',
      why: 'ده اللي بيربط فاتورتك بمستنده وقت المراجعة' },
    { ok: !anyProduct || !!store, t: anyProduct ? 'المستودع محدّد' : 'مفيش منتجات — مش محتاج مستودع' },
    { ok: !!due, t: isPO ? 'التاريخ المتوقع محدّد' : 'تاريخ الاستحقاق محدّد' },
  ]

  const save = async (asDraft) => {
    setTried(true)
    if (nErr) return
    const doc = { no, date, due, ref, store, note, s, lines: calc.per }
    if (asDraft) {
      await ACT.saveDraft(kind, doc)
      nav(K.back)
      return
    }
    if (isPO) {
      const ok = await ACT.approvePO({ ...doc, s })
      if (ok) nav(K.back)
    } else {
      const ok = await ACT.postBill({ ...doc, s }, fmtMoney(calc.total))
      if (ok) nav(K.back)
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav(K.back)}>
          <Ico.back size={16} />{K.backT}
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">{editNo ? `تعديل ${editNo}` : K.t}</h1>
            <span className="dochead__sub">
              {isPO
                ? 'طلب للمورد — ما بيقيّدش حاجة على حسابه لحد ما يتحوّل فاتورة.'
                : 'التزام على المنشأة — بيتقيّد على حساب المورد ويدخل الإقرار عند الترحيل.'}
            </span>
          </div>
          <div className="dochead__act">
            <Button label="معاينة" variant="ghost"
              onClick={() => ACT.printDoc(kind, { no })} />
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">

          {/* ---------- ١) المورد ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">المورد <em>مين بتشتري منه</em></h2>
            <div className="frow frow--2">
              <div className="fld">
                <span className="fld__l">المورد</span>
                <Select className={`fld__i${show('sup') ? ' is-bad' : ''}`} value={sup}
                  onChange={(e) => setSupplier(e.target.value)}>
                  <option value="">اختر مورد…</option>
                  {DATA.suppliers.map((x) => (
                    <option key={x.id} value={x.id}>{x.ar}{x.vat ? '' : ' (غير مسجّل ضريبيًا)'}</option>
                  ))}
                </Select>
                {show('sup')
                  ? <em className="fld__e">{show('sup')}</em>
                  : <button className="linkish" onClick={() => nav('/purchases/suppliers')}>
                      + مورد جديد
                    </button>}
              </div>
              {!isPO && (
                <label className="fld">
                  <span className="fld__l">رقم مستند المورد <em className="fld__opt">من فاتورته هو</em></span>
                  <input className="fld__i num" value={ref} dir="ltr"
                    onChange={(e) => setRef(e.target.value)} placeholder="INV-2026-4417" />
                  <em className="fld__h">بيربط فاتورتك بمستنده — بيوفّر وقت المراجعة.</em>
                </label>
              )}
            </div>

            {s && (
              <p className="fnote">
                <Ico.check size={14} />
                عليك له <SAR v={DATA.supplierBalance(s.id)} /> · {s.city} · شروطه {s.terms || 'غير محددة'}
                {DATA.lastBuy(s.id) && <> · آخر شرا {fmtDate(DATA.lastBuy(s.id).date)}</>}
              </p>
            )}
            {s && !s.vat && (
              <p className="fnote fnote--warn">
                <Ico.close size={14} />
                المورد ده <b>مش مسجّل ضريبيًا</b> — ضريبة فاتورته مش قابلة للخصم في الإقرار.
              </p>
            )}
          </section>

          {/* ---------- ٢) البنود ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              البنود <em>الحساب بيتملّي لوحده من نوع الصنف — عدّله لو محتاج</em>
            </h2>

            <div className="lines lines--buy">
              <div className="lines__h">
                <span>#</span>
                <span>الصنف</span>
                <span>الكمية</span>
                <span>سعر الشراء</span>
                <span>الضريبة</span>
                <span>حساب الترحيل</span>
                <span>المبلغ</span>
                <span />
              </div>
              {calc.per.map((l, i) => {
                const it = DATA.findItem(l.sku)
                const w = priceWarn.find((x) => x.sku === l.sku)
                return (
                  <div className="lines__r" key={l.key}>
                    <span className="lines__i">{i + 1}</span>
                    <Select className="fld__i" value={l.sku} onChange={(e) => pick(l.key, e.target.value)}>
                      <option value="">اختر صنف…</option>
                      {DATA.items.map((x) => (
                        <option key={x.sku} value={x.sku}>{x.ar}</option>
                      ))}
                    </Select>
                    <input className="fld__i n" type="number" min="0" step="1" value={l.qty}
                      onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                    <span className="lines__pw">
                      <input className={`fld__i n${w ? ' is-warn' : ''}`} type="number" min="0" step="0.01"
                        value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value })} />
                      {w && (
                        <em className={w.up ? 'is-up' : 'is-down'}>
                          {w.up ? '▲' : '▼'} {w.pct}٪ عن {fmtMoney(w.old)}
                        </em>
                      )}
                    </span>
                    <Select className="fld__i" value={l.tax}
                      onChange={(e) => setLine(l.key, { tax: e.target.value })}>
                      {DATA.purchaseTax.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
                    </Select>
                    <Select className="fld__i" value={l.acc}
                      onChange={(e) => setLine(l.key, { acc: e.target.value })}>
                      {DATA.accountsOf('expense').map((a) => (
                        <option key={a.id} value={a.id}>{DATA.accName(a.id)}</option>
                      ))}
                    </Select>
                    <span className="lines__t">{fmtMoney(l.net)}</span>
                    <button className="lines__x" aria-label="شيل السطر"
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                      <Ico.close size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
            <button className="lines__add" onClick={() => setLines((ls) => [...ls, blank()])}>
              <Ico.plus size={15} />إضافة بند
            </button>
            {show('lines') && <em className="fld__e fld__e--blk">{errs.lines}</em>}

            {priceWarn.length > 0 && (
              <p className="fnote fnote--warn">
                <Ico.check size={14} />
                {priceWarn.length === 1 ? 'بند سعره' : `${priceWarn.length} بنود أسعارهم`} بعيدة عن آخر
                سعر اشتريت بيه من {s?.ar}. مش خطأ — بس يستاهل تراجعه.
              </p>
            )}
          </section>

          {/* ---------- ٣) التواريخ والمستودع ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">التواريخ والاستلام</h2>
            <div className="frow frow--3">
              <label className="fld">
                <span className="fld__l">{isPO ? 'تاريخ الأمر' : 'تاريخ الفاتورة'}</span>
                <input className={`fld__i${show('date') ? ' is-bad' : ''}`} type="date" value={date}
                  onChange={(e) => setDate(e.target.value)} />
                {show('date') && <em className="fld__e">{show('date')}</em>}
              </label>
              <label className="fld">
                <span className="fld__l">{K.dateL}</span>
                <input className="fld__i" type="date" value={due}
                  onChange={(e) => { setDue(e.target.value); setDueT(true) }} />
                <em className="fld__h">
                  {dueTouched ? 'اتحدّد بإيدك' : s ? `متحسب من شروط ${s.ar}` : 'بيتحسب من شروط المورد'}
                </em>
              </label>
              <label className="fld">
                <span className="fld__l">
                  {isPO ? 'يتسلّم في' : 'يدخل مستودع'}
                  {!anyProduct && <em className="fld__opt">مش مطلوب</em>}
                </span>
                <Select className="fld__i" value={store} disabled={!anyProduct}
                  onChange={(e) => setStore(e.target.value)}>
                  {DATA.stores.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                </Select>
                <em className="fld__h">
                  {anyProduct
                    ? isPO ? 'الكميات بتدخله وقت تسجيل الاستلام.' : 'الكميات بتدخله وقت الترحيل.'
                    : 'كل البنود خدمات — مفيش أثر على المخزون.'}
                </em>
              </label>
            </div>
          </section>

          {/* ---------- ٤) ملاحظات ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">ملاحظات <em className="fld__opt">اختياري</em></h2>
            <textarea className="fld__i fld__i--area" rows={2} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isPO ? 'مثلًا: التوصيل لموقع مشروع العليا، والتنسيق مع مهندس الموقع.'
                                : 'ملاحظة داخلية على الفاتورة.'} />
          </section>
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{isPO ? 'قيمة الأمر' : 'إجمالي الفاتورة'}</span>
            <div className="rail__v"><SAR v={calc.total} dec /></div>
            <dl className="rail__sum">
              <div><dt>قبل الضريبة</dt><dd><SAR v={calc.net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={calc.vat} dec /></dd></div>
              <div><dt>الإجمالي</dt><dd><SAR v={calc.total} dec /></dd></div>
            </dl>
            {!isPO && calc.vat > 0 && (
              <p className="rail__note">
                {s?.vat
                  ? `${fmtMoney(calc.vat)} ر.س ضريبة مدخلات هتتخصم من الإقرار.`
                  : 'المورد مش مسجّل — الضريبة دي مش قابلة للخصم.'}
              </p>
            )}
          </section>

          <section className="rail__c">
            <span className="rail__lbl">جاهزية المستند</span>
            <ul className="rail__check">
              {ready.map((r) => (
                <li key={r.t} className={r.ok ? 'is-ok' : ''}>
                  <Ico.check size={15} />
                  <span>{r.t}{!r.ok && r.why && <em style={{ display: 'block', fontStyle: 'normal', fontSize: '.6875rem', color: 'var(--ink-faint)' }}>{r.why}</em>}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">رقم المستند</span>
            <label className="fld">
              <input className="fld__i num" value={no} onChange={(e) => setNo(e.target.value)} />
              <em className="fld__h">بيتولّد لوحده — عدّله لو عندك ترقيم خاص.</em>
            </label>
          </section>
        </aside>
      </div>

      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${tried && nErr ? ' is-bad' : ''}`}>
          {tried && nErr
            ? <><Ico.close size={15} />ناقص {nErr} — موضّح فوق باللون الأحمر</>
            : nErr === 0
              ? <><Ico.check size={15} />جاهز</>
              : 'كمّل الحقول وبعدين احفظ — هننبّهك لو فيه ناقص'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={() => nav(K.back)}>إلغاء</button>
          <button className="btn btn--soft" onClick={() => save(true)}>حفظ كمسودة</button>
          <button className="btn btn--primary" onClick={() => save(false)}>
            <Ico.check size={16} />{isPO ? K.go : 'حفظ وترحيل'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

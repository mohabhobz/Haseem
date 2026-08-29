import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { SAR } from '../components/data.jsx'
import { Modal } from '../components/modal.jsx'
import { Attachments } from '../components/attachments.jsx'
import { PrintPreview } from '../components/printpreview.jsx'
import { fmtDate, fmtMoney, daysFrom, STATUS } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة أمر الشراء.

   في سيستم العميل الشاشة دي بتحط بلوكين مفتوحين طول الوقت تحت
   المستند: «تسجيل الاستلام» و«تحويل إلى فاتورة» — حتى لو الأمر
   مسودة، وحتى لو اتستلم بالكامل. يعني نص الشاشة فورمات مالهاش
   لازمة دلوقتي.

   هنا الاتنين **أوامر بتفتح مودال لما يبقى ليهم معنى**، والمستند
   نفسه بيفضل مستند. وكل سطر بيقول تلات أرقام مش رقم واحد:
   **طلبنا كام · وصل كام · اتفوتر كام** — وده اللي بيخلّي «استلام
   جزئي» رقم بدل ما يبقى بادچ.
   ============================================================ */

export default function PurchaseOrder() {
  const { no } = useParams()
  const nav = useNavigate()
  const p = useDoc('purchaseOrders', no)
  const [mode, setMode] = useState(null)   // 'recv' | 'bill'
  const [preview, setPreview] = useState(false)

  if (!p) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>أمر الشراء ده مش موجود</b>
          <span>يمكن الرقم يكون اتغيّر. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const net = DATA.docNet(p), vat = DATA.docVat(p), total = DATA.docTotal(p)
  const qty = DATA.poQty(p), got = DATA.poGot(p), billed = DATA.poBilled(p)
  const live = DATA.poLive(p)
  const expIn = p.expect ? daysFrom(p.expect) : null
  const late = live && expIn !== null && expIn < 0 && got < qty
  const st = STATUS[p.status]

  const acts = [
    p.status === 'draft' && { id: 'approve', label: 'اعتماد الأمر', Ic: Ico.check },
    live && p.status !== 'draft' && { id: 'send', label: 'إرسال للمورد', Ic: Ico.send },
    live && got < qty && { id: 'recv', label: 'تسجيل استلام', Ic: Ico.items },
    live && got > billed && { id: 'bill', label: 'تحويل لفاتورة', Ic: Ico.invoice },
    { id: 'pdf',   label: 'تحميل PDF', Ic: Ico.download },
    { id: 'print', label: 'معاينة وطباعة', Ic: Ico.print },
    live && { id: 'close', label: 'إقفال الأمر', Ic: Ico.ban },
    live && { id: 'cancel', label: 'إلغاء الأمر', Ic: Ico.trash, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'approve': return ACT.approvePO(p)
      case 'send':    return ACT.sendPO(p, 'email')
      case 'recv':    return setMode('recv')
      case 'bill':    return setMode('bill')
      case 'pdf':     return ACT.downloadPdf('purchaseOrders', p)
      case 'print':   return setPreview(true)
      case 'close':   return ACT.closePO(p, fmtMoney(DATA.poOpenValue(p)))
      case 'cancel':  return ACT.cancelPO(p).then((ok) => ok && nav('/purchases/orders'))
      default: return undefined
    }
  }

  /* الأمر التالي — واحد بس، وبيتغيّر مع مرحلة الأمر */
  const primary =
    p.status === 'draft'        ? { id: 'approve', label: 'اعتماد الأمر', Ic: Ico.check }
    : live && got < qty         ? { id: 'recv',    label: 'تسجيل استلام', Ic: Ico.items }
    : live && got > billed      ? { id: 'bill',    label: 'تحويل لفاتورة', Ic: Ico.invoice }
    :                             { id: 'pdf',     label: 'تحميل PDF',    Ic: Ico.download }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/purchases/orders')}>
          <Ico.back size={16} />أوامر الشراء
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no num">{p.no}</h1>
            <span className="doc__tags">
              <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
              {live && got >= qty && <span className="st st--positive">وصل بالكامل</span>}
              {live && billed >= qty && <span className="st st--positive">اتفوتر بالكامل</span>}
              {late && <span className="st st--attention">متأخر {Math.abs(expIn)} يوم</span>}
            </span>
            <span className="dochead__sub">{p.s.ar}</span>
          </div>
          <div className="dochead__act">
            <button className="btn btn--primary" onClick={() => run(primary.id)}>
              <primary.Ic size={16} />{primary.label}
            </button>
          </div>
        </div>
      </div>

      {p.status === 'draft' && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          مسودة — لسه ما دخلتش الالتزامات ومينفعش يتبعت للمورد. الاعتماد أول خطوة.
        </p>
      )}

      <div className="docgrid">
        <div className="form">

          {/* ---------- البنود: طلبنا · وصل · اتفوتر ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              البنود <em>كل سطر بيقول: طلبنا كام، وصل كام، واتفوتر كام</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}>#</th>
                    <th>الصنف</th>
                    <th style={{ width: '92px' }} className="n">المطلوب</th>
                    <th style={{ width: '120px' }} className="n">المستلم</th>
                    <th style={{ width: '120px' }} className="n">المفوتر</th>
                    <th style={{ width: '112px' }} className="n">سعر الوحدة</th>
                    <th style={{ width: '118px' }} className="n">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.lines || []).map((l, i) => {
                    const it = DATA.findItem(l.sku)
                    const rest = l.qty - (l.got || 0)
                    return (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td>
                          <span className="itcell">
                            <b>{it?.ar || l.sku}</b>
                            <em className="num">{l.sku} · {DATA.accName(l.acc)}</em>
                          </span>
                        </td>
                        <td className="n num">{l.qty}</td>
                        <td className="n">
                          <span className={`qmini${(l.got || 0) >= l.qty ? ' is-full' : (l.got || 0) > 0 ? ' is-part' : ''}`}>
                            <b className="num">{l.got || 0}</b>
                            {rest > 0 && <em>فاضل {rest}</em>}
                          </span>
                        </td>
                        <td className="n">
                          <span className={`qmini${(l.billed || 0) >= l.qty ? ' is-full' : (l.billed || 0) > 0 ? ' is-part' : ''}`}>
                            <b className="num">{l.billed || 0}</b>
                            {l.qty - (l.billed || 0) > 0 && <em>فاضل {l.qty - (l.billed || 0)}</em>}
                          </span>
                        </td>
                        <td className="n"><SAR v={l.price} dec /></td>
                        <td className="n"><SAR v={DATA.lineNet(l)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <dl className="totals">
              <div><dt>المجموع قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={vat} dec /></dd></div>
              <div className="totals__big"><dt>قيمة الأمر</dt><dd><SAR v={total} dec /></dd></div>
            </dl>

            <p className="fnote fnote--quiet">
              أمر الشراء **مش** مستند محاسبي — ما بيقيّدش حاجة على حساب المورد ولا بيدخل
              الإقرار. اللي بيقيّد هو فاتورة المشتريات اللي بتتعمل منه.
            </p>
          </section>

          {p.note && (
            <section className="fcard">
              <h2 className="fcard__t">ملاحظات</h2>
              <p className="rail__note" style={{ fontSize: 'var(--fs-sm)' }}>{p.note}</p>
            </section>
          )}

          <Attachments docNo={p.no}
            hint="عرض السعر · المواصفات الفنية · سند الاستلام" />
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">الالتزام المفتوح</span>
            <div className="rail__v"><SAR v={DATA.poOpenValue(p)} dec /></div>
            <span className="rail__due">
              {billed >= qty ? 'الأمر اتفوتر بالكامل' : `قيمة ${qty - billed} وحدة لسه ما اتفوترتش`}
            </span>

            <div className="progpair">
              <div>
                <span className="progpair__l">الاستلام</span>
                <span className="progpair__b" aria-hidden="true">
                  <i style={{ width: `${qty ? (got / qty) * 100 : 0}%` }} />
                </span>
                <span className="progpair__n num">{got} / {qty}</span>
              </div>
              <div>
                <span className="progpair__l">الفوترة</span>
                <span className="progpair__b" aria-hidden="true">
                  <i style={{ width: `${qty ? (billed / qty) * 100 : 0}%` }} />
                </span>
                <span className="progpair__n num">{billed} / {qty}</span>
              </div>
            </div>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات الأمر</span>
            <dl className="deflist">
              <div><dt>المورد</dt>
                <dd>
                  <button className="cell-doc cell-doc--link"
                    onClick={() => nav(`/purchases/suppliers/${p.s.id}`)}>{p.s.ar}</button>
                </dd></div>
              <div><dt>تاريخ الأمر</dt><dd>{fmtDate(p.date)}</dd></div>
              <div><dt>التاريخ المتوقع</dt>
                <dd className={late ? 'is-warn' : ''}>
                  {p.expect ? fmtDate(p.expect) : <em className="hint">—</em>}
                </dd></div>
              <div><dt>يتسلّم في</dt>
                <dd>{p.store ? DATA.storeOf(p.store)?.ar : <em className="hint">مفيش — خدمات</em>}</dd></div>
              <div><dt>شروط السداد</dt><dd>{p.s.terms || <em className="hint">—</em>}</dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {acts.map((a) => (
                <button key={a.id} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  onClick={() => run(a.id)}>
                  <a.Ic size={16} />
                  <span className="ract__t">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {mode === 'recv' && <RecvModal p={p} onClose={() => setMode(null)} />}
      {mode === 'bill' && <BillModal p={p} onClose={() => setMode(null)} />}

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no: p.no, date: p.date, due: p.expect,
          party: { ar: p.s.ar, city: p.s.city, vat: p.s.vat },
          lines: (p.lines || []).map((l) => ({
            code: l.sku, ar: DATA.findItem(l.sku)?.ar || l.sku,
            unit: DATA.findItem(l.sku)?.unitName || '', qty: l.qty,
            price: l.price, net: DATA.lineNet(l), taxAmt: DATA.lineVat(l),
            total: DATA.lineNet(l) + DATA.lineVat(l),
          })),
          net, tax: vat, total, kind: 'po',
        }} />
      )}
    </AppShell>
  )
}

/* ---------- تسجيل الاستلام ---------- */
function RecvModal({ p, onClose }) {
  const rest = Object.fromEntries(p.lines.map((l) => [l.sku, l.qty - (l.got || 0)]))
  const [qty, setQty] = useState(() => Object.fromEntries(p.lines.map((l) => [l.sku, String(rest[l.sku])])))
  const [ref, setRef] = useState('')
  const [date, setDate] = useState(DATA.TODAY)

  const nums = Object.fromEntries(Object.entries(qty).map(([k, v]) => [k, Number(v) || 0]))
  const over = p.lines.some((l) => nums[l.sku] > rest[l.sku])
  const total = Object.values(nums).reduce((a, x) => a + x, 0)
  const bad = total <= 0 || over

  const save = async () => {
    const ok = await ACT.receivePO(p, nums)
    if (ok) onClose()
  }

  return (
    <Modal title="تسجيل استلام" sub={`على ${p.no} — ${p.s.ar}`} onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" disabled={bad} onClick={save}>تسجيل الاستلام</button>
        </>
      }>
      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">رقم سند الاستلام <em>اختياري</em></span>
          <input className="fld__i num" value={ref} placeholder="GRN-…"
            onChange={(e) => setRef(e.target.value)} />
        </label>
        <DateField label="تاريخ الاستلام" value={date} onChange={setDate} />
      </div>

      <div className="fld" style={{ marginTop: 16 }}>
        <span className="fld__l">الكميات الواصلة</span>
        <ul className="recvlist">
          {p.lines.map((l) => {
            const it = DATA.findItem(l.sku)
            const r = rest[l.sku]
            const n = nums[l.sku]
            return (
              <li key={l.sku} className={n > r ? 'is-bad' : ''}>
                <span className="recvlist__n">
                  <b>{it?.ar || l.sku}</b>
                  <em>المتبقي للاستلام <span className="num">{r}</span> {it?.unitName || ''}</em>
                </span>
                <span className="qtyin" style={{ width: 128 }}>
                  <input className="qtyin__i num" inputMode="decimal" value={qty[l.sku]}
                    onChange={(e) => setQty({ ...qty, [l.sku]: e.target.value })} />
                  <span className="qtyin__s">{it?.unitName || 'وحدة'}</span>
                </span>
              </li>
            )
          })}
        </ul>
        {over
          ? <em className="fld__e">مش ممكن تستلم أكتر من المطلوب. صحّح الكمية الحمرا.</em>
          : <em className="fld__h">الكميات دي بتدخل {DATA.storeOf(p.store)?.ar || 'المستودع'} على طول. الفوترة خطوة منفصلة.</em>}
      </div>
    </Modal>
  )
}

/* ---------- تحويل لفاتورة ---------- */
function BillModal({ p, onClose }) {
  const [no, setNo] = useState(`BL-${Math.floor(100000 + Math.random() * 900000)}`)
  const [date, setDate] = useState(DATA.TODAY)
  const [due, setDue] = useState(() => {
    const d = new Date(DATA.TODAY); d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  /* الفاتورة بتتعمل على اللي **وصل** وما اتفوترش — مش على الأمر كله */
  const lines = p.lines
    .map((l) => ({ ...l, qty: (l.got || 0) - (l.billed || 0) }))
    .filter((l) => l.qty > 0)
  const total = DATA.docTotal({ lines })

  const save = async () => {
    const ok = await ACT.convertPO(p, { no, date, due })
    if (ok) onClose()
  }

  return (
    <Modal title="تحويل لفاتورة مشتريات" sub={`من ${p.no} — ${p.s.ar}`} onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" disabled={!lines.length} onClick={save}>
            إنشاء المسودة
          </button>
        </>
      }>
      {lines.length === 0 ? (
        <p className="fempty">
          مفيش كميات وصلت وما اتفوترتش. سجّل استلام الأول، أو الأمر اتفوتر بالكامل خلاص.
        </p>
      ) : (
        <>
          <ul className="recvlist recvlist--read">
            {lines.map((l) => {
              const it = DATA.findItem(l.sku)
              return (
                <li key={l.sku}>
                  <span className="recvlist__n">
                    <b>{it?.ar || l.sku}</b>
                    <em><span className="num">{l.qty}</span> {it?.unitName || ''} × {fmtMoney(l.price)}</em>
                  </span>
                  <span className="num"><SAR v={DATA.lineNet(l)} /></span>
                </li>
              )
            })}
          </ul>
          <p className="fnote fnote--quiet">
            الفاتورة بتتعمل على <b>اللي وصل وما اتفوترش</b> بس — مش على الأمر كله.
            إجماليها <b>{fmtMoney(total)}</b> ر.س شامل الضريبة.
          </p>

          <div className="frow frow--2" style={{ marginTop: 14 }}>
            <label className="fld">
              <span className="fld__l">رقم الفاتورة</span>
              <input className="fld__i num" value={no} onChange={(e) => setNo(e.target.value)} />
            </label>
            <DateField label="تاريخ الفاتورة" value={date} onChange={setDate} />
          </div>
          <div style={{ marginTop: 12 }}>
            <DateField label="تاريخ الاستحقاق" value={due} onChange={setDue}
              hint={`شروط المورد: ${p.s.terms || 'غير محددة'}`} />
          </div>
          <p className="fnote fnote--quiet">
            بتتحفظ <b>مسودة</b> — راجعها وقارنها بمستند المورد قبل الترحيل.
          </p>
        </>
      )}
    </Modal>
  )
}

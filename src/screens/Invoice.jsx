import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { InvChips, Chip, PaymentModal } from '../components/ob.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { STATUS, fmtMoney, fmtDate, daysFrom, dayAr } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDoc } from '../lib/store.js'
import { getBrand } from '../lib/brand.js'
import { PrintPreview } from '../components/printpreview.jsx'
import * as ACT from '../lib/actions.js'

/* ============================================================
   الفاتورة — المستند نفسه على الشمال، وكل الأوامر المتعلقة بيه
   على اليمين. الأمر الأساسي واحد وبيتحدد من حالة الفاتورة،
   والباقي تحته بوزن أخف. مفيش زرار بيتخبّى.
   ============================================================ */

const VAT = 0.15

/* الأمر الأساسي — واحد بس، وبيرد على «الفاتورة دي محتاجة إيه دلوقتي؟» */
function primaryOf(v) {
  if (v.zatca === 'bad')      return { label: 'إعادة الإرسال للهيئة', Ic: Ico.retry, tone: 'crit' }
  if (v.status === 'draft')   return { label: 'إصدار وإرسال للهيئة',  Ic: Ico.send,  tone: 'go' }
  if (['overdue', 'partial', 'issued'].includes(v.status))
                              return { label: 'تسجيل دفعة',           Ic: Ico.wallet, tone: 'go' }
  if (v.status === 'paid')    return { label: 'إرسال للعميل',         Ic: Ico.send,  tone: 'quiet' }
  return null
}

/* ---------- الأوامر التانية ----------
   قاعدة من بورد الكلاينت: PDF و XML و QR **مش موجودين قبل ما الهيئة تقبل**.
   قبل القبول الفاتورة لسه مالهاش وجود قانوني، فمنعرضش أزرار بتكدب. */
function secondaryOf(v) {
  const okZ = v.zatca === 'ok'

  const mail  = { id: 'mail',  label: 'إرسال بالبريد',  Ic: Ico.send }
  const wa    = { id: 'wa',    label: 'إرسال واتساب',   Ic: Ico.send }
  const share = { id: 'share', label: 'نسخ لينك المشاركة', Ic: Ico.copy }
  const pay   = { id: 'pay',   label: 'نسخ لينك الدفع',    Ic: Ico.card }
  const pdf   = { id: 'pdf',   label: 'تنزيل PDF',      Ic: Ico.download }
  const xml   = { id: 'xml',   label: 'تنزيل XML',      Ic: Ico.download }
  const print = { id: 'print', label: 'طباعة', Ic: Ico.print }
  const dup   = { id: 'dup',   label: 'نسخة جديدة منها', Ic: Ico.copy }
  /* مش «نسخة» — دي بتلغي الأصلية وتفتح مسودة بدلها. قاعدة صريحة في البورد. */
  const fix   = { id: 'fix', label: 'نسخ للتصحيح', Ic: Ico.retry, tone: 'crit',
                  note: 'بيلغي الفاتورة دي ويفتح مسودة جديدة مكانها' }

  if (v.status === 'draft')
    return [{ id: 'edit', label: 'تعديل المسودة', Ic: Ico.edit }, dup,
            { id: 'del', label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit' }]

  if (['cancelled', 'void'].includes(v.status))
    return okZ ? [pdf, xml, print, dup] : [print, dup]

  const out = [mail, wa, share]
  if (v.status !== 'paid') out.push(pay)
  if (okZ) out.push(pdf, xml)
  out.push(print, dup, { id: 'cn', label: 'إشعار دائن', Ic: Ico.receivable })
  if (okZ) out.push(fix)
  if (v.status !== 'paid') out.push({ id: 'cancel', label: 'إلغاء الفاتورة', Ic: Ico.ban, tone: 'crit' })
  return out
}

function StateTags({ v }) {
  const s = STATUS[v.status] || STATUS.draft
  return (
    <span className="doc__tags">
      <span className={`st st--${s.tone}`}>{s.label}</span>
      {v.zatca && v.zatca !== 'ok' && (
        <span className={`zs${v.zatca === 'bad' ? ' zs--bad' : ''}`}>
          <i className="zs__box">{v.zatca === 'bad' ? '!' : '⋯'}</i>
          {v.zatca === 'bad' ? 'رفض الهيئة' : 'عند الهيئة'}
        </span>
      )}
      {v.zatca === 'ok' && (
        <span className="zs zs--ok"><Ico.check size={12} />الهيئة قبلتها</span>
      )}
    </span>
  )
}

export default function Invoice() {
  const { no } = useParams()
  const nav = useNavigate()
  /* بنقرا من الستور مش من الموك مباشرة، عشان لو المستخدم ألغى
     الفاتورة أو أصدرها الشاشة تتغيّر قدامه فعلًا */
  const v = useDoc('invoices', no)
  /* ★ الفاتورة كانت **الوحيدة** اللي زرار الطباعة فيها بيروح على
     طباعة المتصفح على طول — من غير ما المستخدم يشوف الورقة اللي
     هتخرج. أمر الشراء وفاتورة المورد والعرض كلهم ليهم معاينة.
     دلوقتي نفس المعاينة هنا كمان. */
  const [preview, setPreview] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  /* كل أمر بيتنادى بمفتاحه. مكان الاستدعاء واحد، فالمطوّر بيربط
     من `lib/actions.js` مش من هنا. */
  const run = (id) => {
    const A = ACT
    switch (id) {
      case 'mail':   return A.sendEmail('invoices', v)
      case 'wa':     return A.sendWhatsApp('invoices', v)
      case 'share':  return A.copyShareLink('invoices', v)
      case 'pay':    return A.copyPayLink('invoices', v)
      case 'pdf':    return A.downloadPdf('invoices', v)
      case 'xml':    return A.downloadXml('invoices', v)
      case 'print':  return setPreview(true)
      case 'dup':    return nav('/sales/invoices/new')
      case 'edit':   return nav('/sales/invoices/new')
      case 'cn':     return nav('/sales/credit-notes/new')
      case 'fix':    return A.correctDoc('invoices', v, () => nav('/sales/invoices/new'))
      case 'cancel': return A.cancelDoc('invoices', v)
      case 'del':    return A.deleteDraft('invoices', v)
                       .then((ok) => ok && nav('/sales/invoices'))
      default: return undefined
    }
  }

  /* الأمر الرئيسي بيتحدد من الحالة، فتنفيذه بيتحدد منها كمان */
  const runPrimary = () => {
    if (!v) return
    if (v.zatca === 'bad')    return ACT.resubmitZatca('invoices', v)
    if (v.status === 'draft') return ACT.issueDoc('invoices', v)
    if (v.status === 'paid')  return ACT.sendEmail('invoices', v)
    return setPayOpen(true)
  }

  if (!v) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>الفاتورة دي مش موجودة</b>
          <span>يمكن تكون اتشالت. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const lines = DATA.linesOf(v)
  const net   = lines.reduce((a, l) => a + l.total, 0)
  const vat   = +(net * VAT).toFixed(2)
  const rem   = v.total - v.paid
  const pays  = DATA.paymentsOf(v)
  const log   = DATA.timelineOf(v)
  const d     = daysFrom(v.due)
  const prim  = primaryOf(v)
  const sec   = secondaryOf(v)

  let dueLine = null
  if (['issued', 'partial', 'overdue'].includes(v.status) && d !== null) {
    if (d < 0) dueLine = { t: `متأخرة ${dayAr(Math.abs(d))}`, cls: ' is-late' }
    else if (d === 0) dueLine = { t: 'تستحق النهاردة', cls: ' is-soon' }
    else dueLine = { t: `تستحق خلال ${dayAr(d)}`, cls: d <= 7 ? ' is-soon' : '' }
  }

  return (
    <AppShell>
      {/* ---------- رأس المستند — PageHeader الموحّد (Option B) ---------- */}
      <PageHeader back="/sales/invoices" title={<span className="num">{v.no}</span>}
        chip={<><InvChips v={v} />{v.zatca === 'ok' && <Chip tone="zatca">الهيئة قبلتها</Chip>}</>}
        sub={<>{v.c.ar}{dueLine && <> · <span style={dueLine.cls === ' is-late' ? { color: '#B91C1C' } : undefined}>{dueLine.t}</span></>}</>}
        actions={<>
          {v.zatca === 'ok' && <button type="button" className="btn" onClick={() => run('pdf')}><Ico.download size={20} />تنزيل PDF</button>}
          {prim && (
            <button type="button" className={`btn ${prim.tone === 'crit' ? 'btn--danger2' : 'btn--primary'}`} onClick={runPrimary}>
              <prim.Ic size={20} />{prim.label}
            </button>
          )}
        </>} />

      <div className="docgrid">
        {/* ================= المستند ================= */}
        <article className="paper" data-component="InvoicePaper">
          <header className="paper__h">
            <div className="paper__org">
              <img className="paper__logo" src={getBrand().logo || DATA.org.logo} alt="" />
              <div>
                <b>{DATA.org.nameAr}</b>
                <span>{DATA.org.nameEn}</span>
                <span>الرقم الضريبي {DATA.org.vat}</span>
                <span>س.ت {DATA.org.cr} · {DATA.org.branch}</span>
              </div>
            </div>
            <div className="paper__kind">
              <b>{v.status === 'draft' ? 'مسودة فاتورة ضريبية' : 'فاتورة ضريبية'}</b>
              <span>{v.status === 'draft' ? 'Draft Tax Invoice' : 'Tax Invoice'}</span>
              <span className="paper__no">{v.no}</span>
            </div>
          </header>

          <div className="paper__meta">
            <div className="paper__to">
              <span className="paper__lbl">فاتورة إلى</span>
              <b>{v.c.ar}</b>
              <span>{v.c.en}</span>
              <span>الرقم الضريبي {v.c.vat}</span>
              <span>{v.c.city} · {v.c.phone}</span>
            </div>
            <dl className="paper__facts">
              <div><dt>تاريخ الإصدار</dt><dd>{fmtDate(v.date)}</dd></div>
              <div><dt>تاريخ الاستحقاق</dt><dd>{v.due ? fmtDate(v.due) : 'غير محدد'}</dd></div>
              <div><dt>شروط السداد</dt><dd>{v.c.terms}</dd></div>
              <div><dt>العملة</dt><dd>ريال سعودي</dd></div>
            </dl>
          </div>

          <table className="paper__lines">
            <thead>
              <tr>
                <th className="w-i">#</th>
                <th>البند</th>
                <th className="w-q">الكمية</th>
                <th className="w-p n">سعر الوحدة</th>
                <th className="w-t n">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.code + i}>
                  <td className="w-i">{i + 1}</td>
                  <td>
                    <b>{l.ar}</b>
                    <span className="paper__code">{l.code}</span>
                  </td>
                  <td className="w-q"><span className="num">{l.qty}</span> {l.unit}</td>
                  <td className="w-p n"><span className="num">{fmtMoney(l.price)}</span></td>
                  <td className="w-t n"><span className="num">{fmtMoney(l.total)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="paper__foot">
            {/* الـQR بيتولد من الهيئة — قبل قبولها مفيش رمز، ومنحطش مربع بيوهم إن فيه */}
            {v.zatca === 'ok' ? (
              <div className="paper__qr">
                <div className="qr" aria-hidden="true" />
                <span>رمز الاستجابة السريعة<br />معتمد من هيئة الزكاة والضريبة</span>
              </div>
            ) : (
              <div className="paper__qr paper__qr--none">
                <div className="qr qr--none" aria-hidden="true"><Ico.close size={18} /></div>
                <span>
                  {v.status === 'draft'
                    ? 'مسودة — الرمز بيتولد بعد الإصدار'
                    : v.zatca === 'bad'
                      ? 'الهيئة رفضتها — مفيش رمز ولا PDF معتمد'
                      : 'في انتظار رد الهيئة — الرمز بيوصل مع القبول'}
                </span>
              </div>
            )}
            <dl className="paper__sum">
              <div><dt>الإجمالي قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة ١٥٪</dt><dd><SAR v={vat} dec /></dd></div>
              <div className="paper__sum--tot"><dt>إجمالي الفاتورة</dt><dd><SAR v={v.total} dec /></dd></div>
              {v.paid > 0 && (
                <div className="paper__sum--paid"><dt>المسدّد</dt><dd>− <SAR v={v.paid} dec /></dd></div>
              )}
              {rem > 0 && v.status !== 'cancelled' && (
                <div className="paper__sum--rem"><dt>المتبقّي</dt><dd><SAR v={rem} dec /></dd></div>
              )}
            </dl>
          </div>
        </article>

        {/* ================= الرَّيل ================= */}
        <aside className="rail">
          {/* المبلغ والحالة */}
          {/* ★ المبلغ المعدّل بعد الإشعارات — الفاتورة اللي عليها إشعار
              دائن مش قيمتها الأصلية. كان ناقص في الاتنين: سيستمه وعندنا. */}
          {(() => {
            const cr = DATA.creditedState(v.no, v.total)
            const rel = [...DATA.creditNotes.filter((n) => n.src === v.no),
                         ...DATA.debitNotes.filter((n) => n.src === v.no)]
            /* ★ كان الشرط `if (!cr) return null` — يعني القسم ما بيبانش
               إلا لما يبقى فيه إشعار دائن **صادر**. فالفاتورة اللي عليها
               إشعار مسودة، أو إشعار مدين بس، كانت بتبان نضيفة تمامًا
               والمستند المرتبط مخفي. الربط لازم يبان من ساعة ما يتعمل. */
            if (rel.length === 0) return null
            return (
              <section className="rail__c">
                <span className="rail__lbl">
                  {cr ? 'المبلغ بعد الإشعارات' : 'الإشعارات المرتبطة'}
                </span>
                {cr ? (
                  <>
                    <div className="rail__v"><SAR v={cr.net} dec /></div>
                    <span className="rail__due">
                      الأصلي {fmtMoney(v.total)} − إشعارات {fmtMoney(cr.amount)}
                    </span>
                  </>
                ) : (
                  <span className="rail__due">
                    مربوطة بالفاتورة — الإجمالي ما اتغيّرش لحد ما الإشعار يتصدر
                  </span>
                )}
                <ul className="rail__pays" style={{ marginTop: 14 }}>
                  {rel.map((n) => (
                    <li key={n.no}>
                      <b><SAR v={n.total} dec /></b>
                      <em>{fmtDate(n.date)}</em>
                      <span>
                        <button className="linkish"
                          onClick={() => nav(n.no.startsWith('CN') ? '/sales/credit-notes' : '/sales/debit-notes')}>
                          {n.no}
                        </button>
                        {' · '}{n.no.startsWith('CN') ? 'دائن' : 'مدين'}
                        {n.reason ? ` · ${n.reason}` : ''}
                        {n.status !== 'issued' ? ' · مسودة' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })()}

          <section className="rail__c">
            <span className="rail__lbl">{rem > 0 ? 'المتبقّي على العميل' : 'إجمالي الفاتورة'}</span>
            <span className="rail__v"><SAR v={rem > 0 ? rem : v.total} /></span>
            {dueLine && <span className={`rail__due${dueLine.cls}`}>{dueLine.t}</span>}
            {v.paid > 0 && rem > 0 && (
              <span className="rail__bar">
                <i style={{ width: `${Math.round((v.paid / v.total) * 100)}%` }} />
              </span>
            )}
            {v.paid > 0 && rem > 0 && (
              <span className="rail__note">سُدِّد {Math.round((v.paid / v.total) * 100)}٪ من الإجمالي</span>
            )}
          </section>

          {/* الأوامر — كلها ظاهرة، مفيش حاجة مستخبية في هوفر */}
          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {sec.map((a) => (
                <button key={a.label} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  title={a.note || undefined} onClick={() => run(a.id)}>
                  <a.Ic size={16} />
                  <span className="ract__t">{a.label}
                    {a.note && <em>{a.note}</em>}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* الدفعات */}
          {pays.length > 0 && (
            <section className="rail__c">
              <span className="rail__lbl">الدفعات</span>
              <ul className="rail__pays">
                {/* ★ الدفعة كانت سطر ساكت — بقى ليها أمرين:
                    عكسها، وتحميل سند القبض RV- اللي بيتسلّم للعميل. */}
                {pays.map((p) => (
                  <li key={p.ref}>
                    <b><SAR v={p.amount} /></b>
                    <em>{fmtDate(p.date)}</em>
                    <span>
                      {p.way} · {p.ref}
                      {' · '}
                      <button className="linkish"
                        onClick={() => ACT.reverseReceipt({ ...p, no: v.no })}>عكس الدفعة</button>
                      {' · '}
                      <button className="linkish"
                        onClick={() => ACT.downloadReceipt({ ...p, no: v.no })}>سند القبض</button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* سجل الحركة */}
          <section className="rail__c">
            <span className="rail__lbl">سجل الحركة</span>
            <ol className="tline">
              {log.map((e, i) => (
                <li key={i} className={`tline__i tline__i--${e.k}`}>
                  <i className="tline__dot" />
                  <div>
                    <b>{e.ar}</b>
                    <span>{fmtDate(e.date)} · {e.who}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {payOpen && <PaymentModal v={v} onClose={() => setPayOpen(false)} />}
      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no: v.no, date: v.date, due: v.due, party: v.c,
          lines: lines.map((l) => ({
            code: l.code, ar: l.ar, unit: l.unit, qty: l.qty,
            price: l.price ?? +(l.total / l.qty).toFixed(2),
            net: l.total, taxAmt: +(l.total * VAT).toFixed(2),
            total: +(l.total * (1 + VAT)).toFixed(2),
          })),
          net, tax: vat, total: v.total,
          bank: DATA.banks[0], zatcaOk: v.zatca === 'ok',
        }} />
      )}
    </AppShell>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { STATUS, fmtMoney, fmtDate, daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { getBrand } from '../lib/brand.js'

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

  const mail  = { label: 'إرسال بالبريد',  Ic: Ico.send }
  const wa    = { label: 'إرسال واتساب',   Ic: Ico.send }
  const share = { label: 'نسخ لينك المشاركة', Ic: Ico.copy }
  const pay   = { label: 'نسخ لينك الدفع',    Ic: Ico.card }
  const pdf   = { label: 'تنزيل PDF',      Ic: Ico.download }
  const xml   = { label: 'تنزيل XML',      Ic: Ico.download }
  const print = { label: 'طباعة',          Ic: Ico.print }
  const dup   = { label: 'نسخة جديدة منها', Ic: Ico.copy }
  /* مش «نسخة» — دي بتلغي الأصلية وتفتح مسودة بدلها. قاعدة صريحة في البورد. */
  const fix   = { label: 'نسخ للتصحيح', Ic: Ico.retry, tone: 'crit',
                  note: 'بيلغي الفاتورة دي ويفتح مسودة جديدة مكانها' }

  if (v.status === 'draft')
    return [{ label: 'تعديل المسودة', Ic: Ico.edit }, dup,
            { label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit' }]

  if (['cancelled', 'void'].includes(v.status))
    return okZ ? [pdf, xml, print, dup] : [print, dup]

  const out = [mail, wa, share]
  if (v.status !== 'paid') out.push(pay)
  if (okZ) out.push(pdf, xml)
  out.push(print, dup, { label: 'إشعار دائن', Ic: Ico.receivable })
  if (okZ) out.push(fix)
  if (v.status !== 'paid') out.push({ label: 'إلغاء الفاتورة', Ic: Ico.ban, tone: 'crit' })
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
  const v = DATA.findInvoice(no)

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
    if (d < 0) dueLine = { t: `متأخرة ${Math.abs(d)} يوم`, cls: ' is-late' }
    else if (d === 0) dueLine = { t: 'تستحق النهاردة', cls: ' is-soon' }
    else dueLine = { t: `تستحق خلال ${d} يوم`, cls: d <= 7 ? ' is-soon' : '' }
  }

  return (
    <AppShell>
      {/* ---------- رأس المستند ---------- */}
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/sales/invoices')}>
          <Ico.back size={16} />فواتير المبيعات
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no">{v.no}</h1>
            <StateTags v={v} />
          </div>
          <div className="dochead__act">
            {prim && (
              <button className={`btn btn--${prim.tone === 'crit' ? 'danger2' : 'primary'}`}>
                <prim.Ic size={16} />{prim.label}
              </button>
            )}
          </div>
        </div>
      </div>

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
                  title={a.note || undefined}>
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
                {pays.map((p) => (
                  <li key={p.ref}>
                    <b><SAR v={p.amount} /></b>
                    <span>{p.way} · {p.ref}</span>
                    <em>{fmtDate(p.date)}</em>
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
    </AppShell>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote, PageHeader } from '../components/layout.jsx'
import { Chip } from '../components/ob.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { PrintPreview } from '../components/printpreview.jsx'
import { fmtDate, fmtMoney, daysFrom, dayAr, STATUS, TODAY } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة عرض السعر.

   قبل كده الصف كان بيفتح **معاينة الطباعة** كبديل مؤقّت — يعني
   المستخدم بيبص على ورقة مش على مستند يقدر يشتغل عليه.

   الفرق الجوهري بين عرض السعر والفاتورة إن العرض **بيخلص**:
   ليه تاريخ صلاحية، وبعده بيبقى لاغي. فأهم حاجة على الشاشة مش
   المبلغ — هي **فاضل كام يوم**، والأمر اللي بعدها.

   وعشان كده الرقم القائد في الرَّيل عدّاد أيام مش مبلغ.
   ============================================================ */

export default function Quotation() {
  const { no } = useParams()
  const nav = useNavigate()
  const q = useDoc('quotations', no)
  const [preview, setPreview] = useState(false)

  if (!q) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>المستند ده مش موجود</b>
          <span>يمكن الرقم يكون اتغيّر. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  /* ★ نفس الشاشة بتخدم النوعين. الفرق مش شكلي:
     • **عرض السعر** بيستنى **موافقة** — فأمره «تعليم كمقبول»
     • **الفاتورة المبدئية** بتستنى **سداد** — مفيش «قبول» فيها،
       بتتحوّل لفاتورة ضريبية لما الفلوس توصل.
     خلطهم كان هيدّي المستخدم أمر مالوش معنى في نصف الحالات. */
  const prf = DATA.isPrf(q)
  const N = prf ? 'الفاتورة المبدئية' : 'العرض'

  const lines = DATA.linesOf(q)
  const net = +lines.reduce((s, l) => s + l.total, 0).toFixed(2)
  const vat = +(net * 0.15).toFixed(2)
  const total = +(net + vat).toFixed(2)

  const left = q.valid ? daysFrom(q.valid) : null
  const expired = q.status === 'expired' || (left !== null && left < 0)
  const live = ['draft', 'sent', 'accepted'].includes(q.status) && !expired
  const st = STATUS[q.status]

  const acts = [
    q.status === 'draft' && { id: 'send', label: 'إرسال للعميل', Ic: Ico.send },
    !prf && q.status === 'sent' && { id: 'accept', label: 'تعليم كمقبول', Ic: Ico.check },
    (q.status === 'accepted' || q.status === 'sent') && {
      id: 'convert', label: prf ? 'تحويل لفاتورة ضريبية' : 'تحويل لفاتورة', Ic: Ico.invoice },
    expired && q.status !== 'converted' && { id: 'renew', label: 'تجديد بتواريخ جديدة', Ic: Ico.retry },
    { id: 'print', label: 'معاينة وطباعة', Ic: Ico.print },
    { id: 'pdf',   label: 'تحميل PDF', Ic: Ico.download },
    { id: 'wa',    label: 'إرسال واتساب', Ic: Ico.send },
    live && { id: 'cancel', label: `إلغاء ${prf ? 'المستند' : 'العرض'}`, Ic: Ico.ban, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'send':    return ACT.sendEmail('quotations', q)
      case 'accept':  return ACT.acceptQuote(q)
      case 'convert': return ACT.convertQuote(q, () => nav('/sales/invoices/new'))
      case 'renew':   return ACT.renewQuote(q)
      case 'print':   return setPreview(true)
      case 'pdf':     return ACT.downloadPdf('quotations', q)
      case 'wa':      return ACT.sendWhatsApp('quotations', q)
      case 'cancel':  return ACT.cancelDoc('quotations', q)
      default: return undefined
    }
  }

  /* الأمر التالي — واحد بس، وبيتغيّر مع مرحلة العرض */
  const primary =
    q.status === 'draft'      ? { id: 'send',    label: 'إرسال للعميل', Ic: Ico.send }
    : q.status === 'sent'     ? (prf
        ? { id: 'convert', label: 'تحويل لفاتورة ضريبية', Ic: Ico.invoice }
        : { id: 'accept',  label: 'تعليم كمقبول',         Ic: Ico.check })
    : q.status === 'accepted' ? { id: 'convert', label: 'تحويل لفاتورة', Ic: Ico.invoice }
    : expired                 ? { id: 'renew',   label: `تجديد ${prf ? 'المستند' : 'العرض'}`, Ic: Ico.retry }
    :                           { id: 'pdf',     label: 'تحميل PDF',    Ic: Ico.download }

  return (
    <AppShell>
      <PageHeader back="/sales/quotations" title={<span className="num">{q.no}</span>}
        chip={<span className="ob-chips">
          <Chip tone="draft">{DATA.qKindAr(q)}</Chip>
          <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
          {expired && q.status !== 'expired' && <Chip tone="warn">عدّى تاريخ الصلاحية</Chip>}
          {q.linked && <Chip tone="ok">اتحوّل لـ{q.linked}</Chip>}
        </span>}
        sub={q.c?.ar}
        actions={<button type="button" className="btn btn--primary" onClick={() => run(primary.id)}><primary.Ic size={20} />{primary.label}</button>} />

      {/* ★ الرسالة الوحيدة اللي تستاهل بانر: العرض قرب يخلص أو خلص */}
      {live && left !== null && left >= 0 && left <= 7 && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          فاضل <b>{left === 0 ? 'النهاردة' : dayAr(left)}</b> وتنتهي صلاحية {N}.
          بعد كده الأسعار مش ملزمة ومحتاجة تجديد.
        </p>
      )}
      {expired && q.status !== 'converted' && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.ban size={14} />
          {N} انتهت صلاحيتها من <b>{dayAr(Math.abs(left))}</b>. التحويل لفاتورة
          بالأسعار دي محتاج تجديد الأول.
        </p>
      )}

      <div className="docgrid">
        <div className="form">
          <section className="fcard">
            <h2 className="fcard__t">
              البنود <em>الأسعار دي ملزمة لحد {q.valid ? fmtDate(q.valid) : '—'}</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}>#</th>
                    <th>البند</th>
                    <th style={{ width: '96px' }} className="n">الكمية</th>
                    <th style={{ width: '92px' }}>الوحدة</th>
                    <th style={{ width: '124px' }} className="n">سعر الوحدة</th>
                    <th style={{ width: '128px' }} className="n">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="num">{i + 1}</td>
                      <td><span className="itcell"><b>{l.ar}</b>
                        <em className="num">{l.code}</em></span></td>
                      <td className="n num">{l.qty}</td>
                      <td className="hint">{l.unit}</td>
                      <td className="n"><SAR v={l.price ?? +(l.total / l.qty).toFixed(2)} dec /></td>
                      <td className="n"><SAR v={l.total} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="totals">
              <div><dt>المجموع قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة ١٥٪</dt><dd><SAR v={vat} dec /></dd></div>
              <div className="totals__big"><dt>الإجمالي</dt><dd><SAR v={total} dec /></dd></div>
            </dl>
          </section>

          <section className="fcard">
            <h2 className="fcard__t">الأثر <em>{N} مش مستند محاسبي</em></h2>
            <ul className="efflist">
              <li>
                <span className="efflist__k">حساب العميل</span>
                <span className="efflist__v">
                  <em className="hint">مفيش أثر — {N} ما بتقيّدش حاجة</em>
                </span>
              </li>
              <li>
                <span className="efflist__k">المخزون</span>
                <span className="efflist__v"><em className="hint">مفيش حجز كمية</em></span>
              </li>
              <li>
                <span className="efflist__k">الهيئة</span>
                <span className="efflist__v"><em className="hint">مش بيتبعت لزاتكا</em></span>
              </li>
              <li>
                <span className="efflist__k">لما يتحوّل</span>
                <span className="efflist__v">
                  {q.linked
                    ? <>اتحوّل لـ<button className="cell-doc cell-doc--link"
                        onClick={() => nav(`/sales/invoices/${q.linked}`)}>{q.linked}</button></>
                    : 'بتتعمل مسودة فاتورة بنفس البنود، وساعتها بس بيبدأ الأثر المحاسبي'}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <aside className="rail">
          <section className="rail__c">
            {/* ★ الرقم القائد عدّاد مش مبلغ — ده اللي بيخلص */}
            <span className="rail__lbl">
              {q.status === 'converted' ? 'الإجمالي' : expired ? 'انتهى من' : 'صالح لغاية'}
            </span>
            {q.status === 'converted' ? (
              <div className="rail__v"><SAR v={total} dec /></div>
            ) : (
              <div className="rail__v">
                <span className="num">{left === null ? '—' : Math.abs(left)}</span>
                <span style={{ fontSize: 'var(--fs-sm)', marginInlineStart: 8,
                  color: 'var(--ink-muted)', fontWeight: 'var(--fw-regular)' }}>يوم</span>
              </div>
            )}
            <span className={`rail__due${expired ? ' is-late' : left !== null && left <= 7 ? ' is-soon' : ''}`}>
              {q.valid ? fmtDate(q.valid) : 'من غير تاريخ صلاحية'}
            </span>
            <dl className="rail__sum">
              <div><dt>قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>الضريبة</dt><dd><SAR v={vat} dec /></dd></div>
              <div><dt>الإجمالي</dt><dd><SAR v={total} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات المستند</span>
            <dl className="deflist">
              <div><dt>العميل</dt>
                <dd><button className="cell-doc cell-doc--link"
                  onClick={() => nav(`/sales/customers/${q.c.id}`)}>{q.c?.ar}</button></dd></div>
              <div><dt>تاريخ المستند</dt><dd>{fmtDate(q.date)}</dd></div>
              <div><dt>صالح حتى</dt>
                <dd className={expired ? 'is-warn' : ''}>{q.valid ? fmtDate(q.valid) : '—'}</dd></div>
              <div><dt>شروط السداد</dt><dd>{q.c?.terms || <em className="hint">—</em>}</dd></div>
              <div><dt>الفاتورة الناتجة</dt>
                <dd>{q.linked
                  ? <button className="cell-doc cell-doc--link"
                      onClick={() => nav(`/sales/invoices/${q.linked}`)}>{q.linked}</button>
                  : <em className="hint">لسه ما اتحوّلش</em>}</dd></div>
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

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no: q.no, date: q.date, due: q.valid, party: q.c, lines,
          net, tax: vat, total, kind: prf ? 'proforma' : 'quotation',
        }} />
      )}
    </AppShell>
  )
}

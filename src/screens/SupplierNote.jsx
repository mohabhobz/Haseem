import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { Attachments } from '../components/attachments.jsx'
import { PrintPreview } from '../components/printpreview.jsx'
import { fmtDate, fmtMoney, STATUS } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   إشعار المورد — دائن أو مدين.

   ده كان **أمر بيفتح تأكيد وخلاص**: تدوس «تسجيل إشعار دائن» فيطلع
   توست ومفيش مستند. دلوقتي مستند كامل ليه رقم وبنود وأثر محاسبي
   وبيتقيّد في دفتر اليومية زي الفاتورة.

   الفرق بين الاتنين في اتجاه واحد بس:
   • **دائن** — المورد بيقلّل اللي عليك (مرتجع · خصم بعد الفاتورة)
   • **مدين** — المورد بيزوّد اللي عليك (رسوم · فرق سعر)

   عشان كده شاشة واحدة بمفتاح، مش شاشتين.
   ============================================================ */

export default function SupplierNote() {
  const { no } = useParams()
  const nav = useNavigate()
  const n = useDoc('supplierNotes', no)
  const [preview, setPreview] = useState(false)

  if (!n) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>الإشعار ده مش موجود</b>
          <span>يمكن الرقم يكون اتغيّر. ارجع لفاتورة المورد وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const cr = n.kind === 'credit'
  const net = DATA.docNet(n), vat = DATA.docVat(n), total = DATA.docTotal(n)
  const bill = DATA.bills.find((b) => b.no === n.src)
  const sup = DATA.supplierOf(n.s)
  const st = STATUS[n.status]
  const draft = n.status === 'draft'

  const acts = [
    draft && { id: 'post', label: 'ترحيل الإشعار', Ic: Ico.check },
    draft && { id: 'del',  label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit' },
    { id: 'pdf',   label: 'تحميل PDF', Ic: Ico.download },
    { id: 'print', label: 'معاينة وطباعة', Ic: Ico.print },
    !draft && { id: 'rev', label: 'عكس الإشعار', Ic: Ico.retry, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'post':  return ACT.postSupplierNote(n, fmtMoney(total))
      case 'del':   return ACT.deleteSupplierNote(n).then((ok) => ok && nav(`/purchases/bills/${n.src}`))
      case 'pdf':   return ACT.downloadPdf('supplierNotes', n)
      case 'print': return setPreview(true)
      case 'rev':   return ACT.reverseSupplierNote(n)
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav(`/purchases/bills/${n.src}`)}>
          <Ico.back size={16} />{n.src}
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no num">{n.no}</h1>
            <span className="doc__tags">
              <span className={`ldg__k ldg__k--${cr ? 'cr' : 'dr'}`}>
                إشعار {cr ? 'دائن' : 'مدين'} من المورد
              </span>
              <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
            </span>
            <span className="dochead__sub">{sup?.ar} · {n.reason}</span>
          </div>
          <div className="dochead__act">
            {draft ? (
              <button className="btn btn--primary" onClick={() => run('post')}>
                <Ico.check size={16} />ترحيل الإشعار
              </button>
            ) : (
              <button className="btn btn--outline" onClick={() => run('pdf')}>
                <Ico.download size={16} />تحميل PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {draft && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          مسودة — لسه ما غيّرتش رصيد المورد ولا الإقرار الضريبي.
        </p>
      )}

      <div className="docgrid">
        <div className="form">
          <section className="fcard">
            <h2 className="fcard__t">
              البنود <em>{cr ? 'بتترجع للمورد' : 'بتتزاد على الفاتورة'}</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}>#</th>
                    <th>الصنف</th>
                    <th style={{ width: '96px' }} className="n">الكمية</th>
                    <th style={{ width: '124px' }} className="n">سعر الوحدة</th>
                    <th style={{ width: '176px' }}>الحساب</th>
                    <th style={{ width: '124px' }} className="n">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(n.lines || []).map((l, i) => {
                    const it = DATA.findItem(l.sku)
                    return (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td><span className="itcell"><b>{it?.ar || l.sku}</b>
                          <em className="num">{l.sku}</em></span></td>
                        <td className="n num">{l.qty}{it ? ` ${it.unitName}` : ''}</td>
                        <td className="n"><SAR v={l.price} dec /></td>
                        <td className="hint">{DATA.accName(l.acc)}</td>
                        <td className="n"><SAR v={DATA.lineNet(l)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <dl className="totals">
              <div><dt>قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={vat} dec /></dd></div>
              <div className="totals__big">
                <dt>{cr ? 'بيتخصم من المورد' : 'بيتضاف على المورد'}</dt>
                <dd><SAR v={total} dec /></dd>
              </div>
            </dl>
          </section>

          <section className="fcard">
            <h2 className="fcard__t">الأثر <em>إيه اللي بيتغيّر عند الترحيل</em></h2>
            <ul className="efflist">
              <li>
                <span className="efflist__k">حساب المورد</span>
                <span className="efflist__v">
                  {cr ? 'بيقلّ' : 'بيزيد'} بـ<b><SAR v={total} /></b>
                  {draft && <em className="hint"> — لسه ما اتقيّدش</em>}
                </span>
              </li>
              <li>
                <span className="efflist__k">ضريبة المدخلات</span>
                <span className="efflist__v">
                  {cr ? 'بتقل' : 'بتزيد'} بـ<b><SAR v={vat} dec /></b> في الإقرار
                </span>
              </li>
              <li>
                <span className="efflist__k">المخزون</span>
                <span className="efflist__v">
                  {(n.lines || []).some((l) => DATA.findItem(l.sku)?.kind === 'product')
                    ? <>{cr ? 'الكميات بترجع للمورد' : 'مفيش أثر على الكمية'}</>
                    : <em className="hint">بنود خدمات — مفيش أثر</em>}
                </span>
              </li>
              <li>
                <span className="efflist__k">الفاتورة الأصلية</span>
                <span className="efflist__v">
                  {bill
                    ? <>
                        <button className="cell-doc cell-doc--link"
                          onClick={() => nav(`/purchases/bills/${bill.no}`)}>{bill.no}</button>
                        {' — إجماليها '}{fmtMoney(bill.total)}{' والإشعار '}{fmtMoney(total)}
                      </>
                    : <em className="hint">مش مربوط بفاتورة</em>}
                </span>
              </li>
            </ul>
            {bill && total > bill.total && (
              <p className="fnote fnote--warn">
                <Ico.close size={14} />
                الإشعار أكبر من الفاتورة الأصلية — راجعه قبل الترحيل.
              </p>
            )}
          </section>

          <Attachments docNo={n.no} />
        </div>

        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{cr ? 'بيتخصم' : 'بيتضاف'}</span>
            <div className="rail__v"><SAR v={total} dec /></div>
            <span className="rail__due">
              {draft ? 'لسه مسودة — ما أثّرش' : `اتقيّد ${fmtDate(n.date)}`}
            </span>
            <dl className="rail__sum">
              <div><dt>قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>الضريبة</dt><dd><SAR v={vat} dec /></dd></div>
              <div><dt>الإجمالي</dt><dd><SAR v={total} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات الإشعار</span>
            <dl className="deflist">
              <div><dt>المورد</dt>
                <dd><button className="cell-doc cell-doc--link"
                  onClick={() => nav(`/purchases/suppliers/${n.s}`)}>{sup?.ar}</button></dd></div>
              <div><dt>الفاتورة الأصلية</dt>
                <dd>{bill
                  ? <button className="cell-doc cell-doc--link"
                      onClick={() => nav(`/purchases/bills/${bill.no}`)}>{bill.no}</button>
                  : <em className="hint">—</em>}</dd></div>
              <div><dt>التاريخ</dt><dd>{fmtDate(n.date)}</dd></div>
              <div><dt>السبب</dt><dd>{n.reason || <em className="hint">—</em>}</dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {acts.map((a) => (
                <button key={a.id} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  onClick={() => run(a.id)}>
                  <a.Ic size={16} /><span className="ract__t">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no: n.no, date: n.date, party: { ar: sup?.ar, city: sup?.city, vat: sup?.vat },
          lines: (n.lines || []).map((l) => ({
            code: l.sku, ar: DATA.findItem(l.sku)?.ar || l.sku,
            unit: DATA.findItem(l.sku)?.unitName || '', qty: l.qty,
            price: l.price, net: DATA.lineNet(l), taxAmt: DATA.lineVat(l),
            total: DATA.lineNet(l) + DATA.lineVat(l),
          })),
          net, tax: vat, total, kind: cr ? 'supCredit' : 'supDebit',
        }} />
      )}
    </AppShell>
  )
}

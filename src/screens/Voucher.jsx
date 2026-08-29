import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { Attachments } from '../components/attachments.jsx'
import { fmtDate, fmtMoney, amountInWords, STATUS } from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   سند القبض أو الصرف — المستند نفسه.

   السند مستند **بيتوقّع وبيتسلّم**، مش سطر في جدول. عشان كده
   الشاشة دي فيها حاجتين مش موجودين في سيستم العميل:

   ١) **المبلغ كتابةً** — القاعدة اللي كل سند ورقي في السعودية
      ماشي عليها: الرقم لوحده ينفع يتزوّد عليه خانة.
   ٢) **القيد المحاسبي معروض** — طرفين بأسمائهم. المستخدم يشوف
      السند بيعمل إيه في الدفتر قبل ما يرحّله، مش بعد ما يكتشف
      إن الرصيد اتغيّر.

   والسند اللي جاي من مستند (تحصيل فاتورة) **بيبان قراءة بس**
   ومعاه سطر بيقول إنه مقيّد مع الفاتورة — عشان محدش يفتكر إنه
   لسه محتاج ترحيل.
   ============================================================ */

const CFG = {
  receipts: {
    ar: 'سند قبض', list: 'سندات القبض', route: '/cash/receipts',
    party: 'استلمنا من', dir: 'in', into: 'دخلت', kind: 'rv',
  },
  payments: {
    ar: 'سند صرف', list: 'سندات الصرف', route: '/cash/payments',
    party: 'صرفنا إلى', dir: 'out', into: 'خرجت من', kind: 'pv',
  },
}

export default function Voucher({ kind = 'receipts' }) {
  const { no } = useParams()
  const nav = useNavigate()
  const C = CFG[kind]
  const [print, setPrint] = useState(false)

  /* الأوفرلاي بيسري على المستقل بس */
  const overlay = useDocs(kind === 'receipts' ? 'receiptVouchers' : 'paymentVouchers')
  const base = kind === 'receipts' ? DATA.findReceipt(no) : DATA.findPayment(no)
  const ov = overlay.find((o) => o.no === no)
  const v = base ? { ...base, ...(ov || {}) } : null

  if (!v) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>السند ده مش موجود</b>
          <span>ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const rec = kind === 'receipts'
  const linked = !!v.src
  const draft = v.status === 'draft'
  const st = STATUS[v.status]
  const party = DATA.partyAr(v.party)
  const pgo = DATA.partyGo(v.party)
  const cash = DATA.cashAccountOf(v.acc)
  const bal = R.balanceOf(v.acc, DATA.TODAY)

  const acts = [
    draft && { id: 'post', label: `ترحيل ${C.ar}`, Ic: Ico.check },
    draft && { id: 'del', label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit' },
    { id: 'print', label: 'معاينة وطباعة', Ic: Ico.print },
    { id: 'pdf', label: 'تحميل PDF', Ic: Ico.download },
    linked && { id: 'src', label: 'المستند الأصلي', Ic: Ico.invoice },
    !draft && !linked && { id: 'rev', label: 'عكس السند', Ic: Ico.retry, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'post':  return ACT.postVoucher(kind, v, fmtMoney(v.amount), party, DATA.accName(v.acc))
      case 'del':   return ACT.deleteVoucher(kind, v).then((ok) => ok && nav(C.route))
      case 'print': return setPrint(true)
      case 'pdf':   return ACT.downloadPdf(kind, v)
      case 'src':   return nav(v.srcGo)
      case 'rev':   return ACT.reverseVoucher(kind, v)
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav(C.route)}>
          <Ico.back size={16} />{C.list}
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no num">{v.no}</h1>
            <span className="doc__tags">
              <span className={`ldg__k ldg__k--${rec ? 'dr' : 'cr'}`}>{C.ar}</span>
              <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
              {linked && <span className="st st--info">على مستند</span>}
            </span>
            <span className="dochead__sub">{party} · {v.way}</span>
          </div>
          <div className="dochead__act">
            {draft ? (
              <button className="btn btn--primary" onClick={() => run('post')}>
                <Ico.check size={16} />ترحيل {C.ar}
              </button>
            ) : (
              <button className="btn btn--outline" onClick={() => run('print')}>
                <Ico.print size={16} />معاينة وطباعة
              </button>
            )}
          </div>
        </div>
      </div>

      {draft && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          مسودة — لسه ما دخلتش الدفتر ولا غيّرت رصيد {cash?.ar || 'الحساب'}.
        </p>
      )}
      {linked && (
        <p className="fnote fnote--quiet" style={{ marginBottom: 14 }}>
          السند ده اتعمل مع{' '}
          <button className="cell-doc cell-doc--link" onClick={() => nav(v.srcGo)}>{v.src}</button>
          {' '}و<b>مقيّد معاه في الدفتر</b> — بيبان هنا عشان تلاقي الفلوس من مكان
          واحد، مش عشان يتقيّد تاني.
        </p>
      )}

      <div className="docgrid">
        <div className="form">
          {/* ---------- السند نفسه ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">{C.ar} <em>الشكل اللي بيتطبع ويتوقّع</em></h2>

            <div className="vch">
              <dl className="vch__row">
                <dt>{C.party}</dt>
                <dd>
                  {pgo
                    ? <button className="cell-doc cell-doc--link" onClick={() => nav(pgo)}>{party}</button>
                    : <b>{party}</b>}
                </dd>
              </dl>
              <dl className="vch__row">
                <dt>مبلغ وقدره</dt>
                <dd><b className="vch__amt"><SAR v={v.amount} dec /></b></dd>
              </dl>
              <dl className="vch__row vch__row--words">
                <dt>فقط</dt>
                <dd>{amountInWords(v.amount)}</dd>
              </dl>
              <dl className="vch__row">
                <dt>وذلك عن</dt>
                <dd>{v.memo || <em className="hint">—</em>}</dd>
              </dl>
              <dl className="vch__row">
                <dt>{rec ? 'استلمناها في' : 'صرفناها من'}</dt>
                <dd>
                  {cash?.ar || DATA.accName(v.acc)}
                  <em className="hint"> · {v.way}{v.ref ? ` · ${v.ref}` : ''}</em>
                </dd>
              </dl>

              <div className="vch__sign">
                <span><i />المحاسب</span>
                <span><i />{rec ? 'أمين الصندوق' : 'المستلِم'}</span>
                <span><i />المدير المالي</span>
              </div>
            </div>
          </section>

          {/* ---------- القيد ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              القيد المحاسبي <em>{draft ? 'ده اللي هيتكتب عند الترحيل' : 'ده اللي اتكتب في الدفتر'}</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th style={{ width: '140px' }} className="n">مدين</th>
                    <th style={{ width: '140px' }} className="n">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{rec ? DATA.accName(v.acc) : DATA.accName(v.to)}</td>
                    <td className="n"><SAR v={v.amount} dec /></td>
                    <td className="n"><em className="hint">—</em></td>
                  </tr>
                  <tr>
                    <td>{rec ? DATA.accName(v.to) : DATA.accName(v.acc)}</td>
                    <td className="n"><em className="hint">—</em></td>
                    <td className="n"><SAR v={v.amount} dec /></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td><b>الإجمالي</b></td>
                    <td className="n"><b><SAR v={v.amount} dec /></b></td>
                    <td className="n"><b><SAR v={v.amount} dec /></b></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="fnote fnote--quiet">
              الطرفين بنفس المبلغ — عشان كده الدفتر بيفضل متوازن مهما اتسجّل
              كام سند.
            </p>
          </section>

          <Attachments docNo={v.no}
            hint="صورة الشيك · إشعار الحوالة · التوقيع المستلم" />
        </div>

        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{rec ? 'المقبوض' : 'المصروف'}</span>
            <div className="rail__v"><SAR v={v.amount} dec /></div>
            <span className="rail__due">
              {draft ? 'مسودة — ما أثّرتش' : `${C.into} ${cash?.ar || ''} في ${fmtDate(v.date)}`}
            </span>
            <dl className="rail__sum">
              <div><dt>التاريخ</dt><dd>{fmtDate(v.date)}</dd></div>
              <div><dt>طريقة الدفع</dt><dd>{v.way}</dd></div>
              <div><dt>المرجع</dt><dd>{v.ref || <em className="hint">—</em>}</dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">الأثر</span>
            <ul className="efflist">
              <li>
                <span className="efflist__k">{cash?.ar || DATA.accName(v.acc)}</span>
                <span className="efflist__v">
                  {rec ? 'بيزيد' : 'بيقلّ'} بـ<b><SAR v={v.amount} /></b>
                  {draft && <em className="hint"> — لسه</em>}
                </span>
              </li>
              <li>
                <span className="efflist__k">{DATA.accName(v.to)}</span>
                <span className="efflist__v">
                  {v.to === '1200' ? 'ذمة العميل بتقل'
                    : v.to === '2000' ? 'المستحق للمورد بيقل'
                    : rec ? 'إيراد بيتسجّل' : 'مصروف بيتسجّل'}
                </span>
              </li>
              <li>
                <span className="efflist__k">رصيد الحساب بعدها</span>
                <span className="efflist__v">
                  <b><SAR v={bal} /></b>
                  {draft && <em className="hint"> — من غير السند ده</em>}
                </span>
              </li>
            </ul>
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

      {print && <VoucherPrint v={v} C={C} party={party} cash={cash} onClose={() => setPrint(false)} />}
    </AppShell>
  )
}

/* ---------- معاينة الطباعة ----------
   السند مش فاتورة: مفيش بنود ولا ضريبة ولا رمز هيئة. عشان كده
   ورقته مستقلة بدل ما نحشره في معاينة الفاتورة ونسيب فيها خانات
   فاضية. */
function VoucherPrint({ v, C, party, cash, onClose }) {
  const org = DATA.org
  return (
    <div className="pp" role="dialog" aria-modal="true" aria-label={`معاينة ${C.ar}`}>
      <div className="pp__scrim" onClick={onClose} />
      <div className="pp__box">
        <header className="pp__h">
          <span className="pp__t"><Ico.print size={16} />معاينة {C.ar}</span>
          <div className="pp__ctrl">
            <button className="gbtn2" onClick={() => window.print()}>
              <Ico.print size={14} />طباعة
            </button>
            <button className="pp__x" aria-label="إغلاق" onClick={onClose}>
              <Ico.close size={18} />
            </button>
          </div>
        </header>

        <div className="pp__body">
          <div className="pp__paper pp__paper--full">
            <h1 className="pp__title">{C.ar} / {C.kind === 'rv' ? 'Receipt Voucher' : 'Payment Voucher'}</h1>

            <dl className="pp__meta">
              <div><dt>رقم السند / No</dt><dd>{v.no}</dd></div>
              <div><dt>التاريخ / Date</dt><dd>{v.date}</dd></div>
              <div><dt>الحساب / Account</dt><dd>{cash?.ar || DATA.accName(v.acc)}</dd></div>
            </dl>

            <div className="pp__parties">
              <div>
                <i className="pp__plbl">المنشأة</i>
                <b>{org.nameAr}</b>
                <span>{org.branch}</span>
                <span>الرقم الضريبي: {org.vat || '—'}</span>
              </div>
              <div>
                <i className="pp__plbl">{C.party}</i>
                <b>{party}</b>
                <span>{v.way}{v.ref ? ` · ${v.ref}` : ''}</span>
              </div>
            </div>

            <div className="vch vch--print">
              <dl className="vch__row">
                <dt>مبلغ وقدره</dt>
                <dd><b className="vch__amt num">{fmtMoney(v.amount)} ر.س</b></dd>
              </dl>
              <dl className="vch__row vch__row--words">
                <dt>فقط</dt><dd>{amountInWords(v.amount)}</dd>
              </dl>
              <dl className="vch__row">
                <dt>وذلك عن</dt><dd>{v.memo || '—'}</dd>
              </dl>
              {v.src && (
                <dl className="vch__row">
                  <dt>على المستند</dt><dd className="num">{v.src}</dd>
                </dl>
              )}
              <div className="vch__sign">
                <span><i />المحاسب</span>
                <span><i />{C.kind === 'rv' ? 'أمين الصندوق' : 'المستلِم'}</span>
                <span><i />المدير المالي</span>
              </div>
            </div>

            <p className="pp__noqr">
              سند {C.kind === 'rv' ? 'قبض' : 'صرف'} — مستند داخلي مش فاتورة ضريبية،
              وما بيتبعتش لهيئة الزكاة والضريبة.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

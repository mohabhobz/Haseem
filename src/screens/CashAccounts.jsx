import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { AccountForm } from '../components/accountform.jsx'
import { VoucherForm } from '../components/voucherform.jsx'
import { TransferForm } from '../components/transferform.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtDate, fmtMoney } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الحسابات النقدية والبنكية.

   الشاشة دي بتجاوب على سؤال واحد: **الفلوس فين دلوقتي؟**

   في السيستم الأصلي الحساب سطر في جدول باسمه ورصيده. المشكلة إن
   «الرصيد» لوحده ما بيقولش حاجة عن الحساب: خزنة فيها ٢٦ ألف
   حاجة، وبوابة دفع فيها ٨ آلاف **لسه ما وصلتش** حاجة تانية خالص.

   عشان كده كل حساب هنا بيقول تلات حاجات:
   ١) **الرصيد** — متحسب من دفتر اليومية، مش مخزّن.
   ٢) **نوعه** — خزنة · حساب بنكي · نقاط بيع · بوابة دفع، ومعاه
      مدة التسوية للي بيستنى فلوسه.
   ٣) **آخر حركة** — إمتى اتحرّك آخر مرة، عشان الحساب الميّت يبان.

   ★ الأرقام كلها مشتقّة: `balanceOf` بيقرا نفس الدفتر اللي
   الميزانية بتقرا منه. مستحيل الشاشة دي تخالف الميزانية.
   ============================================================ */

const ICON = { cash: Ico.wallet, bank: Ico.bank, pos: Ico.card, gateway: Ico.card }

/* ★ في السيستم يومين اسمهم `TODAY`: واحد `Date` في `format.js`
   للفلاتر، وواحد نص ISO في `mock.js` للتقارير. دوال التقارير
   بتقارن نصوص، فلازم النص. الخلط بينهم بيرجّع نتيجة فاضية
   من غير أي خطأ — وده أخطر من الكراش. */
const TODAY = DATA.TODAY

export default function CashAccounts() {
  const nav = useNavigate()
  /* ★ الأمر بيفتح فورمه **في مكانه**. قبل كده «سند قبض» هنا كان
     بيوديك على شاشة السندات وتدوس تاني — لفة من غير سبب. */
  const [form, setForm] = useState(null)   // 'acc' | 'rv' | 'pv' | 'trf'

  const rows = useMemo(() => DATA.cashAccounts.map((a) => {
    const st = R.accountStatement(a.acc, null, TODAY)
    const last = st.rows[st.rows.length - 1]
    const days = last ? Math.round((new Date(TODAY) - new Date(last.date)) / 86400000) : null
    return {
      ...a,
      balance: st.close,
      moves: st.rows.length,
      lastDate: last?.date || null,
      lastDays: days,
      inflow: st.totDr,
      outflow: st.totCr,
    }
  }), [])

  const total = rows.reduce((s, a) => s + a.balance, 0)
  const liquid = rows.filter((a) => !a.settleDays).reduce((s, a) => s + a.balance, 0)
  const waiting = rows.filter((a) => a.settleDays).reduce((s, a) => s + a.balance, 0)

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="الحسابات النقدية والبنكية"
          sub={<>كل حساب بيتحرّك فيه فلوس المنشأة<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="سند صرف" variant="ghost" onClick={() => setForm('pv')} />
          <Button label="تحويل بين الحسابات" variant="outline" onClick={() => setForm('trf')} />
          <Button label="حساب جديد" variant="primary" icon="＋" onClick={() => setForm('acc')} />
        </div>
      </div>

      <SummaryStrip
        label="النقد المتاح"
        value={total}
        note={`موزّع على ${rows.length} حسابات — الرصيد متحسب من دفتر الأستاذ`}
        items={[
          { label: 'متاح فورًا', value: liquid },
          { label: 'تحت التسوية', value: waiting, alert: waiting > 0 },
        ]}
      />

      <section className="sect" data-component="CashAccounts">
        <header className="sect__h">
          <h2 className="sect__t">الحسابات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <button className="gbtn2" onClick={() => setForm('rv')}>
              <Ico.plus size={14} />سند قبض
            </button>
          </div>
        </header>

        <div className="acctgrid">
          {rows.map((a) => {
            const Ic = ICON[a.kind] || Ico.bank
            const share = total > 0 ? (a.balance / total) * 100 : 0
            return (
              <article key={a.acc} className="acct" data-component="CashAccountCard"
                role="button" tabIndex={0}
                onClick={() => nav(`/cash/accounts/${a.acc}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') nav(`/cash/accounts/${a.acc}`) }}>
                <header className="acct__h">
                  <span className="acct__ic"><Ic size={17} /></span>
                  <span className="acct__id">
                    <b>{a.ar}</b>
                    <em>{DATA.CASH_KIND_AR[a.kind]} · <span className="num">{a.acc}</span></em>
                  </span>
                  {a.main && <span className="st st--info">الافتراضي</span>}
                </header>

                <div className="acct__v"><SAR v={a.balance} dec /></div>

                <span className="acct__bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(0, share)}%` }} />
                </span>
                <span className="acct__share">{share.toFixed(0)}٪ من النقد المتاح</span>

                <dl className="acct__meta">
                  <div>
                    <dt>آخر حركة</dt>
                    <dd>
                      {a.lastDate
                        ? <>{fmtDate(a.lastDate)}{a.lastDays > 14 && <em className="is-warn"> · من {a.lastDays} يوم</em>}</>
                        : <em className="hint">مفيش حركة</em>}
                    </dd>
                  </div>
                  <div>
                    <dt>{a.settleDays ? 'التسوية' : 'العملة'}</dt>
                    <dd>{a.settleDays ? `بعد ${a.settleDays} يوم عمل` : a.cur}</dd>
                  </div>
                  <div>
                    <dt>{a.kind === 'cash' ? 'أمين الصندوق' : 'الجهة'}</dt>
                    <dd>{a.keeper || a.provider || DATA.banks.find((b) => b.id === a.bank)?.ar || '—'}</dd>
                  </div>
                </dl>

                {a.iban && <span className="acct__iban ltr num">{a.iban}</span>}
              </article>
            )
          })}
        </div>

        <p className="fnote fnote--quiet">
          الأرصدة دي مجموعها <b>{fmtMoney(total)}</b> ر.س — نفس رقم «النقد» في
          الميزانية العمومية، لأن الاتنين بيتحسبوا من نفس دفتر اليومية.
        </p>
      </section>

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">آخر الحركات</h2>
          <div className="sect__ctrl">
            <button className="gbtn2" onClick={() => ACT.exportCashStatement('كل الحسابات')}>
              <Ico.download size={14} />تصدير CSV
            </button>
          </div>
        </header>
        <RecentMoves nav={nav} />
      </section>

      {form === 'acc' && <AccountForm onClose={() => setForm(null)} />}
      {form === 'rv' && <VoucherForm kind="receipts" onClose={() => setForm(null)} />}
      {form === 'pv' && <VoucherForm kind="payments" onClose={() => setForm(null)} />}
      {form === 'trf' && <TransferForm onClose={() => setForm(null)} />}
    </AppShell>
  )
}

/* آخر ١٢ حركة على كل الحسابات النقدية — مدخل سريع من غير فلترة */
function RecentMoves({ nav }) {
  const rows = useMemo(() => {
    const ids = DATA.cashAccounts.map((a) => a.acc)
    return R.postings(null, TODAY)
      .filter((l) => ids.includes(l.acc))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12)
  }, [])

  if (!rows.length) return <div className="sect__empty"><b>مفيش حركة نقدية بعد</b></div>

  return (
    <div className="tablewrap">
      <table className="dt dt--flat">
        <thead>
          <tr>
            <th style={{ width: '116px' }}>التاريخ</th>
            <th style={{ width: '186px' }}>الحساب</th>
            <th>البيان</th>
            <th style={{ width: '150px' }}>المستند</th>
            <th style={{ width: '132px' }} className="n">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={`${m.no}-${i}`}>
              <td>{fmtDate(m.date)}</td>
              <td>
                <button className="cell-doc cell-doc--link"
                  onClick={() => nav(`/cash/accounts/${m.acc}`)}>{DATA.accName(m.acc)}</button>
              </td>
              <td><span className="itcell"><b>{m.memo}</b>
                {m.party && <em>{m.party}</em>}</span></td>
              <td>
                {m.go
                  ? <button className="cell-doc cell-doc--link num"
                      onClick={() => nav(m.go)}>{m.no}</button>
                  : <span className="num hint">{m.no}</span>}
              </td>
              <td className="n">
                <span className={`flowamt is-${m.dr > 0 ? 'in' : 'out'}`}>
                  {m.dr > 0 ? '+' : '−'}<SAR v={Math.abs(m.dr - m.cr)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

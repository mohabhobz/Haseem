import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, CurrencyNote, Tabs , PageHeader } from '../components/layout.jsx'
import { Chip, Amt } from '../components/ob.jsx'
import { DataTable } from '../components/table.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR, Money, DocNo, StatusCell } from '../components/data.jsx'
import { fmtDate, fmtMoney, daysFrom, TODAY } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { DateField } from '../components/datefield.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة العميل.

   ★ ده **أكبر بند كان فاضل** في المبيعات — مصنّف «طبقة أ» في
   البورد، والبورد طالب أربع تابات بالاسم:
   البروفايل · المستندات المرتبطة · كشف الحساب والرصيد القائم ·
   الدفعات والإشعارات القابلة للاسترداد.

   واللي مكانش موجود في سيستم العميل ولا عندنا: **أعمار الديون**.
   «عليه ١٢ ألف» رقم ساكت؛ «عليه ١٢ ألف منها ٨ متأخرة أكتر من
   شهرين» ده اللي بيخلّي حد يمسك التليفون. عشان كده الرصيد اتقسم
   على شرايح تأخير، وكل شريحة بتفتح فواتيرها.

   والرصيد **متحسب مش مخزّن** — مجموع أرصدة العملاء بيساوي حساب
   الذمم المدينة في ميزان المراجعة بالمليم.
   ============================================================ */

const TABS = [
  { id: 'sum',    label: 'نظرة عامة' },
  { id: 'docs',   label: 'المستندات' },
  { id: 'ledger', label: 'كشف الحساب' },
  { id: 'pays',   label: 'الدفعات والإشعارات' },
]

export default function Customer() {
  const { id } = useParams()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'sum')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [openBucket, setOpenBucket] = useState(null)

  const c = useDoc('customers', id) || DATA.findCustomer(id)

  const invs   = useMemo(() => (c ? DATA.invoicesOf(c.id) : []), [c])
  const quotes = useMemo(() => (c ? DATA.quotesOf(c.id) : []), [c])
  const cns    = useMemo(() => (c ? DATA.cnOf(c.id) : []), [c])
  const dns    = useMemo(() => (c ? DATA.dnOf(c.id) : []), [c])
  const pays   = useMemo(() => (c ? DATA.custPayments(c.id) : []), [c])
  const led    = useMemo(() => (c ? DATA.customerLedger(c.id, from, to) : null), [c, from, to])
  const aging  = useMemo(() => (c ? DATA.agingOf(c.id) : []), [c])

  if (!c) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>العميل ده مش موجود</b>
          <span>يمكن يكون اتحذف. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const bal = DATA.customerBalance(c.id)
  const live = invs.filter((v) => ['issued', 'partial', 'paid', 'overdue'].includes(v.status))
  const sold = live.reduce((s, v) => s + v.total, 0)
  const collected = live.reduce((s, v) => s + (v.paid || 0), 0)
  const late = aging.filter((b) => b.id !== 'cur').reduce((s, b) => s + b.amount, 0)
  const lastS = DATA.lastSale(c.id)
  const b2b = c.type === 'b2b'
  const vatOk = /^3\d{13}3$/.test(c.vat || '')

  const counts = { sum: null, docs: invs.length + quotes.length + cns.length + dns.length,
    ledger: led.rows.length, pays: pays.length + cns.length + dns.length }

  const acts = [
    { id: 'inv',   label: 'فاتورة جديدة', Ic: Ico.plus },
    { id: 'quo',   label: 'عرض سعر جديد', Ic: Ico.plus },
    { id: 'stmt',  label: 'إرسال كشف الحساب', Ic: Ico.send },
    { id: 'edit',  label: 'تعديل بيانات العميل', Ic: Ico.edit },
    { id: 'del',   label: 'حذف العميل', Ic: Ico.trash, tone: 'crit' },
  ]
  const run = (a) => {
    switch (a) {
      case 'inv':  return nav('/sales/invoices/new')
      case 'quo':  return nav('/sales/quotations')
      case 'stmt': return ACT.sendStatement(c, 'email')
      case 'edit': return nav(`/sales/customers/${c.id}/edit`)
      case 'del':  return ACT.deleteCustomer(c, invs.length + quotes.length + cns.length + dns.length)
        .then((ok) => ok && nav('/sales/customers'))
      default: return undefined
    }
  }

  const docRows = [
    ...invs.map((v) => ({ k: 'فاتورة', no: v.no, date: v.date, total: v.total,
      status: v.status, zatca: v.zatca, go: `/sales/invoices/${v.no}` })),
    ...quotes.map((q) => ({ k: 'عرض سعر', no: q.no, date: q.date, total: q.total,
      status: q.status, go: '/sales/quotations' })),
    ...dns.map((n) => ({ k: 'إشعار مدين', no: n.no, date: n.date, total: n.total,
      status: n.status, go: '/sales/debit-notes' })),
    ...cns.map((n) => ({ k: 'إشعار دائن', no: n.no, date: n.date, total: -n.total,
      status: n.status, go: '/sales/credit-notes' })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <AppShell>
      <PageHeader back="/sales/customers" title={c.ar}
        chip={<span className="ob-chips">
          <Chip tone="draft">{b2b ? 'منشأة' : 'فرد'}</Chip>
          {!vatOk && b2b && <Chip tone="warn">رقم ضريبي غير صالح</Chip>}
          {late > 0 && <Chip tone="err">متأخر <Amt v={late} /></Chip>}
          {bal <= 0.009 && <Chip tone="ok">الحساب مقفول</Chip>}
        </span>}
        sub={<span className="num">{c.id}{c.en ? ` · ${c.en}` : ''}</span>}
        actions={<button type="button" className="btn btn--primary" onClick={() => run('inv')}><Ico.plus size={20} />فاتورة جديدة</button>} />

      <div className="docgrid">
        <div className="form">
          <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />

          {/* ---------- ١) نظرة عامة ---------- */}
          {tab === 'sum' && (
            <>
              <section className="fcard">
                <h2 className="fcard__t">التعامل <em>من أول فاتورة اتسجّلت في حسيم</em></h2>
                <div className="kpis">
                  <div className="kpi">
                    <span className="kpi__l">إجمالي المبيعات</span>
                    <span className="kpi__v"><SAR v={sold} /></span>
                    <span className="kpi__s">{live.length} فاتورة صادرة</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">المحصّل</span>
                    <span className="kpi__v"><SAR v={collected} /></span>
                    <span className="kpi__s">{pays.length} دفعة</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">المتبقي عليه</span>
                    <span className="kpi__v"><SAR v={bal} /></span>
                    <span className="kpi__s">
                      {sold > 0 ? `${Math.round((collected / sold) * 100)}٪ اتحصّل` : '—'}
                    </span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">آخر تعامل</span>
                    <span className="kpi__v">
                      {lastS ? <span style={{ fontSize: 'var(--fs-md)' }}>{fmtDate(lastS.date)}</span>
                             : <em className="hint">مفيش</em>}
                    </span>
                    <span className="kpi__s">{lastS ? lastS.no : '—'}</span>
                  </div>
                </div>
              </section>

              {/* ★ أعمار الديون — مش موجودة عنده ولا في البورد */}
              <section className="fcard">
                <h2 className="fcard__t">
                  أعمار الدين <em>«عليه كام» مش كفاية — «بقاله قد إيه» هي اللي بتحرّك</em>
                </h2>
                {bal <= 0.009 ? (
                  <p className="fempty">مفيش مستحقات — الحساب مقفول.</p>
                ) : (
                  <>
                    <div className="aging">
                      {aging.map((b) => {
                        const pct = bal > 0 ? (b.amount / bal) * 100 : 0
                        const on = openBucket === b.id
                        const live$ = b.docs.length > 0
                        return (
                          <button key={b.id}
                            className={`aging__c${b.id === 'cur' ? ' is-cur' : ''}${on ? ' is-on' : ''}${live$ ? ' is-live' : ''}`}
                            disabled={!live$}
                            onClick={() => setOpenBucket(on ? null : b.id)}>
                            <span className="aging__l">{b.ar}</span>
                            <span className="aging__v"><SAR v={b.amount} /></span>
                            <span className="aging__b" aria-hidden="true">
                              <i style={{ width: `${pct}%` }} />
                            </span>
                            <span className="aging__n">
                              {b.docs.length ? `${b.docs.length} فاتورة · ${pct.toFixed(0)}٪` : '—'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {openBucket && (
                      <ul className="latelist" style={{ marginTop: 14 }}>
                        {aging.find((b) => b.id === openBucket).docs.map((v) => (
                          <li key={v.no}>
                            <button className="cell-doc cell-doc--link"
                              onClick={() => nav(`/sales/invoices/${v.no}`)}>{v.no}</button>
                            <span className="latelist__d">
                              {v.late > 0 ? `متأخرة ${v.late} يوم — استحقت ${fmtDate(v.due)}`
                                          : `تستحق ${fmtDate(v.due)}`}
                            </span>
                            <span className="latelist__m"><SAR v={v.due$} /></span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="fnote fnote--quiet">
                      المجموع <b><Amt v={bal} /></b> — نفس الرقم اللي في حساب الذمم المدينة
                      في <button className="linkish" onClick={() => nav('/reports/trial-balance')}>ميزان المراجعة</button>.
                    </p>
                  </>
                )}
              </section>

              <section className="fcard">
                <h2 className="fcard__t">اللي بيشتريه</h2>
                {(() => {
                  const m = {}
                  live.forEach((v) => DATA.linesOf(v).forEach((l) => {
                    m[l.code] = m[l.code] || { code: l.code, ar: l.ar, qty: 0, val: 0, last: v.date }
                    m[l.code].qty += l.qty; m[l.code].val += l.total
                    if (v.date > m[l.code].last) m[l.code].last = v.date
                  }))
                  const list = Object.values(m).sort((a, b) => b.val - a.val)
                  if (!list.length) return <p className="fempty">لسه ما اشترىش أي صنف.</p>
                  return (
                    <ul className="buylist">
                      {list.map((r) => (
                        <li key={r.code}>
                          <span className="buylist__n">
                            <b>{r.ar}</b><em>آخر مرة {fmtDate(r.last)}</em>
                          </span>
                          <span className="buylist__q num">{r.qty}</span>
                          <span className="buylist__v"><SAR v={r.val} /></span>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </section>
            </>
          )}

          {/* ---------- ٢) المستندات المرتبطة ---------- */}
          {tab === 'docs' && (
            <section className="fcard">
              <h2 className="fcard__t">المستندات المرتبطة <em>كل حاجة اتعملت للعميل ده</em></h2>
              {docRows.length === 0 ? (
                <p className="fempty">مفيش مستندات على العميل ده.</p>
              ) : (
                <DataTable selectable={false}
                  columns={[
                    { label: 'النوع', width: '124px' },
                    { label: 'الرقم', width: '150px' },
                    { label: 'التاريخ', width: '124px' },
                    { label: 'الحالة', width: '150px' },
                    { label: 'المبلغ', num: true, width: '136px' },
                  ]}
                  rows={docRows.map((d) => ({
                    key: d.no, onOpen: () => nav(d.go),
                    cells: [
                      <span className="taxpill">{d.k}</span>,
                      <DocNo value={d.no} onClick={() => nav(d.go)} />,
                      <span>{fmtDate(d.date)}</span>,
                      <StatusCell status={d.status} zatca={d.zatca} />,
                      <span className={d.total < 0 ? 'is-warn' : ''}>
                        <Money value={Math.abs(d.total)} />
                        {d.total < 0 && <em style={{ fontStyle: 'normal', fontSize: 'var(--fs-micro)' }}> ناقص</em>}
                      </span>,
                    ],
                  }))}
                />
              )}
            </section>
          )}

          {/* ---------- ٣) كشف الحساب ---------- */}
          {tab === 'ledger' && (
            <section className="fcard">
              <div className="fcard__h">
                <h2 className="fcard__t">
                  كشف الحساب <em>الفاتورة مدين والتحصيل دائن — حساب العميل ذمم مدينة</em>
                </h2>
                <button className="gbtn2" onClick={() => ACT.sendStatement(c, 'email')}>
                  <Ico.send size={14} />إرسال الكشف
                </button>
              </div>

              <div className="frow frow--2">
                <DateField label="من تاريخ" value={from} onChange={setFrom} />
                <DateField label="إلى تاريخ" value={to} onChange={setTo} />
              </div>

              <div className="tablewrap" style={{ marginTop: 16 }}>
                <table className="dt dt--flat">
                  <thead>
                    <tr>
                      <th style={{ width: '118px' }}>التاريخ</th>
                      <th style={{ width: '140px' }}>النوع</th>
                      <th>المرجع</th>
                      <th className="n" style={{ width: '128px' }}>مدين</th>
                      <th className="n" style={{ width: '128px' }}>دائن</th>
                      <th className="n" style={{ width: '136px' }}>الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="ldg__open">
                      <td colSpan={5}>رصيد افتتاحي</td>
                      <td className="n"><SAR v={led.open} dec /></td>
                    </tr>
                    {led.rows.map((r, i) => (
                      <tr key={i} className={r.go ? 'is-open' : ''}
                        onClick={r.go ? () => nav(r.go) : undefined}>
                        <td>{fmtDate(r.date)}</td>
                        <td><span className={`ldg__k ldg__k--${r.dr ? 'dr' : 'cr'}`}>{r.kind}</span></td>
                        <td className="num" style={{ fontSize: 'var(--fs-xs)' }}>{r.ref}</td>
                        <td className="n">{r.dr ? <SAR v={r.dr} dec /> : <span className="hint">—</span>}</td>
                        <td className="n">{r.cr ? <SAR v={r.cr} dec /> : <span className="hint">—</span>}</td>
                        <td className="n"><SAR v={r.bal} dec /></td>
                      </tr>
                    ))}
                    <tr className="ldg__close">
                      <td colSpan={3}>الرصيد الختامي — اللي عليه</td>
                      <td className="n"><SAR v={led.totDr} dec /></td>
                      <td className="n"><SAR v={led.totCr} dec /></td>
                      <td className="n"><SAR v={led.close} dec /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {led.rows.length === 0 && <p className="fempty">مفيش حركة في الفترة دي.</p>}
              <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
                المسودات والملغاة مش في الكشف — الفاتورة بتدخل حساب العميل عند الإصدار.
              </p>
            </section>
          )}

          {/* ---------- ٤) الدفعات والإشعارات ---------- */}
          {tab === 'pays' && (
            <>
              <section className="fcard">
                <h2 className="fcard__t">الدفعات المحصّلة</h2>
                {pays.length === 0 ? (
                  <p className="fempty">ما اتحصّلش أي مبلغ من العميل ده.</p>
                ) : (
                  <ul className="rail__pays" style={{ gap: 14 }}>
                    {pays.map((p, i) => (
                      <li key={i}>
                        <b><SAR v={p.amount} dec /></b>
                        <em>{fmtDate(p.date)}</em>
                        <span>
                          {p.way} · {p.ref} ·{' '}
                          <button className="linkish" onClick={() => nav(p.go)}>{p.no}</button>
                          {' · '}
                          <button className="linkish" onClick={() => ACT.reverseReceipt(p)}>عكس التحصيل</button>
                          {' · '}
                          <button className="linkish" onClick={() => ACT.downloadReceipt(p)}>سند القبض</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="fcard">
                <h2 className="fcard__t">
                  الإشعارات <em>الدائن بيقلّل اللي عليه، والمدين بيزوّده</em>
                </h2>
                {cns.length + dns.length === 0 ? (
                  <p className="fempty">مفيش إشعارات على العميل ده.</p>
                ) : (
                  <DataTable selectable={false}
                    columns={[
                      { label: 'النوع', width: '124px' },
                      { label: 'الرقم', width: '146px' },
                      { label: 'السبب' },
                      { label: 'الفاتورة الأصلية', width: '146px' },
                      { label: 'الحالة', width: '140px' },
                      { label: 'المبلغ', num: true, width: '128px' },
                    ]}
                    rows={[...cns.map((n) => ({ ...n, k: 'دائن' })), ...dns.map((n) => ({ ...n, k: 'مدين' }))]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((n) => ({
                        key: n.no,
                        onOpen: () => nav(n.k === 'دائن' ? '/sales/credit-notes' : '/sales/debit-notes'),
                        cells: [
                          <span className={`ldg__k ldg__k--${n.k === 'دائن' ? 'cr' : 'dr'}`}>
                            إشعار {n.k}
                          </span>,
                          <DocNo value={n.no} />,
                          <span>{n.reason || <em className="hint">—</em>}</span>,
                          n.src
                            ? <button className="cell-doc cell-doc--link"
                                onClick={(e) => { e.stopPropagation(); nav(`/sales/invoices/${n.src}`) }}>
                                {n.src}
                              </button>
                            : <span className="hint">—</span>,
                          <StatusCell status={n.status} zatca={n.zatca} zatcaReason={n.zatcaReason} />,
                          <Money value={n.total} />,
                        ],
                      }))}
                  />
                )}
              </section>
            </>
          )}
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">الرصيد عليه</span>
            <div className="rail__v"><SAR v={bal} dec /></div>
            <span className={`rail__due${late > 0 ? ' is-late' : ''}`}>
              {bal <= 0.009 ? 'الحساب مقفول — مفيش مستحقات'
                : late > 0 ? <>منها <Amt v={late} /> متأخرة</>
                : 'كلها لسه في مواعيدها'}
            </span>
            {sold > 0 && (
              <span className="rail__bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (collected / sold) * 100)}%` }} />
              </span>
            )}
            <dl className="rail__sum">
              <div><dt>إجمالي المبيعات</dt><dd><SAR v={sold} /></dd></div>
              <div><dt>المحصّل</dt><dd><SAR v={collected} /></dd></div>
              <div><dt>المتبقي</dt><dd className={bal > 0.009 ? 'is-plus' : ''}><SAR v={bal} /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات العميل</span>
            <dl className="deflist">
              <div><dt>رمز العميل</dt><dd className="num">{c.id}</dd></div>
              <div><dt>الرقم الضريبي</dt>
                <dd className={`num${!vatOk && b2b ? ' is-warn' : ''}`}>
                  {c.vat || <em className="hint">غير مسجّل</em>}
                </dd></div>
              <div><dt>الجوال</dt><dd className="num" dir="ltr">{c.phone || <em className="hint">—</em>}</dd></div>
              <div><dt>المدينة</dt><dd>{c.city}</dd></div>
              <div><dt>شروط السداد</dt><dd>{c.terms || <em className="hint">—</em>}</dd></div>
              <div><dt>النوع</dt><dd>{b2b ? 'منشأة (B2B)' : 'فرد (B2C)'}</dd></div>
            </dl>

            {/* كارت الجاهزية — نفس اللي في فورم العميل */}
            <span className="rail__lbl" style={{ marginTop: 16, display: 'block' }}>
              جاهزية فواتيره للهيئة
            </span>
            <ul className="rail__check">
              <li className={vatOk ? 'is-ok' : ''}>
                <Ico.check size={15} />
                <span>رقم ضريبي صالح
                  {!vatOk && <em style={{ display: 'block', fontStyle: 'normal',
                    fontSize: '.6875rem', color: 'var(--ink-faint)' }}>
                    من غيره فاتورة B2B بتترفض عند الهيئة</em>}</span>
              </li>
              <li className={c.city ? 'is-ok' : ''}>
                <Ico.check size={15} /><span>العنوان الوطني مسجّل</span>
              </li>
              <li className={c.phone ? 'is-ok' : ''}>
                <Ico.check size={15} /><span>وسيلة تواصل للإرسال</span>
              </li>
            </ul>
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
    </AppShell>
  )
}

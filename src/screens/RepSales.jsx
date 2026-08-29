import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow, BarList } from '../components/reportshell.jsx'
import { TrendBars } from '../components/charts.jsx'
import { DataTable, Pagination } from '../components/table.jsx'
import { SearchField } from '../components/primitives.jsx'
import { Money, DocNo, StatusCell } from '../components/data.jsx'
import { useSort, byDate, byNum, byText, periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   تقرير المبيعات.

   ده أغنى تقرير عند العميل — عشر فلاتر وستة كروت. بس:
   • `Invoices` و`Tax` و`Description` بالإنجليزي
   • «مقيدة بإشعار» متكرّرة مرتين في قايمة الحالة
   • «مندوب المبيعات» قايمة فاضية خيارها الوحيد «غير محدد»
   • عمودا «الصنف» و«Description» بيعرضوا **نفس القيمة**
   • الستة كروت بنفس الحجم — «إجمالي المبيعات» زي «عدد البنود»

   هنا: كارت قائد واحد، والباقي تابع؛ والفلاتر شغّالة على داتا
   حقيقية؛ وكل صف بيوصل لفاتورته.
   ============================================================ */

const PER_PAGE = 14
const ST = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'issued', label: 'صادرة' },
  { id: 'partial', label: 'مدفوعة جزئيًا' },
  { id: 'paid', label: 'مدفوعة' },
  { id: 'overdue', label: 'متأخرة' },
]

export default function RepSales() {
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })
  const [cust, setCust] = useState('all')
  const [item, setItem] = useState('all')
  const [rep, setRep] = useState('all')
  const [st, setSt] = useState('all')
  const [q, setQ] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState(null)

  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const all = useMemo(() => R.salesLines(from, to), [from, to])

  const rows = useMemo(() => all.filter((l) => {
    if (cust !== 'all' && l.c?.id !== cust) return false
    if (item !== 'all' && l.code !== item) return false
    if (st !== 'all' && l.status !== st) return false
    if (min && l.net < Number(min)) return false
    if (max && l.net > Number(max)) return false
    const s = q.trim().toLowerCase()
    if (s && ![l.no, l.ar, l.c?.ar, l.c?.en].some((x) => String(x || '').toLowerCase().includes(s))) return false
    return true
  }), [all, cust, item, st, q, min, max])

  const S = useSort({
    date: byDate('date'), no: byText('no'),
    cust: (a, b) => String(a.c?.ar || '').localeCompare(String(b.c?.ar || ''), 'ar'),
    net: byNum('net'), qty: byNum('qty'),
  }, 'date')

  const sorted = useMemo(() => S.apply(rows), [rows, S.sort])

  /* المقارنة بالفترة السابقة — مش موجودة عند العميل خالص */
  const prev = R.prevPeriod(from, to)
  const prevRows = useMemo(() => R.salesLines(prev.from, prev.to), [prev.from, prev.to])

  const sum = useMemo(() => {
    const net = rows.reduce((a, l) => a + l.net, 0)
    const vat = rows.reduce((a, l) => a + l.vat, 0)
    return {
      net: +net.toFixed(2), vat: +vat.toFixed(2), total: +(net + vat).toFixed(2),
      invoices: new Set(rows.map((l) => l.no)).size,
      lines: rows.length,
      qty: rows.reduce((a, l) => a + l.qty, 0),
      prevNet: +prevRows.reduce((a, l) => a + l.net, 0).toFixed(2),
    }
  }, [rows, prevRows])

  /* التوزيعات — أسئلة «مين الأكبر» */
  const byCustomer = useMemo(() => {
    const m = {}
    rows.forEach((l) => {
      const k = l.c?.id || '—'
      m[k] = m[k] || { id: k, ar: l.c?.ar || 'بدون عميل', amount: 0, n: new Set(), go: l.c ? `/sales/customers` : null }
      m[k].amount += l.net; m[k].n.add(l.no)
    })
    return Object.values(m).map((x) => ({ ...x, amount: +x.amount.toFixed(2), sub: `${x.n.size} فاتورة` }))
      .sort((a, b) => b.amount - a.amount)
  }, [rows])

  const byItem = useMemo(() => {
    const m = {}
    rows.forEach((l) => {
      m[l.code] = m[l.code] || { id: l.code, ar: l.ar, amount: 0, qty: 0 }
      m[l.code].amount += l.net; m[l.code].qty += l.qty
    })
    return Object.values(m).map((x) => ({ ...x, amount: +x.amount.toFixed(2), sub: `${x.qty} وحدة` }))
      .sort((a, b) => b.amount - a.amount)
  }, [rows])

  /* المطابقة مع قائمة الدخل — الرقمين بيختلفوا بالإشعارات بس،
     وأحسن نقولها بدل ما المستخدم يكتشفها ويشك في الاتنين. */
  const recon = useMemo(() => {
    const inc = R.incomeStatement(from, to)
    return { cn: inc.returns, dn: +(inc.netSales + inc.returns - sum.net).toFixed(2),
      netSales: inc.netSales }
  }, [from, to, sum.net])

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = sorted.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  /* ★ اتجاه المبيعات شهريًا — من قيود الإيراد نفسها، فالرسم
     ما ينفعش يخالف الأرقام اللي فوقه ولا قائمة الدخل. */
  const trend = useMemo(
    () => R.salesTrend(from, to).map((m) => ({
      key: m.key, label: m.label, value: m.net,
      sub: m.docs ? `${m.docs} مستند` : null,
    })), [from, to])

  const CUSTS = [...new Map(all.map((l) => [l.c?.id, l.c])).values()].filter(Boolean)
  const ITEMS = [...new Map(all.map((l) => [l.code, l.ar])).entries()]

  const col = S.col

  return (
    <ReportShell
      title="تقرير المبيعات"
      sub="كل بند اتباع في الفترة، ومين اشتراه"
      period={period} onPeriod={reset(setPeriod)}
      note={<>
        المسودات والملغاة مش في التقرير — بيعد الفواتير الصادرة بس، زي ما بتتحسب في دفتر الأستاذ.
        {' '}الفرق بين الرقم ده و«صافي المبيعات» في قائمة الدخل هو الإشعارات:{' '}
        <b>{fmtMoney(sum.net)}</b> بنود {recon.dn > 0 ? <>+ <b>{fmtMoney(recon.dn)}</b> إشعارات مدينة </> : null}
        − <b>{fmtMoney(recon.cn)}</b> إشعارات دائنة = <b>{fmtMoney(recon.netSales)}</b> صافي المبيعات.
      </>}
      extra={
        <>
          <label className="repbar__f">
            <span className="repbar__l">العميل</span>
            <select className="fld__i" value={cust} onChange={(e) => reset(setCust)(e.target.value)}>
              <option value="all">كل العملاء</option>
              {CUSTS.map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}
            </select>
          </label>
          <label className="repbar__f">
            <span className="repbar__l">الصنف</span>
            <select className="fld__i" value={item} onChange={(e) => reset(setItem)(e.target.value)}>
              <option value="all">كل الأصناف</option>
              {ITEMS.map(([code, ar]) => <option key={code} value={code}>{ar}</option>)}
            </select>
          </label>
          <label className="repbar__f">
            <span className="repbar__l">المندوب</span>
            <select className="fld__i" value={rep} onChange={(e) => reset(setRep)(e.target.value)}>
              <option value="all">كل المندوبين</option>
              {DATA.reps.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
            </select>
          </label>
          <label className="repbar__f">
            <span className="repbar__l">حالة الفاتورة</span>
            <select className="fld__i" value={st} onChange={(e) => reset(setSt)(e.target.value)}>
              {ST.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
          <label className="repbar__f repbar__f--num">
            <span className="repbar__l">المبلغ من</span>
            <input className="fld__i num" type="number" value={min} placeholder="0"
              onChange={(e) => reset(setMin)(e.target.value)} />
          </label>
          <label className="repbar__f repbar__f--num">
            <span className="repbar__l">إلى</span>
            <input className="fld__i num" type="number" value={max} placeholder="—"
              onChange={(e) => reset(setMax)(e.target.value)} />
          </label>
        </>
      }
    >
      <KpiRow
        value={view} onPick={setView}
        items={[
          { id: 'total', lead: true, label: 'إجمالي المبيعات', value: sum.total, dec: true,
            sub: `${sum.invoices} فاتورة · ${sum.lines} بند`,
            delta: R.delta(sum.net, sum.prevNet) },
          { id: 'net', label: 'قبل الضريبة', value: sum.net, dec: true, drill: true,
            sub: 'الأساس الخاضع' },
          { id: 'vat', label: 'ضريبة المخرجات', value: sum.vat, dec: true,
            sub: 'بتدخل الخانة ١' },
          { id: 'cust', label: 'أكبر عميل', value: byCustomer[0]?.amount || 0, drill: true,
            sub: byCustomer[0]?.ar || '—' },
          { id: 'item', label: 'أكتر صنف مبيعًا', value: byItem[0]?.amount || 0, drill: true,
            sub: byItem[0]?.ar || '—' },
        ]}
      />

      <TrendBars rows={trend} title="اتجاه المبيعات شهريًا"
        hint="صافي المبيعات بعد الإشعارات — الأقدم يمين"
        empty="مفيش فواتير صادرة في الفترة دي." />

      {view === 'cust' && (
        <BarList title="المبيعات حسب العميل" hint="النسبة من إجمالي المبيعات قبل الضريبة"
          rows={byCustomer} total={sum.net} onGo={(g) => nav(g)} />
      )}
      {view === 'item' && (
        <BarList title="المبيعات حسب الصنف" hint="النسبة من إجمالي المبيعات قبل الضريبة"
          rows={byItem} total={sum.net} />
      )}
      {view === 'net' && (
        <section className="sect">
          <header className="sect__h"><h2 className="sect__t">تكوين المبلغ</h2></header>
          <ul className="efflist">
            <li><span className="efflist__k">قبل الضريبة</span>
              <span className="efflist__v"><b>{fmtMoney(sum.net)}</b> ر.س — ده اللي بيدخل الإيراد</span></li>
            <li><span className="efflist__k">ضريبة ١٥٪</span>
              <span className="efflist__v"><b>{fmtMoney(sum.vat)}</b> ر.س — التزام على المنشأة مش إيراد</span></li>
            <li><span className="efflist__k">الإجمالي</span>
              <span className="efflist__v"><b>{fmtMoney(sum.total)}</b> ر.س — اللي العميل بيدفعه</span></li>
          </ul>
        </section>
      )}

      <section className="sect" data-component="SalesLinesTable">
        <header className="sect__h">
          <h2 className="sect__t">بنود المبيعات<span className="sect__n">{sorted.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="رقم الفاتورة أو العميل أو الصنف…" width={280}
              value={q} onChange={reset(setQ)} />
          </div>
        </header>

        {sorted.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش بنود بالفلترة دي</b>
            <span>وسّع الفترة أو امسح الفلاتر.</span>
          </div>
        ) : (
          <>
            <DataTable
              selectable={false}
              columns={[
                col('الفاتورة', 'no', { width: '132px' }),
                col('التاريخ', 'date', { width: '118px' }),
                col('العميل', 'cust'),
                { label: 'الصنف' },
                col('الكمية', 'qty', { num: true, width: '92px' }),
                { label: 'سعر الوحدة', num: true, width: '112px' },
                col('قبل الضريبة', 'net', { num: true, width: '128px' }),
                { label: 'الحالة', width: '124px' },
              ]}
              rows={shown.map((l) => ({
                key: l.key,
                onOpen: () => nav(l.go),
                cells: [
                  <DocNo value={l.no} onClick={() => nav(l.go)} />,
                  <span>{fmtDate(l.date)}</span>,
                  <span className="itcell"><b>{l.c?.ar}</b><em>{l.c?.city}</em></span>,
                  <span className="itcell"><b>{l.ar}</b><em className="num">{l.code}</em></span>,
                  <span className="num">{l.qty} {l.unit}</span>,
                  <Money value={l.price} />,
                  <Money value={l.net} />,
                  <StatusCell status={l.status} />,
                ],
              }))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={sorted.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>
    </ReportShell>
  )
}

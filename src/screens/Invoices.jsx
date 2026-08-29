import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { docMenu } from '../components/rowmenu.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { GROUPS, groupOf, Group, MoneyHead, ChangeLine, ViewToggle } from '../components/doclist.jsx'
import { PageFilter, FilterChips, DateRange, applyFilter, emptyFilter, inPeriod,
  useSort, byDate, byNum, byText, byParty } from '../components/pagefilter.jsx'
import { daysFrom, TODAY } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'

const LIVE = ['issued', 'partial', 'overdue']

/* التغييرات اللي جت من برة الشاشة */
const CHANGES = ['فاتورة اترفضت من الهيئة', 'دفعتين اتسجّلوا', 'فاتورة بقت متأخرة']

/* المدن اللي فيها عملاء فعلًا — مفيش خيار بيرجّع صفر */
const CITIES = [...new Set(DATA.invoices.map((v) => v.c?.city).filter(Boolean))]

/* ---------- أبعاد الفلترة جوّه الجدول ----------
   الفترة مش هنا — دي فوق، لأنها بتغيّر «إيه اللي بنتكلم عنه» مش «إيه اللي بنعرضه». */
const FGROUPS = [
  {
    id: 'state', label: 'الحالة',
    options: [
      { id: 'all',    label: 'الكل' },
      { id: 'act',    label: 'محتاج تصرّف', test: (v) => groupOf(v) === 0 },
      { id: 'live',   label: 'تحت التحصيل', test: (v) => groupOf(v) === 1 },
      { id: 'draft',  label: 'مسودات',      test: (v) => v.status === 'draft' },
      { id: 'closed', label: 'مقفولة',      test: (v) => ['paid', 'void', 'cancelled'].includes(v.status) },
    ],
  },
  {
    id: 'zatca', label: 'الهيئة',
    options: [
      { id: 'all',     label: 'الكل' },
      { id: 'ok',      label: 'مقبولة',     test: (v) => v.zatca === 'ok' },
      { id: 'bad',     label: 'مرفوضة',     test: (v) => v.zatca === 'bad' },
      { id: 'pending', label: 'عند الهيئة', test: (v) => v.zatca === 'pending' },
      { id: 'none',    label: 'ما اتصدرتش', test: (v) => !v.zatca },
    ],
  },
  {
    id: 'due', label: 'الاستحقاق',
    options: [
      { id: 'all',   label: 'الكل' },
      { id: 'late',  label: 'متأخرة',     test: (v) => LIVE.includes(v.status) && daysFrom(v.due) < 0 },
      { id: 'week',  label: 'خلال أسبوع', test: (v) => { const d = daysFrom(v.due); return LIVE.includes(v.status) && d !== null && d >= 0 && d <= 7 } },
      { id: 'month', label: 'خلال شهر',   test: (v) => { const d = daysFrom(v.due); return LIVE.includes(v.status) && d !== null && d >= 0 && d <= 30 } },
    ],
  },
  {
    id: 'cred', label: 'الإشعارات',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'has',  label: 'مقيّدة بإشعار',
        test: (v) => !!DATA.creditedState(v.no, v.total) },
      { id: 'none', label: 'من غير إشعارات',
        test: (v) => !DATA.creditedState(v.no, v.total) },
    ],
  },
  {
    id: 'cust', label: 'العميل',
    options: [
      { id: 'all', label: 'الكل' },
      ...DATA.customers.map((c) => ({ id: c.id, label: c.ar, test: (v) => v.c?.id === c.id })),
    ],
  },
  {
    id: 'city', label: 'المدينة',
    options: [
      { id: 'all', label: 'الكل' },
      ...CITIES.map((c) => ({ id: c, label: c, test: (v) => v.c?.city === c })),
    ],
  },
]

export default function Invoices() {
  const nav = useNavigate()
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState({ id: 'y' })
  /* الشاشة بتقبل فلترة جاهزة من الرابط، عشان أي حتة تانية في
     السيستم (الداشبورد · الإشعارات) تقدر توديك على «الفواتير
     المرفوضة» مش على «كل الفواتير». مثال: ?zatca=bad */
  const [params] = useSearchParams()
  const [filter, setFilter] = useState(() => {
    const f = emptyFilter(FGROUPS)
    FGROUPS.forEach((g) => {
      const v = params.get(g.id)
      if (v && g.options.some((o) => o.id === v)) f[g.id] = v
    })
    return f
  })
  const [q, setQ] = useState('')
  const { selected, toggle, selectAll, clear } = useSelection()

  /* ★ الفترة بتحدّد الشغلانة كلها — الانسايتس والجدول بيقروا من نفس المصدر */
  const all = useDocs('invoices')
  const inRange = useMemo(
    () => all.filter((v) => inPeriod(v, period, TODAY)), [all, period])

  /* فلترة الجدول جوّه الفترة */
  const rows = useMemo(
    () => applyFilter(inRange, FGROUPS, filter, q), [inRange, filter, q])

  /* الترتيب — بيشتغل في عرض الجدول. عرض القائمة مرتّب بالأولوية
     أصلًا، فالترتيب هناك ملهوش معنى. */
  const S = useSort({
    no: byText('no'), party: byParty, date: byDate('date'),
    due: byDate('due'), total: byNum('total'),
  }, 'due')

  /* ★ الترتيب كان بيسري على الجدول بس، والقائمة مرتّبة بالأولوية
     جوّه كل مجموعة من غير ما المستخدم يتحكّم. دلوقتي نفس الترتيب
     بيتطبّق **جوّه كل مجموعة** — فالمبدّل بين العرضين مش بيغيّر
     المعنى، بيغيّر الشكل بس. */
  const grouped = useMemo(() => {
    const g = GROUPS.map(() => [])
    S.apply(rows).forEach((v) => g[groupOf(v)].push(v))
    return g
  }, [rows, S.sort])

  const open = (no) => nav(`/sales/invoices/${no}`)

  /* كل أوامر الصف بتعدّي من هنا. الشاشة بتعرف «مين» بس؛
     «إيه اللي بيحصل» عايش في lib/actions.js. */
  const on = (id, v) => {
    switch (id) {
      case 'issue':    return ACT.issueDoc('invoices', v)
      case 'resubmit': return ACT.resubmitZatca('invoices', v)
      case 'pay':      return open(v.no)
      case 'mail':     return ACT.sendEmail('invoices', v)
      case 'email':    return ACT.sendEmail('invoices', v)
      case 'wa':       return ACT.sendWhatsApp('invoices', v)
      case 'correct':  return ACT.correctDoc('invoices', v, () => nav('/sales/invoices/new'))
      case 'view':     return open(v.no)
      case 'pdf':      return ACT.downloadPdf('invoices', v)
      case 'xml':      return ACT.downloadXml('invoices', v)
      case 'print':    return ACT.printDoc()
      case 'cn':       return nav('/sales/credit-notes/new')
      case 'cancel':   return ACT.cancelDoc('invoices', v)
      default: return undefined
    }
  }
  const bulk = (label) => ACT.bulkAction(label, 'invoices', [...selected]).then(clear)
  const byNo = (no) => rows.find((v) => v.no === no)

  const tableRows = S.apply(rows).map((v) => {
    const rem = v.total - v.paid
    const live = LIVE.includes(v.status)
    let sub = ''
    if (v.status === 'overdue') sub = `متأخرة ${v.overdueDays} يوم`
    if (v.status === 'partial') sub = `سُدِّد ${Math.round((v.paid / v.total) * 100)}٪`
    const act = v.status === 'draft' ? { label: 'إصدار', onClick: () => on('issue', v) }
      : v.zatca === 'bad' ? { label: 'إعادة الإرسال', tone: 'crit', onClick: () => on('resubmit', v) }
      : null
    return {
      key: v.no,
      onOpen: () => open(v.no),
      action: act,
      menu: docMenu({ zatca: v.zatca, status: v.status, onView: () => open(v.no), on: (id) => on(id, v) }),
      cells: [
        <DocNo value={v.no} />,
        <PartyCell party={v.c} />,
        <DateCell value={v.date} />,
        <DateCell value={v.due} rel={v.status === 'issued' || v.status === 'partial'} />,
        <span className="stwrap">
          <StatusCell status={v.status} zatca={v.zatca} zatcaReason={v.zatcaReason} sub={sub} />
          {(() => {
            const cr = DATA.creditedState(v.no, v.total)
            return cr ? (
              <span className={`st st--${cr.full ? 'neutral' : 'info'} st--mini`}
                title={`إشعارات بقيمة ${cr.amount} — المبلغ المعدّل ${cr.net}`}>
                {cr.full ? 'مقيّدة بالكامل' : 'مقيّدة بإشعار'}
              </span>
            ) : null
          })()}
        </span>,
        <Money value={v.total} muted={v.status === 'cancelled' || v.status === 'void'} />,
        live && rem > 0 ? <Money value={rem} /> : <span className="hint" />,
      ],
    }
  })

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="فواتير المبيعات" sub={<CurrencyNote />} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="فاتورة جديدة" variant="primary" icon="＋"
            onClick={() => nav('/sales/invoices/new')} />
        </div>
      </div>

      <MoneyHead rows={inRange} />
      <ChangeLine items={CHANGES}
        onOpen={() => toast.info('التغييرات دي بتيجي من سجل النشاط',
          { sub: 'هتتربط بشاشة السجل لما الموديول بتاعها يتعمل' })} />

      {/* ---------- الجدول: اسمه ظاهر، والفلترة والعرض بتوعه جنبه ---------- */}
      <section className="sect" data-component="InvoiceTable">
        <header className="sect__h">
          <h2 className="sect__t">الفواتير<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث باسم العميل أو رقم الفاتورة…" width={260}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={inRange.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش فواتير بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : view === 'list' ? (
          <div className="dlist" data-component="DocList">
            {GROUPS.map((g, i) => (
              <Group key={g.id} group={g} rows={grouped[i]}
                selected={selected} onSelect={toggle} onOpen={open} on={on} />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                S.col('رقم الفاتورة', 'no', { width: '112px' }),
                S.col('العميل', 'party'),
                S.col('تاريخ الإصدار', 'date', { width: '116px' }),
                S.col('الاستحقاق', 'due', { width: '132px' }),
                { label: 'الحالة', width: '232px' },
                S.col('المبلغ', 'total', { num: true, width: '125px' }),
                { label: 'المتبقي', num: true, width: '112px' },
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, rows.map((v) => v.no))}
            />
            <Pagination from={1} to={rows.length} total={rows.length} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear} onAction={bulk}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'تعليم كمدفوعة', 'إلغاء المسودات', 'تصدير CSV']} />
    </AppShell>
  )
}

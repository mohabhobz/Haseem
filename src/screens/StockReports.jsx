import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { useSort, byNum, byText } from '../components/pagefilter.jsx'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   تقارير المخزون — تقرير التقييم والرصيد الفعلي.

   نفس التبويبين والأعمدة اللي في سيستم العميل بالظبط.
   اللي اتغيّر:

   ١. **التقرير بيتحمّل لوحده.** في سيستمه لازم تدوس «تحديث»
      عشان تشوف أي رقم — يعني الشاشة بتفتح فاضية. الزرار موجود
      هنا برضه بس كـ«إعادة احتساب»، مش شرط للعرض.
   ٢. **صف الإجمالي فوق مش تحت** — الرقم اللي جاي عشانه المستخدم
      ميستناش يسكرول لآخر الجدول.
   ============================================================ */

const TABS = [
  { id: 'val',  label: 'تقرير التقييم' },
  { id: 'live', label: 'الرصيد الفعلي' },
]

export default function StockReports() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState('val')
  const [store, setStore] = useState(params.get('store') || 'all')
  const [q, setQ] = useState('')

  const Sv = useSort({
    name: byText('ar'), qty: (a, b) => a.qty - b.qty, value: (a, b) => a.value - b.value,
  }, 'value')
  const Sl = useSort({
    store: (a, b) => String(a.storeAr).localeCompare(String(b.storeAr), 'ar'),
    name: byText('ar'), qty: (a, b) => a.qty - b.qty,
  }, 'qty')

  const match = (it) => {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return [it.ar, it.en, it.sku].some((x) => String(x || '').toLowerCase().includes(s))
  }

  /* تقرير التقييم — سطر لكل صنف، الرصيد الكلي × متوسط التكلفة */
  const valRows = useMemo(() => DATA.stockItems()
    .filter(match)
    .map((it) => {
      const qty = store === 'all' ? DATA.stockOf(it.sku) : DATA.stockAt(it.sku, store)
      return { ...it, qty, value: +(qty * (it.cost || 0)).toFixed(2) }
    })
    .filter((r) => r.qty !== 0), [q, store])

  /* الرصيد الفعلي — سطر لكل صنف في كل مستودع */
  const liveRows = useMemo(() => {
    const out = []
    DATA.stockItems().filter(match).forEach((it) => {
      DATA.stores.forEach((s) => {
        if (store !== 'all' && s.id !== store) return
        const qty = DATA.stockAt(it.sku, s.id)
        if (qty === 0) return
        out.push({ ...it, storeId: s.id, storeAr: s.ar, qty })
      })
    })
    return out
  }, [q, store])

  const total = valRows.reduce((a, r) => a + r.value, 0)
  const qtySum = valRows.reduce((a, r) => a + r.qty, 0)

  const refresh = () => ACT.recalcStock()

  const storePick = (
    <label className="fld fld--inline">
      <span className="fld__l">المستودع</span>
      <Select className="fld__i" value={store} onChange={(e) => setStore(e.target.value)}>
        <option value="all">جميع المستودعات</option>
        {DATA.stores.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}
      </Select>
    </label>
  )

  return (
    <AppShell search="ابحث بالصنف…">
      <div className="tophead">
        <PageHeader title="تقارير المخزون"
          sub={<>التقييم بمتوسط التكلفة والرصيد الفعلي لكل مستودع<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="إعادة احتساب" variant="ghost" onClick={refresh} />
          <Button label="تصدير CSV" variant="outline"
            onClick={() => ACT.bulkAction('تصدير CSV', 'items', valRows.map((r) => r.sku))} />
        </div>
      </div>

      <SummaryStrip
        label="قيمة المخزون"
        value={total}
        note={store === 'all'
          ? `${valRows.length} صنف عبر ${DATA.stores.length} مستودعات`
          : `${valRows.length} صنف في ${DATA.storeOf(store)?.ar}`}
        items={[
          { label: 'إجمالي الكميات', value: String(qtySum), money: false },
          { label: 'أصناف تحت الحد', value: String(valRows.filter(DATA.isLow).length),
            money: false, alert: valRows.some(DATA.isLow) },
          { label: 'مواقع بها رصيد', value: String(new Set(liveRows.map((r) => r.storeId)).size),
            money: false },
        ]}
      />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">
            {tab === 'val' ? 'التقييم' : 'الرصيد الفعلي'}
            <span className="sect__n">{tab === 'val' ? valRows.length : liveRows.length}</span>
          </h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث بالصنف…" width={240} value={q} onChange={setQ} />
            {storePick}
          </div>
        </header>

        {(tab === 'val' ? valRows : liveRows).length === 0 ? (
          <div className="sect__empty">
            <b>مفيش رصيد يتعرض</b>
            <span>
              {q ? 'مفيش صنف بالبحث ده.' : 'المستودع ده فاضي — أول رصيد بييجي من فاتورة شراء أو تسوية.'}
            </span>
          </div>
        ) : tab === 'val' ? (
          <DataTable selectable={false} peek={false} rows={Sv.apply(valRows).map((r) => ({
            key: r.sku,
            onOpen: () => nav(`/inventory/items/${r.sku}`),
            cells: [
              <span className="itcell"><b>{r.ar}</b><em className="num">{r.sku}</em></span>,
              <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>
                {r.unitName}
              </span>,
              <span className={`num${DATA.isLow(r) ? ' is-low-n' : ''}`}
                style={{ fontWeight: 'var(--fw-semi)' }}>{r.qty}</span>,
              <SAR v={r.cost || 0} dec />,
              <SAR v={r.value} />,
            ],
          }))}
            columns={[
              Sv.col('الصنف', 'name'),
              { label: 'الوحدة', width: '110px' },
              Sv.col('الكمية الفعلية', 'qty', { num: true, width: '132px' }),
              { label: 'متوسط التكلفة', num: true, width: '150px' },
              Sv.col('القيمة الإجمالية', 'value', { num: true, width: '160px' }),
            ]}
          />
        ) : (
          <DataTable selectable={false} peek={false} rows={Sl.apply(liveRows).map((r) => ({
            key: `${r.sku}-${r.storeId}`,
            onOpen: () => nav(`/inventory/items/${r.sku}`),
            cells: [
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semi)' }}>{r.storeAr}</span>,
              <span className="itcell"><b>{r.ar}</b><em className="num">{r.sku}</em></span>,
              <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>
                {r.unitName}
              </span>,
              <span className="num" style={{ fontWeight: 'var(--fw-semi)' }}>{r.qty}</span>,
              <SAR v={r.cost || 0} dec />,
            ],
          }))}
            columns={[
              Sl.col('المستودع', 'store', { width: '190px' }),
              Sl.col('الصنف', 'name'),
              { label: 'الوحدة', width: '110px' },
              Sl.col('الكمية الفعلية', 'qty', { num: true, width: '132px' }),
              { label: 'متوسط التكلفة', num: true, width: '150px' },
            ]}
          />
        )}

        <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
          التقييم بمتوسط التكلفة. النقل اللي لسه مسودة ما اتحسبش — الرصيد بيتحرّك عند الإصدار.
        </p>
      </section>
    </AppShell>
  )
}

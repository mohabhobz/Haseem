import * as DATA from '../data/mock.js'

/* ============================================================
   محرّك التقارير.

   ★ القاعدة اللي الملف ده كله قايم عليها:
     **التقرير ما بيخزّنش أي رقم.**

   كل تقرير مالي هنا — ميزان المراجعة، قائمة الدخل، الميزانية،
   التدفق النقدي، الإقرار الضريبي — بيقرا من **دفتر يومية واحد
   مشتق** بيتبني لحظيًا من المستندات نفسها.

   ليه ده مهم: في سيستم العميل تقرير المصروفات بيعرض أربع كروت
   بأربع تسميات مختلفة وكلهم نفس الرقم، وقائمة الدخل بتقول
   «إجمالي الربح = صافي المبيعات» لأن تكلفة البضاعة مش داخلة.
   دي أعراض إن كل تقرير بيحسب لوحده.

   هنا مستحيل يحصل ده: لو فاتورة اتلغت، بتختفي من الجورنال،
   فبتختفي من الميزان والدخل والميزانية والإقرار **في نفس اللحظة**
   وبنفس القيمة. والميزان بيتوازن لأن كل قيد طرفينه بيتكتبوا مع بعض.

   ★ للمطوّر: الملف ده بيتشال بالكامل مع الباك اند. القيود
   الحقيقية هتيجي من `GET /accounting/journal`، والدوال اللي تحت
   بتبقى استعلامات على السيرفر. قواعد الترحيل نفسها (`postingOf`)
   هي **المواصفة** اللي الباك اند لازم يطابقها.
   ============================================================ */

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const VAT = 0.15

/* ============================================================
   ١) قواعد الترحيل — كل نوع مستند وإيه اللي بيكتبه في الدفتر
   ============================================================ */

/* فاتورة مبيعات: العميل مدين بالإجمالي، الإيراد دائن بالصافي،
   وضريبة المخرجات دائنة بالفرق. */
function invoiceEntry(v) {
  const total = v.total
  const net = r2(total / (1 + VAT))
  const vat = r2(total - net)
  return {
    date: v.date, kind: 'invoices', no: v.no, party: v.c?.ar,
    memo: 'فاتورة مبيعات', go: `/sales/invoices/${v.no}`,
    lines: [
      { acc: '1200', dr: total, cr: 0 },
      { acc: '4102', dr: 0, cr: net, prj: v.prj },
      { acc: '2100', dr: 0, cr: vat },
    ],
  }
}

/* تحصيل من عميل: النقد مدين، وذمة العميل بتقل. */
function invoicePayEntry(v, p, i) {
  return {
    date: p.date, kind: 'receipt', no: `${v.no}/${i + 1}`, party: v.c?.ar,
    memo: `تحصيل ${p.way}`, go: `/sales/invoices/${v.no}`,
    lines: [
      { acc: p.acc || '1020', dr: p.amount, cr: 0 },
      { acc: '1200', dr: 0, cr: p.amount },
    ],
  }
}

/* إشعار دائن: عكس الفاتورة — بيقلّل الإيراد وضريبة المخرجات وذمة العميل. */
function creditNoteEntry(n) {
  const net = r2(n.total / (1 + VAT))
  const vat = r2(n.total - net)
  return {
    date: n.date, kind: 'creditNotes', no: n.no, party: n.c?.ar,
    memo: `إشعار دائن — ${n.reason || 'تسوية'}`, go: `/sales/credit-notes`,
    lines: [
      { acc: '4150', dr: net, cr: 0 },
      { acc: '2100', dr: vat, cr: 0 },
      { acc: '1200', dr: 0, cr: n.total },
    ],
  }
}

/* إشعار مدين: بيزوّد اللي على العميل. */
function debitNoteEntry(n) {
  const net = r2(n.total / (1 + VAT))
  const vat = r2(n.total - net)
  return {
    date: n.date, kind: 'debitNotes', no: n.no, party: n.c?.ar,
    memo: `إشعار مدين — ${n.reason || 'تسوية'}`, go: `/sales/debit-notes`,
    lines: [
      { acc: '1200', dr: n.total, cr: 0 },
      { acc: '4102', dr: 0, cr: net },
      { acc: '2100', dr: 0, cr: vat },
    ],
  }
}

/* فاتورة مشتريات: كل بند بيروح لحسابه، وضريبة المدخلات أصل،
   والمورد دائن بالإجمالي. */
function billEntry(b) {
  const lines = []
  ;(b.lines || []).forEach((l) => {
    lines.push({ acc: l.acc, dr: DATA.lineNet(l), cr: 0, cc: l.cc, prj: l.prj || b.prj })
  })
  const vat = DATA.docVat(b)
  if (vat > 0) lines.push({ acc: '1300', dr: vat, cr: 0 })
  lines.push({ acc: '2000', dr: 0, cr: DATA.docTotal(b) })
  return {
    date: b.date, kind: 'bills', no: b.no, party: b.s?.ar,
    memo: 'فاتورة مشتريات', go: `/purchases/bills/${b.no}`, lines,
  }
}

/* سداد لمورد: ذمة المورد بتقل، والنقد بيخرج. */
function billPayEntry(p) {
  const b = DATA.bills.find((x) => x.no === p.bill)
  return {
    date: p.date, kind: 'payment', no: p.no, party: DATA.supplierOf(p.s)?.ar,
    memo: `سداد ${p.ref || 'لمورد'}`, go: b ? `/purchases/bills/${b.no}` : null,
    lines: [
      { acc: '2000', dr: p.amount, cr: 0 },
      { acc: p.acc, dr: 0, cr: p.amount },
    ],
  }
}

/* مصروف: الصافي على حساب المصروف، الضريبة مدخلات، والإجمالي من النقد. */
function expenseEntry(e) {
  const net = DATA.expNet(e)
  const vat = DATA.expVat(e)
  const lines = [{ acc: e.acc, dr: net, cr: 0, cc: e.cc, prj: e.prj }]
  if (vat > 0) lines.push({ acc: '1300', dr: vat, cr: 0 })
  lines.push({ acc: e.cash, dr: 0, cr: e.gross })
  return {
    date: e.date, kind: 'expenses', no: e.no, party: null,
    memo: e.desc || 'مصروف', go: '/purchases/expenses', lines,
  }
}

/* إشعار المورد: عكس فاتورة الشراء (دائن) أو زيادة عليها (مدين). */
function supNoteEntry(n) {
  const sign = DATA.supNoteSign(n)          /* دائن = −١ · مدين = +١ */
  const total = DATA.docTotal(n)
  const vat = DATA.docVat(n)
  const lines = []
  ;(n.lines || []).forEach((l) => {
    lines.push({ acc: l.acc, dr: sign > 0 ? DATA.lineNet(l) : 0,
      cr: sign > 0 ? 0 : DATA.lineNet(l) })
  })
  if (vat > 0) lines.push({ acc: '1300', dr: sign > 0 ? vat : 0, cr: sign > 0 ? 0 : vat })
  lines.push({ acc: '2000', dr: sign > 0 ? 0 : total, cr: sign > 0 ? total : 0 })
  return {
    date: n.date, kind: n.kind === 'credit' ? 'supCredit' : 'supDebit', no: n.no,
    party: DATA.supplierOf(n.s)?.ar,
    memo: `إشعار ${n.kind === 'credit' ? 'دائن' : 'مدين'} — ${n.reason || 'تسوية'}`,
    go: `/purchases/notes/${n.no}`, lines,
  }
}

/* بيان جمركي: ضريبة استيراد قابلة للخصم مقابل مستحق جمركي. */
function customsEntry(d) {
  const vat = DATA.customsVat(d)
  return {
    date: d.date, kind: 'customs', no: d.no, party: DATA.supplierOf(d.s)?.ar,
    memo: `بيان جمركي ${d.decl || ''}`.trim(), go: '/purchases/customs',
    lines: [
      { acc: '1310', dr: vat, cr: 0 },
      { acc: '2130', dr: 0, cr: vat },
    ],
  }
}


/* سند قبض مستقل: النقد بيدخل، والطرف التاني بيتقفل.
   ★ **السندات المربوطة بمستند مش هنا.** تحصيل الفاتورة مقيّد مع
   الفاتورة (`invoicePayEntry`)، وسداد فاتورة المورد مقيّد مع
   السداد. لو قيّدناهم تاني من قايمة السندات كان النقد هيتحسب
   مرتين. القايمة بتعرض الاتنين، الدفتر بيشوف كل قيد مرة. */
function receiptEntry(r) {
  return {
    date: r.date, kind: 'receipts', no: r.no, party: DATA.partyAr(r.party),
    memo: r.memo || 'سند قبض', go: `/cash/receipts/${r.no}`,
    lines: [
      { acc: r.acc, dr: r.amount, cr: 0 },
      { acc: r.to,  dr: 0, cr: r.amount },
    ],
  }
}

/* سند صرف مستقل: النقد بيخرج، والطرف التاني بياخد المبلغ. */
function paymentEntry(p) {
  return {
    date: p.date, kind: 'payments', no: p.no, party: DATA.partyAr(p.party),
    memo: p.memo || 'سند صرف', go: `/cash/payments/${p.no}`,
    lines: [
      { acc: p.to,  dr: p.amount, cr: 0 },
      { acc: p.acc, dr: 0, cr: p.amount },
    ],
  }
}

/* تحويل بين حسابين: المبلغ بيتنقل بالكامل، والرسوم مصروف بنكي
   منفصل — مش بتتخصم من المحوّل. */
function transferEntry(t) {
  const lines = [
    { acc: t.to,   dr: t.amount, cr: 0 },
    { acc: t.from, dr: 0, cr: t.amount },
  ]
  if (t.fee > 0) {
    lines.push({ acc: '5120', dr: t.fee, cr: 0 })
    lines.push({ acc: t.from, dr: 0, cr: t.fee })
  }
  return {
    date: t.date, kind: 'transfers', no: t.no, party: null,
    memo: t.ref || 'تحويل بين الحسابات', go: `/cash/transfers/${t.no}`, lines,
  }
}

/* قيد يومية يدوي: بيتكتب زي ما هو. ده النوع الوحيد اللي المستخدم
   بيحدّد طرفيه بنفسه، وعشان كده التوازن بيتفحص قبل الترحيل. */
function manualEntry(j) {
  return {
    date: j.date, kind: 'journal', no: j.no, party: null,
    memo: j.memo, go: `/accounting/journal/${j.no}`,
    lines: (j.lines || []).map((l) => ({
      acc: l.acc, dr: l.dr || 0, cr: l.cr || 0, cc: l.cc, prj: l.prj })),
  }
}

/* رأس المال الافتتاحي — من غيره الميزانية ما تتوازنش من أول يوم. */
function openingEntry() {
  const o = DATA.openingCapital
  return {
    date: o.date, kind: 'opening', no: 'OP-0001', party: null,
    memo: 'رأس المال الافتتاحي', go: null,
    lines: [
      ...o.splits.map((x) => ({ acc: x.acc, dr: x.amount, cr: 0 })),
      { acc: '3000', dr: 0, cr: DATA.openingTotal },
    ],
  }
}

/* ============================================================
   ٢) دفتر اليومية — المصدر الوحيد لكل تقرير مالي
   ============================================================ */

/* المستندات اللي بتترحّل بس. المسودة والملغاة **ما بيكتبوش قيد** —
   ودي بالظبط اللي بتخلّي التقارير تتفق مع الشاشات. */
const LIVE_INV = ['issued', 'partial', 'paid', 'overdue']

export function journal() {
  const j = [openingEntry()]

  DATA.invoices.forEach((v) => {
    if (!LIVE_INV.includes(v.status)) return
    j.push(invoiceEntry(v))
    DATA.paymentsOf(v).forEach((p, i) => j.push(invoicePayEntry(v, p, i)))
  })

  DATA.creditNotes.forEach((n) => { if (n.status === 'issued') j.push(creditNoteEntry(n)) })
  DATA.debitNotes.forEach((n) => { if (n.status === 'issued') j.push(debitNoteEntry(n)) })

  DATA.bills.forEach((b) => { if (b.status === 'posted') j.push(billEntry(b)) })
  DATA.supplierPayments.forEach((p) => {
    const b = DATA.bills.find((x) => x.no === p.bill)
    if (b && b.status === 'posted') j.push(billPayEntry(p))
  })

  DATA.supplierNotes.forEach((n) => { if (n.status === 'posted') j.push(supNoteEntry(n)) })
  DATA.expenses.forEach((e) => { if (e.status === 'posted') j.push(expenseEntry(e)) })
  DATA.customs.forEach((d) => { if (d.status === 'posted') j.push(customsEntry(d)) })

  DATA.receiptVouchers.forEach((r) => { if (r.status === 'posted') j.push(receiptEntry(r)) })
  DATA.paymentVouchers.forEach((p) => { if (p.status === 'posted') j.push(paymentEntry(p)) })
  DATA.cashTransfers.forEach((t) => { if (t.status === 'posted') j.push(transferEntry(t)) })
  DATA.journalEntries.forEach((e) => { if (e.status === 'posted') j.push(manualEntry(e)) })

  return j.sort((a, b) => a.date.localeCompare(b.date) || String(a.no).localeCompare(String(b.no)))
}

const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to)

/* كل سطور القيود مفرودة — الوحدة اللي كل التقارير بتتبنى منها */
export function postings(from, to) {
  const out = []
  journal().forEach((e) => {
    if (!inRange(e.date, from, to)) return
    e.lines.forEach((l) => out.push({ ...l, date: e.date, kind: e.kind,
      no: e.no, party: e.party, memo: e.memo, go: e.go }))
  })
  return out
}

/* ============================================================
   ٣) ميزان المراجعة
   ============================================================ */
export function trialBalance(from, to) {
  const map = {}
  postings(from, to).forEach((l) => {
    const a = (map[l.acc] = map[l.acc] || { acc: l.acc, dr: 0, cr: 0 })
    a.dr += l.dr; a.cr += l.cr
  })
  const rows = DATA.accounts
    .filter((a) => map[a.id])
    .map((a) => {
      const m = map[a.id]
      const dr = r2(m.dr), cr = r2(m.cr)
      const net = r2(dr - cr)
      return { ...a, dr, cr, net, bal: Math.abs(net), side: net >= 0 ? 'dr' : 'cr' }
    })
  const totDr = r2(rows.reduce((s, x) => s + x.dr, 0))
  const totCr = r2(rows.reduce((s, x) => s + x.cr, 0))
  return { rows, totDr, totCr, balanced: Math.abs(totDr - totCr) < 0.01 }
}

/* رصيد حساب واحد لحد تاريخ — أساس الميزانية وكشف الحساب */
export function balanceOf(accId, to, from) {
  let n = 0
  postings(from, to).forEach((l) => { if (l.acc === accId) n += l.dr - l.cr })
  return r2(n)
}

/* ============================================================
   ٤) قائمة الدخل
   ============================================================ */
export function incomeStatement(from, to) {
  const tb = trialBalance(from, to)
  const pick = (type) => tb.rows.filter((r) => r.type === type)

  /* الإيراد دائن بطبيعته — بنقلب الإشارة عشان يبان موجب */
  const revRows = pick('revenue').map((r) => ({ ...r, amount: r2(-r.net) }))
  const revenue = revRows.filter((r) => r.kind === 'revenue')
  const contra  = revRows.filter((r) => r.kind === 'contra')
  /* إيرادات أخرى مش مبيعات — سطر مستقل تحت الربح التشغيلي */
  const otherRows = revRows.filter((r) => r.kind === 'other')
    .filter((r) => Math.abs(r.amount) > 0.001)
  const other = r2(otherRows.reduce((s, x) => s + x.amount, 0))
  const gross = r2(revenue.reduce((s, x) => s + x.amount, 0))
  const returns = r2(-contra.reduce((s, x) => s + x.amount, 0))
  const netSales = r2(gross - returns)

  const cogsRows = pick('cogs').map((r) => ({ ...r, amount: r2(r.net) }))
  const cogs = r2(cogsRows.reduce((s, x) => s + x.amount, 0))
  const grossProfit = r2(netSales - cogs)

  const opexRows = pick('expense').map((r) => ({ ...r, amount: r2(r.net) }))
    .filter((r) => Math.abs(r.amount) > 0.001)
    .sort((a, b) => b.amount - a.amount)
  const opex = r2(opexRows.reduce((s, x) => s + x.amount, 0))

  const operating = r2(grossProfit - opex)
  const zakat = 0
  const beforeZakat = r2(operating + other)
  const net = r2(beforeZakat - zakat)

  return {
    revenue, contra, gross, returns, netSales,
    otherRows, other, beforeZakat,
    cogsRows, cogs, grossProfit,
    opexRows, opex, operating, zakat, net,
    margin: netSales > 0 ? r2((net / netSales) * 100) : 0,
    grossMargin: netSales > 0 ? r2((grossProfit / netSales) * 100) : 0,
  }
}

/* ============================================================
   ٥) الميزانية العمومية — لحظية «حتى تاريخ»
   ============================================================ */
export function balanceSheet(asOf) {
  const tb = trialBalance(null, asOf)
  const of = (type) => tb.rows.filter((r) => r.type === type)

  const assets = of('asset').map((r) => ({ ...r, amount: r2(r.net) }))
    .filter((r) => Math.abs(r.amount) > 0.001)
  const liabs = of('liability').map((r) => ({ ...r, amount: r2(-r.net) }))
    .filter((r) => Math.abs(r.amount) > 0.001)
  const equityAccs = of('equity').map((r) => ({ ...r, amount: r2(-r.net) }))
    .filter((r) => Math.abs(r.amount) > 0.001)

  /* أرباح الفترة بتقفل في حقوق الملكية — من غيرها الميزانية ما تتوازنش */
  const inc = incomeStatement(null, asOf)
  const equity = [...equityAccs, {
    id: 'RESULT', ar: 'نتيجة الفترة الحالية', amount: inc.net, computed: true,
  }]

  const totalAssets = r2(assets.reduce((s, x) => s + x.amount, 0))
  const totalLiabs  = r2(liabs.reduce((s, x) => s + x.amount, 0))
  const totalEquity = r2(equity.reduce((s, x) => s + x.amount, 0))
  const diff = r2(totalAssets - (totalLiabs + totalEquity))

  /* ★ تقسيم متداول / غير متداول.
     السطر بيتحدد من `nc` على الحساب نفسه في الشجرة، مش من ترتيبه
     ولا من رقمه — عشان لما تتزاد أصول ثابتة أو قرض طويل الأجل
     يقعوا في مكانهم من غير ما حد يعدّل التقرير.
     الشجرة الحالية كلها متداولة، وده بيتقال صراحة في الشاشة
     بدل ما نسيب المستخدم يفترض. */
  const split = (l) => [l.filter((x) => !x.nc), l.filter((x) => x.nc)]
  const [assetsCur, assetsNC] = split(assets)
  const [liabsCur, liabsNC]   = split(liabs)
  const sum = (l) => r2(l.reduce((s, x) => s + x.amount, 0))

  return { assets, liabs, equity, totalAssets, totalLiabs, totalEquity,
    assetsCur, assetsNC, liabsCur, liabsNC,
    totalAssetsCur: sum(assetsCur), totalAssetsNC: sum(assetsNC),
    totalLiabsCur: sum(liabsCur),   totalLiabsNC: sum(liabsNC),
    diff, balanced: Math.abs(diff) < 0.01 }
}

/* ============================================================
   ٦) التدفق النقدي
   ============================================================ */
export function cashFlow(from, to) {
  const cashIds = DATA.accountsOf('cash').map((a) => a.id)
  const isCash = (id) => cashIds.includes(id)

  /* من غير بداية فترة، مفيش رصيد افتتاحي — القيود كلها جوّه المدى.
     (كان بيرجّع الرصيد الكامل فيتحسب مرتين.) */
  const openAt = from ? prevDay(from) : null
  const openOf = (id) => (from ? balanceOf(id, openAt) : 0)
  const open = r2(cashIds.reduce((s, id) => s + openOf(id), 0))

  const moves = postings(from, to).filter((l) => isCash(l.acc))
    .map((l) => ({ ...l, amount: r2(l.dr - l.cr), dir: l.dr > 0 ? 'in' : 'out' }))
    .sort((a, b) => b.date.localeCompare(a.date))

  const inflow  = r2(moves.filter((m) => m.dir === 'in').reduce((s, m) => s + m.amount, 0))
  const outflow = r2(-moves.filter((m) => m.dir === 'out').reduce((s, m) => s + m.amount, 0))
  const change = r2(inflow - outflow)
  const close = r2(open + change)

  const byAccount = DATA.accountsOf('cash').map((a) => {
    const mine = moves.filter((m) => m.acc === a.id)
    const i = r2(mine.filter((m) => m.dir === 'in').reduce((s, m) => s + m.amount, 0))
    const o = r2(-mine.filter((m) => m.dir === 'out').reduce((s, m) => s + m.amount, 0))
    const op = openOf(a.id)
    return { ...a, inflow: i, outflow: o, change: r2(i - o),
      open: op, close: r2(op + i - o), moves: mine }
  }).filter((a) => a.moves.length > 0 || Math.abs(a.open) > 0.001)

  return { open, inflow, outflow, change, close, moves, byAccount }
}

function prevDay(iso) {
  if (!iso) return null
  const d = new Date(iso); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/* ============================================================
   ٧) الإقرار الضريبي — ١٦ خانة، وكل خانة بمبلغ **وضريبة**

   سيستم العميل بيعرض رقم واحد لكل خانة. نموذج الهيئة عمودين:
   المبلغ والضريبة. من غير الاتنين المستخدم مش قادر ينقل الإقرار
   للبوابة. وكل خانة هنا بتقول **جاية من كام مستند**.
   ============================================================ */
export function vatReturn(from, to) {
  const box = (n, ar) => ({ n, ar, amount: 0, vat: 0, docs: [] })
  const B = {
    1:  box(1,  'المبيعات الخاضعة للنسبة الأساسية'),
    2:  box(2,  'الخدمات الصحية والتعليمية الخاصة للمواطنين'),
    3:  box(3,  'المبيعات المحلية الخاضعة لنسبة الصفر'),
    4:  box(4,  'الصادرات'),
    5:  box(5,  'المبيعات المعفاة'),
    6:  box(6,  'إجمالي المبيعات'),
    7:  box(7,  'المشتريات المحلية الخاضعة للنسبة الأساسية'),
    8:  box(8,  'الواردات الخاضعة للضريبة المدفوعة بالجمارك'),
    9:  box(9,  'الواردات الخاضعة للضريبة بآلية الاحتساب العكسي'),
    10: box(10, 'المشتريات الخاضعة لنسبة الصفر'),
    11: box(11, 'المشتريات المعفاة'),
    12: box(12, 'إجمالي المشتريات'),
    13: box(13, 'إجمالي الضريبة المستحقة عن الفترة'),
    14: box(14, 'التصحيحات من الفترة السابقة'),
    15: box(15, 'رصيد الضريبة المرحل من الفترة السابقة'),
    16: box(16, 'صافي الضريبة المستحقة أو المستردة'),
  }
  const add = (b, amount, vat, doc) => {
    B[b].amount = r2(B[b].amount + amount)
    B[b].vat = r2(B[b].vat + vat)
    if (doc) B[b].docs.push(doc)
  }

  /* المخرجات — الفواتير والإشعارات */
  DATA.invoices.forEach((v) => {
    if (!LIVE_INV.includes(v.status) || !inRange(v.date, from, to)) return
    const net = r2(v.total / (1 + VAT)), vat = r2(v.total - net)
    add(1, net, vat, { no: v.no, party: v.c?.ar, go: `/sales/invoices/${v.no}`, amount: net, vat })
  })
  DATA.creditNotes.forEach((n) => {
    if (n.status !== 'issued' || !inRange(n.date, from, to)) return
    const net = r2(n.total / (1 + VAT)), vat = r2(n.total - net)
    add(1, -net, -vat, { no: n.no, party: n.c?.ar, go: '/sales/credit-notes', amount: -net, vat: -vat })
  })
  DATA.debitNotes.forEach((n) => {
    if (n.status !== 'issued' || !inRange(n.date, from, to)) return
    const net = r2(n.total / (1 + VAT)), vat = r2(n.total - net)
    add(1, net, vat, { no: n.no, party: n.c?.ar, go: '/sales/debit-notes', amount: net, vat })
  })

  /* المدخلات — فواتير الشراء حسب فئة ضريبة كل بند */
  const BOX_OF = { S: 7, ZX: 10, Z: 11, O: null }
  DATA.bills.forEach((b) => {
    if (b.status !== 'posted' || !inRange(b.date, from, to)) return
    ;(b.lines || []).forEach((l) => {
      const bx = BOX_OF[l.tax]
      if (!bx) return
      add(bx, DATA.lineNet(l), DATA.lineVat(l),
        { no: b.no, party: b.s?.ar, go: `/purchases/bills/${b.no}`,
          amount: DATA.lineNet(l), vat: DATA.lineVat(l) })
    })
  })
  /* إشعارات الموردين بتعدّل المدخلات */
  DATA.supplierNotes.forEach((n) => {
    if (n.status !== 'posted' || !inRange(n.date, from, to)) return
    const sign = DATA.supNoteSign(n)
    ;(n.lines || []).forEach((l) => {
      const bx = BOX_OF[l.tax]
      if (!bx) return
      add(bx, sign * DATA.lineNet(l), sign * DATA.lineVat(l),
        { no: n.no, party: DATA.supplierOf(n.s)?.ar, go: `/purchases/notes/${n.no}`,
          amount: sign * DATA.lineNet(l), vat: sign * DATA.lineVat(l) })
    })
  })

  /* المصروفات كمان مدخلات */
  DATA.expenses.forEach((e) => {
    if (e.status !== 'posted' || !inRange(e.date, from, to)) return
    const bx = BOX_OF[e.tax]
    if (!bx) return
    add(bx, DATA.expNet(e), DATA.expVat(e),
      { no: e.no, party: e.desc, go: '/purchases/expenses',
        amount: DATA.expNet(e), vat: DATA.expVat(e) })
  })
  /* الخانة ٨ — الواردات من البيانات الجمركية */
  DATA.customs.forEach((d) => {
    if (d.status !== 'posted' || !inRange(d.date, from, to)) return
    add(8, DATA.customsBase(d), DATA.customsVat(d),
      { no: d.decl || d.no, party: DATA.supplierOf(d.s)?.ar, go: '/purchases/customs',
        amount: DATA.customsBase(d), vat: DATA.customsVat(d) })
  })

  /* الإجماليات */
  ;[1, 2, 3, 4, 5].forEach((i) => { B[6].amount = r2(B[6].amount + B[i].amount); B[6].vat = r2(B[6].vat + B[i].vat) })
  ;[7, 8, 9, 10, 11].forEach((i) => { B[12].amount = r2(B[12].amount + B[i].amount); B[12].vat = r2(B[12].vat + B[i].vat) })

  B[13].vat = B[6].vat
  B[16].vat = r2(B[13].vat - B[12].vat + B[14].vat + B[15].vat)

  return {
    boxes: B,
    sales: [1, 2, 3, 4, 5, 6].map((i) => B[i]),
    purchases: [7, 8, 9, 10, 11, 12].map((i) => B[i]),
    totals: [13, 14, 15, 16].map((i) => B[i]),
    due: B[16].vat,
    outVat: B[6].vat,
    inVat: B[12].vat,
  }
}

/* حدود الربع/الشهر — مصدر واحد لحساب فترة الإقرار */
export function periodOf(mode, year, q, month) {
  if (mode === 'q') {
    const s = (q - 1) * 3
    const from = `${year}-${String(s + 1).padStart(2, '0')}-01`
    const end = new Date(year, s + 3, 0)
    return { from, to: end.toISOString().slice(0, 10), label: `الربع ${q} — ${year}`,
      due: dueOf(end) }
  }
  const end = new Date(year, month, 0)
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: end.toISOString().slice(0, 10),
    label: `${MONTHS_AR[month - 1]} ${year}`, due: dueOf(end),
  }
}
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
/* الهيئة بتدّي شهر بعد نهاية الفترة */
function dueOf(end) {
  const d = new Date(end); d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/* ============================================================
   ٨) تقرير المبيعات — سطر لكل بند فاتورة
   ============================================================ */
export function salesLines(from, to) {
  const out = []
  DATA.invoices.forEach((v) => {
    if (!LIVE_INV.includes(v.status) || !inRange(v.date, from, to)) return
    DATA.linesOf(v).forEach((l, i) => {
      out.push({
        key: `${v.no}-${i}`, no: v.no, date: v.date, c: v.c, status: v.status,
        code: l.code, ar: l.ar, unit: l.unit, qty: l.qty,
        price: l.price ?? r2(l.total / l.qty), net: l.total,
        vat: r2(l.total * VAT), total: r2(l.total * (1 + VAT)),
        go: `/sales/invoices/${v.no}`,
      })
    })
  })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/* ============================================================
   ٩) تقرير المصروفات — أربع حقائق مختلفة، مش رقم واحد بأربع أسماء

   في سيستم العميل الكروت الأربعة بتعرض نفس الرقم. دول بالتعريف
   مش متساويين: المدفوع + المستحق = الإجمالي.
   ============================================================ */
export function expenseReport(from, to) {
  const exp = DATA.expenses.filter((e) => e.status === 'posted' && inRange(e.date, from, to))
  const bills = DATA.bills.filter((b) => b.status === 'posted' && inRange(b.date, from, to))

  /* المصروف نفسه بينزل من النقد على طول — فهو مدفوع بالكامل.
     اللي بيفضل مستحق هو فواتير المشتريات. */
  const expNet = r2(exp.reduce((s, e) => s + DATA.expNet(e), 0))
  const billNet = r2(bills.reduce((s, b) => s + DATA.docNet(b), 0))
  const total = r2(expNet + billNet)

  const paid = r2(expNet + bills.reduce((s, b) => s + r2((b.paid || 0) / (1 + VAT)), 0))
  const unpaid = r2(total - paid)
  const commit = r2(DATA.purchaseOrders.filter(DATA.poLive)
    .reduce((s, p) => s + DATA.poOpenValue(p), 0))

  /* التوزيع على الحسابات — من الجورنال عشان يطابق قائمة الدخل بالظبط.

     ★ المخزون داخل في القايمة عن قصد: مش كل اللي بتصرفه بيبقى
     «مصروف». شرا بضاعة بيتحوّل **أصل** في الميزانية، وبيدخل قائمة
     الدخل لما يتباع بس. من غير السطر ده النِّسَب ما بتجمعش ١٠٠٪
     والمستخدم ميعرفش راحت فين الفلوس الباقية. */
  const map = {}
  postings(from, to).forEach((l) => {
    const a = DATA.accountOf(l.acc)
    if (!a) return
    const isExp = a.type === 'expense' || a.type === 'cogs'
    const isStock = a.kind === 'stock'
    if (!isExp && !isStock) return
    const m = (map[l.acc] = map[l.acc] || {
      acc: l.acc, ar: DATA.accName(l.acc), amount: 0, n: 0, capital: isStock })
    m.amount = r2(m.amount + l.dr - l.cr)
    m.n++
  })
  const byAccount = Object.values(map)
    .filter((m) => Math.abs(m.amount) > 0.001)
    .sort((a, b) => b.amount - a.amount)
  const expensed = r2(byAccount.filter((m) => !m.capital).reduce((s, m) => s + m.amount, 0))
  const capitalised = r2(byAccount.filter((m) => m.capital).reduce((s, m) => s + m.amount, 0))
  const top = byAccount.find((m) => !m.capital) || null

  /* التوزيع على الموردين */
  const sup = {}
  bills.forEach((b) => {
    const m = (sup[b.s.id] = sup[b.s.id] || { id: b.s.id, ar: b.s.ar, amount: 0, n: 0 })
    m.amount = r2(m.amount + DATA.docNet(b))
    m.n++
  })
  const bySupplier = Object.values(sup).sort((a, b) => b.amount - a.amount)

  return { total, paid, unpaid, commit, expNet, billNet,
    byAccount, bySupplier, top, expensed, capitalised,
    count: exp.length + bills.length }
}

/* ============================================================
   ١٠) كشف حساب — الرابط الميّت في سيستم العميل
   ============================================================ */
export function accountStatement(accId, from, to) {
  /* ★ من غير بداية فترة مفيش رصيد افتتاحي — القيود كلها جوّه
     المدى. `prevDay(null)` بترجّع null، و`balanceOf(acc, null)`
     بتحسب الدفتر كله، فالرصيد كان بيتجمع مرتين: مرة كافتتاحي
     ومرة كحركة. نفس الباج اللي اتصلّح في التدفق النقدي. */
  const open = from ? balanceOf(accId, prevDay(from)) : 0
  const rows = postings(from, to).filter((l) => l.acc === accId)
    .sort((a, b) => a.date.localeCompare(b.date))
  let run = open
  const out = rows.map((l) => {
    run = r2(run + l.dr - l.cr)
    return { ...l, bal: run }
  })
  return { open: r2(open), rows: out, close: r2(run),
    totDr: r2(out.reduce((s, x) => s + x.dr, 0)),
    totCr: r2(out.reduce((s, x) => s + x.cr, 0)) }
}

/* ============================================================
   ١١) المقارنة بفترة سابقة — مش موجودة في سيستم العميل خالص
   ============================================================ */
export function prevPeriod(from, to) {
  if (!from || !to) return { from: null, to: null }
  const a = new Date(from), b = new Date(to)
  const days = Math.round((b - a) / 86400000) + 1
  const pb = new Date(a); pb.setDate(pb.getDate() - 1)
  const pa = new Date(pb); pa.setDate(pa.getDate() - days + 1)
  return { from: pa.toISOString().slice(0, 10), to: pb.toISOString().slice(0, 10) }
}

export const delta = (now, before) => {
  if (!before) return null
  const d = r2(((now - before) / Math.abs(before)) * 100)
  return { pct: d, up: d >= 0 }
}

/* ============================================================
   ١٢) السلاسل الشهرية — للرسم البياني

   عند العميل الرسم البياني موجود في المكان الصح بس **فاضي**:
   «لا توجد بيانات كافية» حتى وهو عنده فواتير. هنا السلسلة
   بتتبني من **نفس دفتر اليومية** اللي بيغذّي باقي التقارير،
   فالرسم ما ينفعش يخالف الأرقام اللي تحته.

   قاعدة مهمة: الشهور الفاضية **بتتحسب صفر ومبتتشالش**. لو شهر
   ما فيهوش مبيعات ده معلومة، مش سطر ناقص — وحذفه بيخلّي الخط
   يبان صاعد وهو مش صاعد.
   ============================================================ */

const monthKey = (iso) => String(iso).slice(0, 7)
const MONTH_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
export const monthLabel = (k) => {
  const [y, m] = k.split('-')
  return `${MONTH_AR[Number(m) - 1]} ${y.slice(2)}`
}

/* كل الشهور بين تاريخين — بما فيها الفاضية */
function monthsBetween(from, to) {
  const out = []
  const a = new Date(`${monthKey(from)}-01`), b = new Date(`${monthKey(to)}-01`)
  for (let d = a; d <= b; d.setMonth(d.getMonth() + 1)) out.push(monthKey(d.toISOString()))
  return out
}

/* حدود المدى: لو الفترة مفتوحة، بناخد أقدم وأحدث حركة فعلية.

   ★ والنهاية بتتقصّ عند النهارده: «السنة دي» بتنتهي في ديسمبر،
   وشهور المستقبل لو اتعرضت أعمدة بصفر هتقول «مفيش مبيعات» —
   وهي أصلًا لسه ما حصلتش. الفرق بين «صفر» و«لسه» مهم. */
function span(from, to) {
  const j = journal()
  const dates = j.map((e) => e.date).filter(Boolean).sort()
  const last = to && to < DATA.TODAY ? to : DATA.TODAY
  return [from || dates[0], last || dates[dates.length - 1]]
}

/* ---------- اتجاه المبيعات: صافي المبيعات شهريًا ----------
   ★ بيتبني من **قيود الإيراد في دفتر اليومية**، مش من الفواتير
   مباشرة. الفرق مش شكلي: لما بنيناه من الفواتير والإشعارات
   الدائنة بس، الإجمالي طلع ٢٥٤٬٦٧٨ في حين إن قائمة الدخل بتقول
   ٢٦١٬٥٩١ — الفرق كان **الإشعارات المدينة** اللي نسيناها.
   القراءة من الدفتر بتمنع النوع ده من الخلاف من أصله. */
export function salesTrend(from, to) {
  const [a, b] = span(from, to)
  if (!a || !b) return []
  /* المبيعات = حسابات الإيراد والمردودات بس. «إيرادات أخرى»
     برّه، عشان الرسم يطابق «صافي المبيعات» في قائمة الدخل. */
  const revIds = DATA.accounts
    .filter((x) => x.type === 'revenue' && ['revenue', 'contra'].includes(x.kind))
    .map((x) => x.id)
  const acc = {}
  monthsBetween(a, b).forEach((k) => { acc[k] = { key: k, net: 0, docs: new Set() } })

  postings(from, to).filter((l) => revIds.includes(l.acc)).forEach((l) => {
    const k = monthKey(l.date)
    if (!acc[k]) return
    acc[k].net = r2(acc[k].net + l.cr - l.dr)
    if (l.no) acc[k].docs.add(l.no)
  })

  return Object.values(acc).map((m) => ({
    key: m.key, net: m.net, docs: m.docs.size, label: monthLabel(m.key),
  }))
}

/* ---------- اتجاه النقد: داخل · خارج · الرصيد الختامي ---------- */
export function cashTrend(from, to) {
  const [a, b] = span(from, to)
  if (!a || !b) return []
  const cashIds = DATA.accountsOf('cash').map((x) => x.id)
  const keys = monthsBetween(a, b)
  const acc = {}
  keys.forEach((k) => { acc[k] = { key: k, in: 0, out: 0 } })

  postings(from, to).filter((l) => cashIds.includes(l.acc)).forEach((l) => {
    const k = monthKey(l.date)
    if (!acc[k]) return
    if (l.dr > 0) acc[k].in = r2(acc[k].in + l.dr)
    else acc[k].out = r2(acc[k].out + l.cr)
  })

  /* الرصيد الختامي بيتراكم من رصيد أول الفترة، مش من صفر */
  let run = from
    ? r2(cashIds.reduce((s, id) => s + balanceOf(id, prevDay(from)), 0))
    : 0
  return keys.map((k) => {
    const m = acc[k]
    run = r2(run + m.in - m.out)
    return { ...m, net: r2(m.in - m.out), close: run, label: monthLabel(k) }
  })
}


/* ============================================================
   ١٣) مراكز التكلفة

   عند العميل مركز التكلفة **شاشة من غير تقرير**: تقدر تعمله ومفيش
   مكان بيقول اتصرف عليه كام. هنا الرقم بيتحسب من القيود نفسها،
   وكل مركز بيوصل لحركته.

   والمصروف اللي مالوش مركز بيتعرض صراحة كـ«غير موزّع» — مش
   بيتقسّم بالتساوي ولا بيتشال. لو ٤٠٪ من المصروف غير موزّع
   المستخدم لازم يشوف ده، عشان يعرف إن التقرير ناقص.
   ============================================================ */
export function costCenterReport(from, to) {
  const expIds = DATA.accounts
    .filter((a) => ['expense', 'cogs'].includes(a.type)).map((a) => a.id)

  const map = {}
  DATA.costCenters.forEach((c) => { map[c.id] = { ...c, amount: 0, n: 0, rows: [] } })
  const none = { id: null, ar: 'غير موزّع على مركز', amount: 0, n: 0, rows: [], none: true }

  postings(from, to).filter((l) => expIds.includes(l.acc)).forEach((l) => {
    const t = (l.cc && map[l.cc]) || none
    const v = r2(l.dr - l.cr)
    t.amount = r2(t.amount + v)
    t.n += 1
    t.rows.push(l)
  })

  const rows = [...Object.values(map).filter((c) => c.n > 0), ...(none.n ? [none] : [])]
    .sort((a, b) => b.amount - a.amount)
  const total = r2(rows.reduce((s, c) => s + c.amount, 0))
  const covered = r2(total - none.amount)
  return { rows, total, unallocated: none.amount,
    coverage: total > 0 ? r2((covered / total) * 100) : 100 }
}

/* ============================================================
   ١٤) دفتر الأستاذ — حساب واحد بحركته ورصيده الجاري
   (نفس `accountStatement` بس بتجميع شهري اختياري)
   ============================================================ */
export function ledger(accId, from, to) {
  const st = accountStatement(accId, from, to)
  const a = DATA.accountOf(accId)
  /* طبيعة الحساب بتحدد إمتى الرصيد «مدين» وإمتى «دائن» */
  const debitNature = ['asset', 'expense', 'cogs'].includes(a?.type)
  return { ...st, account: a, debitNature,
    side: st.close >= 0 ? 'dr' : 'cr',
    natural: debitNature ? st.close >= 0 : st.close <= 0 }
}


/* ============================================================
   ١٥) ربحية المشاريع

   نفس القاعدة اللي ماشي عليها الملف كله: **مفيش رقم متخزّن.**
   إيراد المشروع وتكلفته بيتحسبوا من القيود اللي متوسومة بيه،
   فمستحيل «ربح المشروع» يخالف قائمة الدخل.

   والتغطية بتتقال صراحة: لو نص الإيراد مش متوسوم بمشروع،
   المقارنة بين المشاريع ناقصة والمستخدم لازم يعرف.
   ============================================================ */
export function projectReport(from, to) {
  const revIds = DATA.accounts
    .filter((a) => a.type === 'revenue' && ['revenue', 'contra'].includes(a.kind))
    .map((a) => a.id)
  const costIds = DATA.accounts
    .filter((a) => ['expense', 'cogs'].includes(a.type)).map((a) => a.id)

  const map = {}
  DATA.projects.forEach((p) => {
    map[p.id] = { ...p, revenue: 0, cost: 0, rows: [] }
  })

  postings(from, to).forEach((l) => {
    if (!l.prj || !map[l.prj]) return
    if (revIds.includes(l.acc)) {
      map[l.prj].revenue = r2(map[l.prj].revenue + l.cr - l.dr)
      map[l.prj].rows.push({ ...l, side: 'rev' })
    } else if (costIds.includes(l.acc)) {
      map[l.prj].cost = r2(map[l.prj].cost + l.dr - l.cr)
      map[l.prj].rows.push({ ...l, side: 'cost' })
    }
  })

  const rows = Object.values(map).map((p) => {
    const profit = r2(p.revenue - p.cost)
    return {
      ...p,
      profit,
      margin: p.revenue > 0 ? r2((profit / p.revenue) * 100) : 0,
      burn: p.budget > 0 ? r2((p.cost / p.budget) * 100) : 0,
      billed: p.budget > 0 ? r2((p.revenue / p.budget) * 100) : 0,
    }
  })

  /* التغطية: كام من إيراد وتكلفة الفترة متوسوم بمشروع أصلًا */
  let revAll = 0, costAll = 0, revTag = 0, costTag = 0
  postings(from, to).forEach((l) => {
    if (revIds.includes(l.acc)) {
      const v = r2(l.cr - l.dr); revAll += v; if (l.prj) revTag += v
    } else if (costIds.includes(l.acc)) {
      const v = r2(l.dr - l.cr); costAll += v; if (l.prj) costTag += v
    }
  })

  return {
    rows: rows.sort((a, b) => b.revenue - a.revenue),
    revAll: r2(revAll), costAll: r2(costAll),
    revTag: r2(revTag), costTag: r2(costTag),
    revCover: revAll > 0 ? r2((revTag / revAll) * 100) : 0,
    costCover: costAll > 0 ? r2((costTag / costAll) * 100) : 0,
  }
}

/* ============================================================
   ١٦) «محتاج مساعدة في إيه دلوقتي»

   ★ ده جوهر موديول المساعدة: بدل ما نفتح على مربع بحث ونستنى
   المستخدم يعرف **اسم** مشكلته، بنقرا حالته من نفس الدفتر
   وبنقول له «عندك كذا — دي خطواته».

   كل بند بيرجع بـ: العدد الحقيقي · المقال اللي بيشرح · والشاشة
   اللي فيها المشكلة. يعني المساعدة بتوديك على شغلك مش على مقال.
   ============================================================ */
export function helpAlerts(today = DATA.TODAY) {
  const out = []
  const add = (o) => { if (o.n > 0) out.push(o) }

  /* ١ — مرفوضة من الهيئة */
  const bad = DATA.invoices.filter((v) => v.zatca === 'bad')
  add({ id: 'zatca-rejected', n: bad.length, tone: 'crit',
    t: `${bad.length} فاتورة مرفوضة من الهيئة`,
    d: bad[0]?.zatcaReason || 'محتاجة تصحيح وإعادة إرسال',
    go: '/sales/invoices?zatca=bad', goT: 'افتح الفواتير المرفوضة' })

  /* ٢ — قيود مسودة مش متوازنة */
  const unbal = DATA.journalEntries.filter(
    (j) => j.status === 'draft' && !DATA.entryBalanced(j))
  add({ id: 'reverse-entry', n: unbal.length, tone: 'crit',
    t: `${unbal.length} قيد مسودة مش متوازن`,
    d: 'الترحيل هيترفض لحد ما المدين يساوي الدائن',
    go: '/accounting/journal', goT: 'افتح القيود' })

  /* ٣ — مسودات واقفة */
  const drafts = DATA.invoices.filter((v) => v.status === 'draft')
  add({ id: 'posting', n: drafts.length, tone: 'warn',
    t: `${drafts.length} فاتورة لسه مسودة`,
    d: 'المسودة مش في التقارير ولا في الإقرار لحد ما تتصدر',
    go: '/sales/invoices?state=draft', goT: 'افتح المسودات' })

  /* ٤ — الإقرار: مسترد ولا مستحق */
  const q = `${today.slice(0, 4)}-${String(Math.floor(Number(today.slice(5, 7)) / 3) * 3 + 1).padStart(2, '0')}-01`
  const v = vatReturn(q, today)
  const net = r2(v.outVat - v.inVat)
  if (net < 0) {
    out.push({ id: 'vat-return', n: 1, tone: 'info',
      t: 'إقرار الربع الحالي مسترد مش مستحق',
      d: `ضريبة المدخلات أكبر من المخرجات بـ${Math.abs(net).toFixed(2)} ر.س`,
      go: '/reports/vat-return', goT: 'افتح الإقرار' })
  }

  /* ٥ — تكلفة البضاعة المباعة صفر */
  const inc = incomeStatement(null, today)
  if (inc.cogs === 0 && inc.netSales > 0) {
    out.push({ id: 'stock-cost', n: 1, tone: 'info',
      t: 'تكلفة البضاعة المباعة صفر',
      d: 'يعني مجمل الربح أعلى من الحقيقة — المخزون بيدخل ومش بيخرج',
      go: '/reports/income-statement', goT: 'افتح قائمة الدخل' })
  }

  /* ٦ — تغطية مراكز التكلفة */
  const cc = costCenterReport(null, today)
  if (cc.coverage < 80) {
    out.push({ id: 'cost-centers', n: 1, tone: 'warn',
      t: `${(100 - cc.coverage).toFixed(0)}٪ من المصروف مش متوزّع على مركز تكلفة`,
      d: 'المقارنة بين المراكز ناقصة بالنسبة دي',
      go: '/accounting/cost-centers', goT: 'افتح مراكز التكلفة' })
  }

  const order = { crit: 0, warn: 1, info: 2 }
  return out.sort((a, b) => order[a.tone] - order[b.tone])
}

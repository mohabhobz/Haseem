import { patch, patchMany } from './store.js'
import { toast, runJob, confirmAction } from '../components/feedback.jsx'

/* ============================================================
   كل أوامر المستندات في مكان واحد.

   ★★ للمطوّر اللي هيستلم الكود — اقرا ده الأول ★★

   الملف ده هو **نقطة الوصل الوحيدة** بين الواجهة والباك اند.
   مفيش أي شاشة بتنادي API؛ كلهم بينادوا الدوال اللي هنا.
   عشان كده لما تربط السيرفر، إنت بتفتح الملف ده بس:

     • جوّه كل دالة فيه تعليق `// API:` مكتوب فيه الطلب المتوقّع.
     • استبدل `patch(...)` و`fake(...)` بالاستدعاء الحقيقي.
     • **سيب** `confirmAction` و`toast` و`runJob` زي ما هم — دول
       الواجهة نفسها: خطوة التأكيد، ورسالة النتيجة، ومؤشر التقدّم.
       دي القرارات اللي اتصمّمت، مش تفاصيل مؤقتة.

   قاعدة الأوامر النهائية: الإصدار والإلغاء مالهمش رجعة. الإلغاء
   **مش حذف** — المستند بيحتفظ برقمه للأبد وبيتقيّد قيد عكسي.
   عشان كده الاتنين بيعدّوا على `confirmAction` وبيقولوا النتيجة
   قبل ما تحصل.
   ============================================================ */

/* تأخير بسيط بيمثّل رحلة السيرفر — عشان حالات الانتظار تبان في
   التصميم بدل ما كل حاجة تحصل في نفس اللحظة. يتشال مع الربط. */
const fake = (ms = 550) => new Promise((r) => setTimeout(r, ms))

const KIND_AR = {
  invoices: 'الفاتورة',
  quotations: 'عرض السعر',
  creditNotes: 'الإشعار الدائن',
  debitNotes: 'الإشعار المدين',
  bills: 'فاتورة المشتريات',
  purchaseOrders: 'أمر الشراء',
  expenses: 'المصروف',
  customs: 'البيان الجمركي',
}

/* ============================================================
   أوامر ليها رجعة — تنفّذ على طول وتقول النتيجة
   ============================================================ */

// API: POST /documents/:no/email  → { to }
export async function sendEmail(kind, doc, to) {
  const id = toast.info(`جاري الإرسال…`, { ms: 9000 })
  await fake()
  toast.dismiss(id)
  toast.ok(`${KIND_AR[kind]} ${doc.no} اتبعتت بالبريد`,
    { sub: to || doc.c?.email || 'على إيميل العميل المسجّل' })
}

// API: POST /documents/:no/whatsapp
export async function sendWhatsApp(kind, doc) {
  const id = toast.info('جاري الإرسال…', { ms: 9000 })
  await fake()
  toast.dismiss(id)
  toast.ok(`${KIND_AR[kind]} ${doc.no} اتبعت واتساب`,
    { sub: doc.c?.phone || 'على رقم العميل المسجّل' })
}

/* اللينكات بتتولّد على السيرفر، بس النسخ نفسه فرونت */
// API: GET /documents/:no/share-link
export async function copyShareLink(kind, doc) {
  const url = `${location.origin}/d/${doc.no}`
  await copy(url)
  toast.ok('لينك المشاركة اتنسخ', { sub: url })
}

// API: GET /documents/:no/pay-link
export async function copyPayLink(kind, doc) {
  const url = `${location.origin}/pay/${doc.no}`
  await copy(url)
  toast.ok('لينك الدفع اتنسخ', { sub: 'ابعته للعميل يدفع منه على طول' })
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text) }
  catch (e) { /* المتصفح رفض — الرسالة بتفضل بتقول إيه اللينك */ }
}

// API: GET /documents/:no/pdf   (الملف بيتولّد على السيرفر)
export async function downloadPdf(kind, doc) {
  const id = toast.info('بنجهّز الملف…', { ms: 9000 })
  await fake(700)
  toast.dismiss(id)
  toast.ok(`${doc.no}.pdf جاهز`, { sub: 'اتنزّل في مجلد التنزيلات' })
}

// API: GET /documents/:no/xml   (فاتورة زاتكا الموقّعة)
export async function downloadXml(kind, doc) {
  const id = toast.info('بنجهّز الملف…', { ms: 9000 })
  await fake(700)
  toast.dismiss(id)
  toast.ok(`${doc.no}.xml جاهز`, { sub: 'النسخة الموقّعة المعتمدة من الهيئة' })
}

/* الطباعة فرونت خالص — بتفتح ديالوج المتصفح على معاينة المستند */
export function printDoc() {
  window.print()
}

// API: POST /invoices/:no/payments  → { amount, method, ref }
export async function recordPayment(doc) {
  toast.info('تسجيل الدفعة بيتفتح من شاشة الفاتورة', {
    sub: 'اختَر طريقة الدفع والمبلغ، وبعدين احفظ',
  })
}

/* ============================================================
   أوامر مالهاش رجعة — تأكيد الأول
   ============================================================ */

// API: POST /documents/:no/issue  → بيبعت للهيئة ويرجّع الحالة
export async function issueDoc(kind, doc) {
  const ok = await confirmAction({
    title: `إصدار ${KIND_AR[kind]} ${doc.no}؟`,
    body: 'الإصدار مالوش رجعة.',
    tone: 'primary',
    confirm: 'إصدار وإرسال للهيئة',
    consequences: [
      'المستند بياخد رقمه النهائي ومينفعش يتعدّل بعدها',
      'بيتبعت لهيئة الزكاة والضريبة والجمارك فورًا',
      'التعديل بعد كده بيبقى بإشعار دائن أو مدين بس',
    ],
  })
  if (!ok) return false

  const id = toast.info('بنبعت للهيئة…', { ms: 9000 })
  await fake(900)
  toast.dismiss(id)
  patch(kind, doc.no, { status: 'issued', zatca: 'ok' })
  toast.ok(`${KIND_AR[kind]} ${doc.no} اتصدرت`, { sub: 'الهيئة قبلتها — الـQR والملفات جاهزة' })
  return true
}

// API: POST /documents/:no/cancel  → بيعمل قيد عكسي، مش DELETE
export async function cancelDoc(kind, doc) {
  const ok = await confirmAction({
    title: `إلغاء ${KIND_AR[kind]} ${doc.no}؟`,
    body: 'الإلغاء مش حذف — المستند بيفضل موجود برقمه.',
    confirm: 'إلغاء المستند',
    consequences: [
      'بيتقيّد قيد عكسي وبيتشال من المستحقات',
      'رقمه بيفضل محجوز للأبد ومش هيتعاد استخدامه',
      'الهيئة بتتبلّغ بالإلغاء',
    ],
  })
  if (!ok) return false

  await fake()
  patch(kind, doc.no, { status: 'cancelled' })
  toast.ok(`${KIND_AR[kind]} ${doc.no} اتلغت`, { sub: 'اتقيّد قيد عكسي' })
  return true
}

// API: POST /invoices/:no/correct → بيلغي الأصلية ويرجّع مسودة جديدة
export async function correctDoc(kind, doc, onDraft) {
  const ok = await confirmAction({
    title: `نسخ ${KIND_AR[kind]} ${doc.no} للتصحيح؟`,
    body: 'ده مش «نسخة» — ده تصحيح.',
    confirm: 'إلغاء الأصلية وفتح مسودة',
    consequences: [
      `${KIND_AR[kind]} ${doc.no} هتتلغي`,
      'هتتفتح مسودة جديدة بنفس البنود تقدر تعدّلها',
      'المسودة الجديدة محتاجة إصدار من تاني',
    ],
  })
  if (!ok) return false

  await fake()
  patch(kind, doc.no, { status: 'cancelled' })
  toast.ok('المسودة الجديدة اتفتحت', { sub: `${doc.no} اتلغت` })
  onDraft?.()
  return true
}

// API: DELETE /documents/:no  (المسودات بس — دي الحاجة الوحيدة اللي بتتحذف فعلًا)
export async function deleteDraft(kind, doc) {
  const ok = await confirmAction({
    title: `حذف مسودة ${doc.no}؟`,
    body: 'المسودة لسه ماخدتش رقم نهائي، فالحذف هنا حذف فعلي.',
    confirm: 'حذف المسودة',
    consequences: ['المسودة وبنودها هيتمسحوا', 'مفيش رجعة'],
  })
  if (!ok) return false
  await fake()
  patch(kind, doc.no, { status: 'deleted' })
  toast.ok('المسودة اتمسحت')
  return true
}

// API: POST /documents/:no/resubmit  (بعد رفض الهيئة)
export async function resubmitZatca(kind, doc) {
  const id = toast.info('بنعيد الإرسال للهيئة…', { ms: 9000 })
  await fake(1100)
  toast.dismiss(id)
  patch(kind, doc.no, { zatca: 'ok', zatcaReason: null })
  toast.ok(`${doc.no} اتقبلت من الهيئة`, { sub: 'الـQR والملفات بقت جاهزة' })
}

// API: POST /quotations/:no/convert → بيرجّع رقم مسودة الفاتورة الجديدة
export async function convertQuote(doc, onInvoice) {
  const ok = await confirmAction({
    title: `تحويل ${doc.no} لفاتورة مبيعات؟`,
    tone: 'primary',
    confirm: 'تحويل',
    consequences: [
      'هتتعمل مسودة فاتورة بنفس بنود العرض وأسعاره',
      'العرض بيتعلّم «محوّل» ومبيتقفلش',
      'المسودة محتاجة مراجعة وإصدار',
    ],
  })
  if (!ok) return false
  await fake()
  patch('quotations', doc.no, { status: 'converted' })
  toast.ok('مسودة الفاتورة اتعملت', { sub: `من ${doc.no}` })
  onInvoice?.()
  return true
}

/* ============================================================
   الأوامر الجماعية — دي اللي البورد سمّاها «مهمة خلفية»
   ============================================================ */

const BULK = {
  'تنزيل PDF':            { done: 'الملفات جاهزة' },
  'إرسال بالبريد':        { done: 'الرسائل اتبعتت' },
  'إعادة الإرسال للهيئة': { done: 'الإرسال خلص', patch: { zatca: 'ok' } },
  'تعليم كمدفوعة':        { done: 'الفواتير اتعلّمت مدفوعة', patch: { status: 'paid' }, ask: true },
  'إلغاء المسودات':       { done: 'المسودات اتلغت', patch: { status: 'cancelled' }, ask: true },
  'تحويل لفواتير':        { done: 'المسودات اتعملت', patch: { status: 'converted' }, ask: true },
  'تصدير CSV':            { done: 'الملف اتنزّل', instant: true },
  'كشف حساب':             { done: 'كشوف الحساب جاهزة' },
  /* المشتريات */
  'ترحيل الفواتير':       { done: 'الفواتير اترحّلت', patch: { status: 'posted' }, ask: true },
  'طباعة':                { done: 'الملفات راحت للطابعة' },
  'اعتماد الأوامر':       { done: 'الأوامر اتعتمدت', patch: { status: 'approved' }, ask: true },
  'إقفال الأوامر':        { done: 'الأوامر اتقفلت', patch: { status: 'closed' }, ask: true },
  'ترحيل المصروفات':      { done: 'المصروفات اترحّلت', patch: { status: 'posted' }, ask: true },
}

// API: POST /jobs  → { action, ids }  ثم polling على /jobs/:id
export async function bulkAction(label, kind, ids) {
  const cfg = BULK[label] || { done: 'خلص' }
  const n = ids.length

  if (cfg.ask) {
    const ok = await confirmAction({
      title: `${label} — ${n} مستند؟`,
      confirm: label,
      tone: label.startsWith('إلغاء') ? 'danger' : 'primary',
      consequences: [`الأمر هيتطبّق على ${n} مستند مرة واحدة`, 'مفيش تراجع بعد التنفيذ'],
    })
    if (!ok) return false
  }

  if (cfg.instant) { await fake(400); toast.ok(cfg.done, { sub: `${n} مستند` }); return true }

  if (cfg.patch && kind) patchMany(kind, ids, cfg.patch)
  runJob({ label, total: n, doneText: cfg.done })
  return true
}

/* ============================================================
   المنتجات والخدمات
   ============================================================ */

// API: DELETE /items/:sku  → بيرفض لو الصنف مستخدم في مستندات
export async function deleteItem(item) {
  const ok = await confirmAction({
    title: `حذف ${item.ar}؟`,
    body: 'الصنف بيتشال من قائمة الأصناف.',
    confirm: 'حذف الصنف',
    consequences: [
      'المستندات القديمة اللي فيها الصنف ده مش هتتأثر',
      'مش هيبقى متاح للاختيار في فواتير جديدة',
      item.kind === 'product' ? 'رصيده الحالي بيتشال من تقارير المخزون' : 'الخدمة مالهاش رصيد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('items', item.sku, { deleted: true })
  toast.ok(`${item.ar} اتحذف`)
  return true
}

// API: POST /inventory/adjustments  → { sku, store, dir, qty, reason }
export async function saveAdjustment(a) {
  await fake()
  toast.ok(`تسوية ${a.dir === 'up' ? 'بالزيادة' : 'بالنقص'} اتسجّلت`,
    { sub: `${a.qty} ${a.unit || ''} · ${a.storeAr || ''}` })
  return true
}

// API: POST /inventory/transfers  (مسودة) — الإصدار بيحرّك الرصيد
export async function issueTransfer(t) {
  const ok = await confirmAction({
    title: `إصدار النقل ${t.no}؟`,
    tone: 'primary',
    confirm: 'إصدار النقل',
    consequences: [
      'الكمية بتتخصم من المستودع المصدر وتتضاف للمستهدف',
      'الرصيد بيتغيّر في التقارير على طول',
      'النقل الصادر مينفعش يتعدّل — بيتعكس بنقل مضاد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('transfers', t.no, { status: 'issued' })
  toast.ok(`النقل ${t.no} اتصدر`, { sub: 'الرصيد اتحدّث في المستودعين' })
  return true
}

// API: POST /inventory/recalc  → بيعيد بناء الأرصدة من الحركات
export async function recalcStock() {
  const id = toast.info('بنعيد احتساب الأرصدة…', { ms: 9000 })
  await fake(800)
  toast.dismiss(id)
  toast.ok('الأرصدة اتحدّثت', { sub: 'محسوبة من كل الحركات لحد دلوقتي' })
}


/* ════════════════════════════════════════════════════════════
   المشتريات والمصروفات

   الفرق الجوهري عن المبيعات: المستند ده **مش بيروح للهيئة**.
   فاتورة الشراء مستند داخلي بيقيّد التزام على المنشأة وبيحرّك
   المخزون. عشان كده مفيش «إصدار للهيئة» ولا QR ولا XML — بس
   **الترحيل** (posting) هو الخط اللي مالوش رجعة.
   ════════════════════════════════════════════════════════════ */

// API: POST /purchases/bills/:no/post
export async function postBill(b, total) {
  const ok = await confirmAction({
    title: `ترحيل فاتورة المشتريات ${b.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل الفاتورة',
    consequences: [
      `بتتقيّد ${total} ر.س التزام على حساب ${b.s?.ar || 'المورد'}`,
      'ضريبة المدخلات بتدخل الإقرار الضريبي للفترة دي',
      b.store ? 'الكميات بتدخل المخزون في المستودع المحدّد' : 'مفيش أثر على المخزون — بنود خدمات',
      'الفاتورة المرحّلة مينفعش تتعدّل — بتتلغي وتتعاد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('bills', b.no, { status: 'posted' })
  toast.ok(`${b.no} اترحّلت`, { sub: 'دخلت حساب المورد والإقرار الضريبي' })
  return true
}

// API: POST /purchases/bills/:no/cancel
export async function cancelBill(b) {
  const ok = await confirmAction({
    title: `إلغاء فاتورة المشتريات ${b.no}؟`,
    tone: 'critical',
    confirm: 'إلغاء الفاتورة',
    consequences: [
      'بيتقيّد قيد عكسي — الالتزام بيتشال من حساب المورد',
      'ضريبة المدخلات بتترجع من الإقرار',
      'الرقم بيفضل محجوز للفاتورة دي للأبد — مفيش حذف',
      b.paid > 0 ? '⚠️ الفاتورة عليها دفعات مسجّلة لازم تتعكس الأول' : null,
    ].filter(Boolean),
  })
  if (!ok) return false
  await fake()
  patch('bills', b.no, { status: 'cancelled' })
  toast.ok(`${b.no} اتلغت`, { sub: 'اتقيّد قيد عكسي' })
  return true
}

// API: POST /purchases/bills/:no/payments  → { amount, account, date, ref }
export async function payBill(b, p) {
  await fake()
  const paid = +((b.paid || 0) + p.amount).toFixed(2)
  patch('bills', b.no, { paid })
  const rest = +(b.total - paid).toFixed(2)
  toast.ok(`دفعة ${p.amount} ر.س اتسجّلت على ${b.no}`, {
    sub: rest <= 0.009 ? 'الفاتورة بقت مدفوعة بالكامل' : `الباقي ${rest} ر.س`,
  })
  return true
}

// API: DELETE /purchases/bills/:no/payments/:id
export async function reversePayment(b, amount) {
  const ok = await confirmAction({
    title: 'عكس الدفعة؟',
    tone: 'critical',
    confirm: 'عكس الدفعة',
    consequences: [
      `${amount} ر.س بترجع للحساب المالي`,
      'الالتزام بيرجع على حساب المورد',
      'الدفعة الأصلية بتفضل في السجل مع القيد العكسي',
    ],
  })
  if (!ok) return false
  await fake()
  patch('bills', b.no, { paid: +((b.paid || 0) - amount).toFixed(2) })
  toast.ok('الدفعة اتعكست')
  return true
}

// API: POST /purchases/purchase-orders/:no/approve
export async function approvePO(p) {
  const ok = await confirmAction({
    title: `اعتماد أمر الشراء ${p.no}؟`,
    tone: 'primary',
    confirm: 'اعتماد الأمر',
    consequences: [
      'الأمر بيدخل قيمة الالتزامات المفتوحة',
      'يقدر يتبعت للمورد بعد كده',
      'البنود مينفعش تتعدّل بعد الاعتماد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('purchaseOrders', p.no, { status: 'approved' })
  toast.ok(`${p.no} اتعتمد`)
  return true
}

// API: POST /purchases/purchase-orders/:no/send  → { channel }
export async function sendPO(p, channel = 'email') {
  const id = toast.info('جاري الإرسال…', { ms: 9000 })
  await fake()
  toast.dismiss(id)
  patch('purchaseOrders', p.no, { status: 'sent' })
  toast.ok(`${p.no} اتبعت للمورد`, {
    sub: channel === 'wa' ? 'عبر واتساب' : `على ${p.s?.email || 'بريد المورد'}`,
  })
  return true
}

// API: POST /purchases/purchase-orders/:no/receipts  → { ref, date, lines:[{sku,qty}] }
export async function receivePO(p, r) {
  const ok = await confirmAction({
    title: `تسجيل استلام على ${p.no}؟`,
    tone: 'primary',
    confirm: 'تسجيل الاستلام',
    consequences: [
      'الكميات المستلمة بتدخل المخزون على طول',
      'المتبقي للاستلام بيقلّ بنفس القدر',
      '**مش** بيعمل فاتورة — الفوترة خطوة منفصلة',
    ],
  })
  if (!ok) return false
  await fake()
  const lines = p.lines.map((l) => ({ ...l, got: Math.min(l.qty, (l.got || 0) + (r[l.sku] || 0)) }))
  patch('purchaseOrders', p.no, { lines })
  const n = Object.values(r).reduce((a, x) => a + (+x || 0), 0)
  toast.ok(`استلام ${n} وحدة اتسجّل`, { sub: `على ${p.no}` })
  return true
}

// API: POST /purchases/purchase-orders/:no/convert  → { no, date, due }
export async function convertPO(p, f) {
  await fake()
  const lines = p.lines.map((l) => ({ ...l, billed: l.qty }))
  patch('purchaseOrders', p.no, { lines })
  toast.ok(`فاتورة مشتريات ${f.no} اتعملت من ${p.no}`, {
    sub: 'اتحفظت كمسودة — راجعها قبل الترحيل',
  })
  return true
}

// API: POST /purchases/purchase-orders/:no/close
export async function closePO(p, openValue) {
  const ok = await confirmAction({
    title: `إقفال أمر الشراء ${p.no}؟`,
    confirm: 'إقفال الأمر',
    consequences: [
      openValue > 0 ? `${openValue} ر.س لسه ما اتفوترتش — بتخرج من الالتزامات` : 'الأمر اتفوتر بالكامل',
      'مش هيقبل استلام ولا فوترة بعد كده',
    ],
  })
  if (!ok) return false
  await fake()
  patch('purchaseOrders', p.no, { status: 'closed' })
  toast.ok(`${p.no} اتقفل`)
  return true
}

// API: POST /purchases/purchase-orders/:no/cancel
export async function cancelPO(p) {
  const ok = await confirmAction({
    title: `إلغاء أمر الشراء ${p.no}؟`,
    tone: 'critical',
    confirm: 'إلغاء الأمر',
    consequences: [
      'بيخرج من الالتزامات المفتوحة',
      'الرقم بيفضل محجوز — مفيش حذف',
      'لو المورد استلم الأمر، بلّغه بنفسك',
    ],
  })
  if (!ok) return false
  await fake()
  patch('purchaseOrders', p.no, { status: 'cancelled' })
  toast.ok(`${p.no} اتلغى`)
  return true
}

// API: POST /purchases/suppliers  ·  PATCH /purchases/suppliers/:id
export async function saveSupplier(s, isEdit) {
  await fake()
  toast.ok(isEdit ? `بيانات ${s.ar} اتحدّثت` : `${s.ar} اتضاف كمورد`)
  return true
}

// API: DELETE /purchases/suppliers/:id
export async function deleteSupplier(s, docs) {
  if (docs > 0) {
    toast.bad(`${s.ar} مينفعش يتحذف`, { sub: `عليه ${docs} مستند. اقفل حسابه بدل الحذف.` })
    return false
  }
  const ok = await confirmAction({
    title: `حذف ${s.ar}؟`,
    tone: 'critical',
    confirm: 'حذف المورد',
    consequences: ['المورد بيتشال من القوائم', 'مالوش أي مستندات فمفيش أثر محاسبي'],
  })
  if (!ok) return false
  await fake()
  patch('suppliers', s.id, { deleted: true })
  toast.ok(`${s.ar} اتحذف`)
  return true
}

// API: POST /purchases/suppliers/:id/statement  → { from, to, channel }
export async function sendStatement(s, channel = 'email') {
  const id = toast.info('جاري تجهيز الكشف…', { ms: 9000 })
  await fake(700)
  toast.dismiss(id)
  toast.ok(`كشف حساب ${s.ar} اتبعت`, {
    sub: channel === 'wa' ? 'عبر واتساب' : `على ${s.email || 'بريد المورد'}`,
  })
  return true
}

// API: POST /expenses  → { date, acc, cash, gross, tax, ref, desc }
export async function saveExpense(e, isEdit) {
  await fake()
  toast.ok(isEdit ? `${e.no} اتحدّث` : 'المصروف اتحفظ كمسودة', {
    sub: 'رحّله عشان يدخل دفتر الأستاذ والإقرار',
  })
  return true
}

// API: POST /expenses/:no/post
export async function postExpense(e, net, vat) {
  const ok = await confirmAction({
    title: `ترحيل المصروف ${e.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل المصروف',
    consequences: [
      `${net} ر.س بتتقيّد على حساب المصروف`,
      vat > 0 ? `${vat} ر.س ضريبة مدخلات بتدخل الإقرار` : 'مفيش ضريبة مدخلات — الفئة صفر',
      'المبلغ بينزل من الحساب المالي المحدّد',
      'المرحّل مينفعش يتعدّل',
    ],
  })
  if (!ok) return false
  await fake()
  patch('expenses', e.no, { status: 'posted' })
  toast.ok(`${e.no} اترحّل`)
  return true
}

// API: POST /expenses/:no/reverse
export async function reverseExpense(e) {
  const ok = await confirmAction({
    title: `عكس المصروف ${e.no}؟`,
    tone: 'critical',
    confirm: 'عكس المصروف',
    consequences: [
      'بيتقيّد قيد عكسي بنفس المبلغ',
      'ضريبة المدخلات بترجع من الإقرار',
      'الرقم بيفضل في السجل',
    ],
  })
  if (!ok) return false
  await fake()
  patch('expenses', e.no, { status: 'reversed' })
  toast.ok(`${e.no} اتعكس`)
  return true
}

// API: DELETE /expenses/:no  (المسودة بس)
export async function deleteExpense(e) {
  const ok = await confirmAction({
    title: `حذف مسودة ${e.no}؟`,
    tone: 'critical',
    confirm: 'حذف المسودة',
    consequences: ['المسودة ما اترحّلتش فمفيش أثر محاسبي', 'الرقم بيرجع متاح'],
  })
  if (!ok) return false
  await fake()
  patch('expenses', e.no, { deleted: true })
  toast.ok('المسودة اتحذفت')
  return true
}

// API: POST /purchases/customs-declarations  ·  PATCH /:no
export async function saveCustoms(d, isEdit) {
  await fake()
  toast.ok(isEdit ? `البيان ${d.no} اتحدّث` : 'البيان الجمركي اتحفظ')
  return true
}

// API: POST /purchases/customs-declarations/:no/post
export async function postCustoms(d, vat) {
  const ok = await confirmAction({
    title: `ترحيل البيان ${d.decl || d.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل البيان',
    consequences: [
      `${vat} ر.س بتدخل **الخانة ٨** من الإقرار الضريبي`,
      'الوعاء = القيمة الجمركية + الرسوم — مش إجمالي فاتورة المورد',
      'المرحّل مينفعش يتعدّل',
    ],
  })
  if (!ok) return false
  await fake()
  patch('customs', d.no, { status: 'posted' })
  toast.ok(`البيان اترحّل`, { sub: `${vat} ر.س ضريبة استيراد` })
  return true
}

// API: POST /purchases/bills/:no/notes  → { type }
export async function newSupplierNote(b, type, nav) {
  const cr = type === 'credit'
  const ok = await confirmAction({
    title: cr ? `إشعار دائن من ${b.s.ar}؟` : `إشعار مدين من ${b.s.ar}؟`,
    body: cr
      ? 'المورد بيقلّل اللي عليك — مرتجع أو خصم بعد الفاتورة.'
      : 'المورد بيزوّد اللي عليك — فرق سعر أو رسوم إضافية.',
    tone: 'primary',
    confirm: cr ? 'فتح إشعار دائن' : 'فتح إشعار مدين',
    consequences: [
      cr ? 'المبلغ بيتخصم من رصيد المورد' : 'المبلغ بيتضاف على رصيد المورد',
      cr ? 'ضريبة المدخلات بتقل بنفس النسبة' : 'ضريبة المدخلات بتزيد بنفس النسبة',
      `الإشعار بيتربط بـ${b.no} وبيتحفظ **مسودة** — بيأثّر عند الترحيل بس`,
    ],
  })
  if (!ok) return false
  await fake()
  const no = `${cr ? 'SCN' : 'SDN'}-${String(Math.floor(100000 + Math.random() * 900000))}`
  toast.ok(cr ? 'إشعار دائن اتفتح كمسودة' : 'إشعار مدين اتفتح كمسودة',
    { sub: `مربوط بـ${b.no}` })
  return true
}

export async function supplierNote(b, type) {
  const cr = type === 'credit'
  const ok = await confirmAction({
    title: cr ? `إشعار دائن من ${b.s.ar}؟` : `إشعار مدين من ${b.s.ar}؟`,
    body: cr
      ? 'المورد بيقلّل اللي عليك — مرتجع أو خصم بعد الفاتورة.'
      : 'المورد بيزوّد اللي عليك — فرق سعر أو رسوم إضافية.',
    tone: 'primary',
    confirm: cr ? 'فتح إشعار دائن' : 'فتح إشعار مدين',
    consequences: [
      cr ? 'المبلغ بيتخصم من رصيد المورد' : 'المبلغ بيتضاف على رصيد المورد',
      cr ? 'ضريبة المدخلات بتقل بنفس النسبة' : 'ضريبة المدخلات بتزيد بنفس النسبة',
      `الإشعار بيتربط بـ${b.no} ومينفعش يزيد عن إجماليها`,
    ],
  })
  if (!ok) return false
  await fake()
  toast.ok(cr ? 'إشعار دائن اتفتح كمسودة' : 'إشعار مدين اتفتح كمسودة',
    { sub: `مربوط بـ${b.no}` })
  return true
}

// API: POST /:kind  (status = draft)
export async function saveDraft(kind, doc) {
  await fake(350)
  toast.ok(`${KIND_AR[kind] || 'المستند'} ${doc.no} اتحفظ كمسودة`,
    { sub: 'تقدر تكمّله وترحّله بعدين' })
  return true
}


/* ════════════════════════════════════════════════════════════
   التقارير

   التقرير ما بيتغيّرش — فمفيش أمر هنا ليه رجعة ولا محتاج تأكيد.
   كلها تصدير وطباعة وحفظ نسخة.
   ════════════════════════════════════════════════════════════ */

// API: GET /reports/:name/export?format=csv|pdf&from=&to=
export async function exportReport(name, format = 'csv') {
  const id = toast.info('بنجهّز الملف…', { ms: 9000 })
  await fake(650)
  toast.dismiss(id)
  toast.ok(`${name}.${format} جاهز`, { sub: 'اتنزّل في مجلد التنزيلات' })
  return true
}

// API: GET /reports/:name/print
export async function printReport(name) {
  await fake(300)
  toast.ok(`${name} راح للطابعة`)
  return true
}

// API: POST /reports/vat-return/file  → بيولّد ملف الإقرار ويحفظه في السجل
export async function fileVatReturn(period, due) {
  const ok = await confirmAction({
    title: `إنشاء ملف الإقرار — ${period}؟`,
    tone: 'primary',
    confirm: 'إنشاء الملف',
    consequences: [
      'بيتولّد PDF بالخانات الـ١٦ بالأرقام الحالية',
      'الملف بيتحفظ في سجل الملفات بتاريخه',
      `الأرقام بتتقفل على اللقطة دي — أي مستند يترحّل بعدها ما بيدخلش الملف`,
      `الإقرار مستحق ${due} على بوابة الهيئة`,
    ],
  })
  if (!ok) return false
  const id = toast.info('بنجهّز ملف الإقرار…', { ms: 9000 })
  await fake(900)
  toast.dismiss(id)
  toast.ok('ملف الإقرار جاهز', { sub: 'تلاقيه في تبويب سجل الملفات' })
  return true
}


/* ---------- العميل ---------- */

// API: DELETE /sales/customers/:id
export async function deleteCustomer(c, docs) {
  if (docs > 0) {
    toast.bad(`${c.ar} مينفعش يتحذف`, { sub: `عليه ${docs} مستند. اقفل حسابه بدل الحذف.` })
    return false
  }
  const ok = await confirmAction({
    title: `حذف ${c.ar}؟`,
    tone: 'critical',
    confirm: 'حذف العميل',
    consequences: ['العميل بيتشال من القوائم', 'مالوش أي مستندات فمفيش أثر محاسبي'],
  })
  if (!ok) return false
  await fake()
  patch('customers', c.id, { deleted: true })
  toast.ok(`${c.ar} اتحذف`)
  return true
}

// API: DELETE /sales/invoices/:no/payments/:id
export async function reverseReceipt(p) {
  const ok = await confirmAction({
    title: 'عكس التحصيل؟',
    tone: 'critical',
    confirm: 'عكس التحصيل',
    consequences: [
      `${p.amount} ر.س بترجع تبقى مستحقة على العميل`,
      'النقد بيقل بنفس المبلغ',
      'الدفعة الأصلية بتفضل في الكشف مع القيد العكسي',
    ],
  })
  if (!ok) return false
  await fake()
  toast.ok('التحصيل اتعكس', { sub: `${p.no} رجعت مستحقة` })
  return true
}

// API: GET /sales/invoices/:no/receipt.pdf   (سند القبض RV-)
export async function downloadReceipt(p) {
  const id = toast.info('بنجهّز سند القبض…', { ms: 9000 })
  await fake(600)
  toast.dismiss(id)
  toast.ok(`سند القبض RV-${String(p.no).replace(/\D/g, '').slice(-6)} جاهز`,
    { sub: 'اتنزّل في مجلد التنزيلات' })
  return true
}


/* ---------- عرض السعر ---------- */

// API: POST /sales/quotations/:no/accept
export async function acceptQuote(q) {
  await fake()
  patch('quotations', q.no, { status: 'accepted' })
  toast.ok(`${q.no} اتعلّم مقبول`, { sub: 'تقدر تحوّله لفاتورة دلوقتي' })
  return true
}

// API: POST /sales/quotations/:no/renew  → { date, valid }
export async function renewQuote(q) {
  const ok = await confirmAction({
    title: `تجديد ${q.no}؟`,
    tone: 'primary',
    confirm: 'تجديد بتواريخ جديدة',
    consequences: [
      'بيتعمل عرض جديد بنفس البنود وتاريخ صلاحية جديد',
      'العرض القديم بيفضل منتهي في السجل برقمه',
      '⚠️ راجع الأسعار — ممكن تكون اتغيّرت من ساعة العرض الأول',
    ],
  })
  if (!ok) return false
  await fake()
  toast.ok('عرض جديد اتعمل كمسودة', { sub: `مبني على ${q.no}` })
  return true
}


/* ---------- المرفقات ---------- */

// API: POST /documents/:no/attachments   (multipart)
export async function attachFiles(no, n) {
  await fake(400)
  toast.ok(n === 1 ? 'الملف اترفع' : `${n} ملفات اترفعوا`, { sub: `مرفقة بـ${no}` })
  return true
}

// API: DELETE /attachments/:id
export async function removeAttachment(name) {
  const ok = await confirmAction({
    title: `حذف ${name}؟`,
    tone: 'critical',
    confirm: 'حذف المرفق',
    consequences: ['الملف بيتشال نهائيًا من المستند',
      'لو ده إثبات ضريبي، تأكد إن عندك نسخة تانية'],
  })
  if (!ok) return false
  await fake(300)
  toast.ok('المرفق اتحذف')
  return true
}

// API: GET /attachments/:id
export async function downloadAttachment(name) {
  await fake(300)
  toast.ok(`${name} اتنزّل`)
  return true
}

/* ---------- إشعارات المورد ---------- */

// API: POST /purchases/notes/:no/post
export async function postSupplierNote(n, total) {
  const cr = n.kind === 'credit'
  const ok = await confirmAction({
    title: `ترحيل الإشعار ${n.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل الإشعار',
    consequences: [
      cr ? `${total} ر.س بتتخصم من رصيد المورد` : `${total} ر.س بتتضاف على رصيد المورد`,
      cr ? 'ضريبة المدخلات بتقل في الإقرار' : 'ضريبة المدخلات بتزيد في الإقرار',
      'المرحّل مينفعش يتعدّل — بيتعكس بإشعار مضاد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('supplierNotes', n.no, { status: 'posted' })
  toast.ok(`${n.no} اترحّل`)
  return true
}

// API: DELETE /purchases/notes/:no   (المسودة بس)
export async function deleteSupplierNote(n) {
  const ok = await confirmAction({
    title: `حذف مسودة ${n.no}؟`,
    tone: 'critical',
    confirm: 'حذف المسودة',
    consequences: ['المسودة ما اترحّلتش فمفيش أثر محاسبي', 'الرقم بيرجع متاح'],
  })
  if (!ok) return false
  await fake()
  patch('supplierNotes', n.no, { deleted: true })
  toast.ok('المسودة اتحذفت')
  return true
}

// API: POST /purchases/notes/:no/reverse
export async function reverseSupplierNote(n) {
  const ok = await confirmAction({
    title: `عكس الإشعار ${n.no}؟`,
    tone: 'critical',
    confirm: 'عكس الإشعار',
    consequences: ['بيتعمل إشعار مضاد بنفس القيمة',
      'رصيد المورد والإقرار بيرجعوا زي ما كانوا',
      'الإشعار الأصلي بيفضل في السجل'],
  })
  if (!ok) return false
  await fake()
  toast.ok(`${n.no} اتعكس بإشعار مضاد`)
  return true
}

/* ============================================================
   النقد والبنوك
   ============================================================ */

const VOUCHER_AR = { receipts: 'سند القبض', payments: 'سند الصرف', transfers: 'التحويل' }
const VOUCHER_KIND = { receipts: 'receiptVouchers', payments: 'paymentVouchers' }

// API: POST /cash/vouchers/:no/post
export async function postVoucher(kind, v, total, partyName, accName) {
  const rec = kind === 'receipts'
  const ok = await confirmAction({
    title: `ترحيل ${VOUCHER_AR[kind]} ${v.no}؟`,
    tone: 'primary',
    confirm: `ترحيل ${VOUCHER_AR[kind]}`,
    consequences: [
      rec ? `${total} ر.س بتدخل ${accName || 'الحساب'}` : `${total} ر.س بتخرج من ${accName || 'الحساب'}`,
      partyName ? `رصيد ${partyName} بيتغيّر بنفس المبلغ` : 'الطرف التاني بياخد نفس المبلغ في الدفتر',
      'المرحّل مينفعش يتعدّل — بيتعكس بسند مضاد',
    ],
  })
  if (!ok) return false
  await fake()
  patch(VOUCHER_KIND[kind], v.no, { status: 'posted' })
  toast.ok(`${v.no} اترحّل`, { sub: 'اتقيّد في دفتر اليومية' })
  return true
}

// API: POST /cash/vouchers/:no/reverse
export async function reverseVoucher(kind, v) {
  const ok = await confirmAction({
    title: `عكس ${VOUCHER_AR[kind]} ${v.no}؟`,
    tone: 'critical',
    confirm: 'عكس السند',
    consequences: [
      'بيتكتب قيد عكسي بنفس المبلغ — السند نفسه ما بيتمسحش',
      'الرصيد بيرجع زي ما كان قبل السند',
      `${v.no} بيفضل في السجل للأبد`,
    ],
  })
  if (!ok) return false
  await fake()
  patch(VOUCHER_KIND[kind], v.no, { status: 'reversed' })
  toast.ok(`${v.no} اتعكس بقيد مضاد`)
  return true
}

// API: DELETE /cash/vouchers/:no   (المسودة بس)
export async function deleteVoucher(kind, v) {
  const ok = await confirmAction({
    title: `حذف مسودة ${v.no}؟`,
    tone: 'critical',
    confirm: 'حذف المسودة',
    consequences: ['المسودة ما اتقيّدتش، فمفيش أثر محاسبي', 'الرقم بيرجع متاح'],
  })
  if (!ok) return false
  await fake()
  patch(VOUCHER_KIND[kind], v.no, { status: 'deleted' })
  toast.ok(`${v.no} اتمسح`)
  return true
}

// API: POST /cash/transfers/:no/post
export async function postTransfer(t, fromName, toName, total) {
  const ok = await confirmAction({
    title: `ترحيل التحويل ${t.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل التحويل',
    consequences: [
      `${total} ر.س بتخرج من ${fromName}`,
      `${t.amount} ر.س بتدخل ${toName}`,
      t.fee > 0 ? `${t.fee} ر.س رسوم بتتقيّد مصروف بنكي` : 'مفيش رسوم على التحويل ده',
    ],
  })
  if (!ok) return false
  await fake()
  patch('cashTransfers', t.no, { status: 'posted' })
  toast.ok(`${t.no} اترحّل`)
  return true
}

// API: POST /cash/transfers/:no/reverse
export async function reverseTransfer(t) {
  const ok = await confirmAction({
    title: `عكس التحويل ${t.no}؟`,
    tone: 'critical',
    confirm: 'عكس التحويل',
    consequences: ['قيد عكسي بيرجّع المبلغ لحسابه الأصلي',
      'الرسوم المدفوعة ما بترجعش — البنك خدها', 'الرقم بيفضل في السجل'],
  })
  if (!ok) return false
  await fake()
  patch('cashTransfers', t.no, { status: 'reversed' })
  toast.ok(`${t.no} اتعكس`)
  return true
}

// API: GET /cash/accounts/:acc/statement.csv
export async function exportCashStatement(name) {
  const id = toast.info('جاري تجهيز الكشف…', { ms: 9000 })
  await fake()
  toast.dismiss(id)
  toast.ok(`كشف ${name} اتنزّل`, { sub: 'ملف CSV في مجلد التنزيلات' })
}

// API: GET /cash/vouchers/:no.pdf
export async function printVoucher(no) {
  toast.ok(`${no} جاهز للطباعة`, { sub: 'المعاينة اتفتحت' })
}

/* ============================================================
   المحاسبة
   ============================================================ */

// API: POST /accounting/journal/:no/post
export async function postJournal(j, total, balanced) {
  if (!balanced) {
    toast.bad(`${j.no} مش متوازن`, { sub: 'المدين لازم يساوي الدائن قبل الترحيل' })
    return false
  }
  const ok = await confirmAction({
    title: `ترحيل القيد ${j.no}؟`,
    tone: 'primary',
    confirm: 'ترحيل القيد',
    consequences: [
      `${total} ر.س بتتقيّد على ${(j.lines || []).length} حسابات`,
      'الأرصدة بتتغيّر في الميزانية وقائمة الدخل على طول',
      'المُرحَّل **مينفعش يتعدّل ولا يتحذف** — التصحيح بقيد عكسي',
    ],
  })
  if (!ok) return false
  await fake()
  patch('journalEntries', j.no, { status: 'posted' })
  toast.ok(`${j.no} اترحّل`, { sub: 'دخل دفتر الأستاذ' })
  return true
}

// API: POST /accounting/journal/:no/reverse  → بيرجّع رقم القيد العكسي
export async function reverseJournal(j) {
  const ok = await confirmAction({
    title: `عكس القيد ${j.no}؟`,
    tone: 'critical',
    confirm: 'كتابة قيد عكسي',
    consequences: [
      'بيتكتب **قيد جديد** بنفس المبالغ في الاتجاه المعاكس',
      `${j.no} بيفضل في الدفتر زي ما هو — العكس مش مسح`,
      'الأرصدة بترجع زي ما كانت قبل القيد',
    ],
  })
  if (!ok) return false
  await fake()
  patch('journalEntries', j.no, { status: 'reversed' })
  toast.ok('القيد العكسي اتكتب', { sub: `مقابل ${j.no}` })
  return true
}

// API: DELETE /accounting/journal/:no   (المسودة بس)
export async function deleteJournal(j) {
  const ok = await confirmAction({
    title: `حذف مسودة ${j.no}؟`,
    tone: 'critical',
    confirm: 'حذف المسودة',
    consequences: ['المسودة ما دخلتش الدفتر، فمفيش أثر محاسبي',
      'رقم القيد بيرجع متاح — والقيود هي المسلسل الوحيد في السيستم'],
  })
  if (!ok) return false
  await fake()
  patch('journalEntries', j.no, { status: 'deleted' })
  toast.ok(`${j.no} اتمسح`)
  return true
}

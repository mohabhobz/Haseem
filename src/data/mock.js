import { TODAY as FMT_TODAY } from '../lib/format.js'

/* بيانات تجريبية واقعية — شركات سعودية. كل الشاشات بتقرا من هنا. */


  export const org = {
    nameAr: 'ويب سكويدز',
    nameEn: 'Web Squids LLC',
    branch: 'فرع الرياض، العليا',
    address: 'طريق الملك فهد، مبنى ١٢، حي العليا، الرياض ١٢٢١٤',
    vat: '399999999900003',
    cr: '1029239333',
    zatca: 'مربوط بمنصة فاتورة',
    zatcaOk: true,
    zatcaSync: 'آخر مزامنة اليوم ٩:١٤ ص',
    logo: '/tenant-logo.svg',
    initials: 'وس'
  };

  /* المنشآت اللي الحساب ده داخل عليها — مبدّل المنشأة */
  export const orgs = [
    { id:'o1', nameAr:'ويب سكويدز',                initials:'وس', logo:'/tenant-logo.svg', current:true  },
    { id:'o2', nameAr:'شركة الخط المستقيم للمقاولات', initials:'خم', logo:null,             current:false },
  ];

  export const user = { nameAr: 'مهاب هاني', initials: 'مه', role: 'مدير الحساب', photo: '/user.jpg' };
  /* photo: حطّ مسار صورة في public/ زي '/me.jpg' وهتظهر بدل الحروف */

  export const customers = [
    { id:'C-1041', ar:'مؤسسة النخبة للتجارة',        en:'Al Nokhba Trading Est.',      vat:'310245778900003', city:'الرياض', terms:'صافي 30 يوم', balance:  12450.00, docs:14, phone:'+966 55 214 8890', type:'b2b', last:'2026-08-11' },
    { id:'C-1038', ar:'شركة الفهد للمقاولات',         en:'Al Fahd Contracting Co.',     vat:'311908442100003', city:'الرياض', terms:'صافي 10 أيام', balance: 84300.00, docs:27, phone:'+966 50 771 3320', type:'b2b', last:'2026-08-14' },
    { id:'C-1036', ar:'مصنع الرياض للبلاستيك',        en:'Riyadh Plastics Factory',     vat:'302118773400003', city:'الخرج',  terms:'صافي 30 يوم', balance:  5780.50, docs: 9, phone:'+966 53 408 1177', type:'b2b', last:'2026-06-02' },
    { id:'C-1033', ar:'مؤسسة درب الشرق للتوريدات',    en:'Darb Al Sharq Supplies Est.', vat:'309887221000003', city:'الدمام', terms:'صافي 45 يوم', balance: 23900.00, docs:18, phone:'+966 56 992 4471', type:'b2b', last:'2026-08-09' },
    { id:'C-1029', ar:'شركة نسيج الحديثة',            en:'Naseej Modern Co.',           vat:'304451900700003', city:'جدة',    terms:'عند الاستلام', balance: 1240.00, docs: 6, phone:'+966 54 330 6612', type:'b2c', last:'2026-03-18' },
    { id:'C-1024', ar:'مؤسسة البناء المتين',          en:'Al Binaa Al Mateen Est.',     vat:'308774112200003', city:'الرياض', terms:'صافي 30 يوم', balance: 46015.75, docs:11, phone:'+966 55 887 2204', type:'b2b', last:'2026-08-05' },
    { id:'C-1021', ar:'مؤسسة وادي القمم للتقنية',     en:'Wadi Al Qimam Tech Est.',     vat:'305612889400003', city:'الرياض', terms:'صافي 15 يوم', balance: 43110.00, docs:22, phone:'+966 59 114 7758', type:'b2b', last:'2026-07-29' },
    { id:'C-1017', ar:'شركة أصالة للأثاث المكتبي',    en:'Asalah Office Furniture Co.', vat:'301990554300003', city:'جدة',    terms:'صافي 30 يوم', balance:     0.00, docs:31, phone:'+966 55 660 9931', type:'b2b', last:'2026-08-16' },
    { id:'C-1012', ar:'شركة الخليج للتوريدات الطبية', en:'Gulf Medical Supplies Co.',   vat:'307223118800003', city:'الدمام', terms:'صافي 60 يوم', balance:  9325.00, docs:15, phone:'+966 50 448 2216', type:'b2b', last:'2026-02-24' },
    { id:'C-1008', ar:'مجموعة الأفق التجارية',        en:'Al Ufuq Commercial Group',    vat:'303445677900003', city:'الرياض', terms:'صافي 30 يوم', balance: 67400.00, docs:40, phone:'+966 55 019 3345', type:'b2b', last:'2026-08-12' },
    { id:'C-1004', ar:'مؤسسة الصهباء للخدمات',        en:'Al Sahba Services Est.',      vat:'306118990200003', city:'مكة',    terms:'عند الاستلام', balance: 4180.00, docs: 7, phone:'+966 58 227 0043', type:'b2c', last:'2026-05-30' },
    { id:'C-1001', ar:'شركة برج النخيل العقارية',     en:'Burj Al Nakheel Realty Co.',  vat:'300771224500003', city:'الرياض', terms:'صافي 45 يوم', balance: 12900.00, docs:13, phone:'+966 55 903 8871', type:'b2b', last:'2026-08-03' }
  ];

  const cust = i => customers[i];

  // status: draft | issued | partial | paid | overdue | void | cancelled
  // zatca : null | 'ok' | 'bad' | 'pending'
  export const invoices = [
    { no:'INV-027122', prj:'PRJ-012', c:cust(0),  date:'2026-08-14', due:'2026-09-13', total: 12450.00, paid:12450.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027121', prj:'PRJ-014', c:cust(1),  date:'2026-07-18', due:'2026-07-28', total: 84300.00, paid:    0.00, status:'overdue', zatca:'ok',  overdueDays:20 },
    { no:'INV-027120', c:cust(2),  date:'2026-08-11', due:'2026-09-10', total:  5780.50, paid: 5780.50, status:'paid',    zatca:'bad', zatcaReason:'الرقم الضريبي للعميل غير صالح' },
    { no:'INV-027119', prj:'PRJ-012', c:cust(3),  date:'2026-08-09', due:'2026-09-23', total: 23900.00, paid:14340.00, status:'partial', zatca:'ok'  },
    { no:'INV-027118', prj:'PRJ-013', c:cust(4),  date:'2026-08-06', due:'2026-09-05', total:  1240.00, paid:    0.00, status:'issued',  zatca:'ok'  },
    { no:'INV-027117', c:cust(5),  date:'2026-08-04', due:null,         total: 46015.75, paid:    0.00, status:'draft',   zatca:null  },
    { no:'INV-027116', c:cust(8),  date:'2026-07-29', due:'2026-09-27', total:  9325.00, paid:    0.00, status:'cancelled', zatca:null },
    { no:'INV-027115', c:cust(6),  date:'2026-07-26', due:'2026-08-10', total: 43110.00, paid:    0.00, status:'overdue', zatca:'ok',  overdueDays:7 },
    { no:'INV-027114', c:cust(7),  date:'2026-07-22', due:'2026-08-21', total: 18760.25, paid:18760.25, status:'paid',    zatca:'ok'  },
    { no:'INV-027113', c:cust(9),  date:'2026-07-19', due:'2026-08-18', total: 67400.00, paid:20000.00, status:'partial', zatca:'ok'  },
    { no:'INV-027112', c:cust(10), date:'2026-07-15', due:'2026-07-15', total:  4180.00, paid: 4180.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027111', c:cust(11), date:'2026-07-11', due:'2026-08-25', total: 12900.00, paid:    0.00, status:'issued',  zatca:'pending' },
    { no:'INV-027110', c:cust(0),  date:'2026-07-08', due:null,         total:  8900.00, paid:    0.00, status:'draft',   zatca:null  },
    { no:'INV-027109', c:cust(3),  date:'2026-07-02', due:'2026-08-16', total: 31200.00, paid:31200.00, status:'paid',    zatca:'ok'  },
    { no:'INV-027108', c:cust(4),  date:'2026-06-28', due:'2026-07-28', total:  2450.00, paid:    0.00, status:'void',    zatca:'ok'  }
  ];

  // status: draft | sent | accepted | rejected | expired | converted | cancelled
  /* عروض الأسعار **والفواتير المبدئية** — قايمة واحدة زي سيستم
     العميل، لأن الاتنين مستند قبل الفاتورة وبيتحوّلوا لفاتورة.
     الفرق في السؤال اللي بيسألوه للعميل:
     • **عرض سعر** — «توافق على السعر ده؟»
     • **فاتورة مبدئية** — «ادفع الأول وبعدها تطلع الفاتورة الضريبية»
     عشان كده الحقل `kind` مش تزويقة: هو اللي بيغيّر أمر الصف. */
  export const quotations = [
    { no:'PRF-000318', c:cust(4),  date:'2026-08-14', valid:'2026-08-28', total: 58880.00, status:'sent',      kind:'prf' },
    { no:'QUO-004412', c:cust(1),  date:'2026-08-12', valid:'2026-09-11', total: 96500.00, status:'sent'      },
    { no:'QUO-004411', c:cust(9),  date:'2026-08-10', valid:'2026-08-24', total:145000.00, status:'accepted'  },
    { no:'QUO-004410', c:cust(5),  date:'2026-08-07', valid:'2026-09-06', total: 46015.75, status:'draft'     },
    { no:'QUO-004409', c:cust(2),  date:'2026-08-02', valid:'2026-08-16', total: 12300.00, status:'expired'   },
    { no:'QUO-004408', c:cust(6),  date:'2026-07-30', valid:'2026-08-29', total: 43110.00, status:'converted', linked:'INV-027115' },
    { no:'QUO-004407', c:cust(0),  date:'2026-07-25', valid:'2026-08-24', total:  7800.00, status:'rejected'  },
    { no:'QUO-004406', c:cust(3),  date:'2026-07-21', valid:'2026-08-20', total: 23900.00, status:'converted', linked:'INV-027119' },
    { no:'QUO-004405', c:cust(8),  date:'2026-07-16', valid:'2026-07-31', total: 15400.00, status:'cancelled' },
    { no:'QUO-004404', c:cust(10), date:'2026-07-12', valid:'2026-08-11', total:  4180.00, status:'sent'      },
    { no:'QUO-004403', c:cust(7),  date:'2026-07-05', valid:'2026-08-04', total: 62000.00, status:'accepted'  },
    { no:'PRF-000317', c:cust(2),  date:'2026-08-05', valid:'2026-08-19', total: 27600.00, status:'converted', linked:'INV-027121', kind:'prf' },
    { no:'PRF-000316', c:cust(10), date:'2026-07-28', valid:'2026-08-11', total: 13340.00, status:'expired',   kind:'prf' },
    { no:'PRF-000315', c:cust(6),  date:'2026-07-19', valid:'2026-08-02', total: 41400.00, status:'draft',     kind:'prf' }
  ];

  /* نوع المستند — الافتراضي عرض سعر عشان الصفوف القديمة ما تتغيّرش */
  export const isPrf   = (d) => d?.kind === 'prf';
  export const qKindAr = (d) => (isPrf(d) ? 'فاتورة مبدئية' : 'عرض سعر');

  // إشعارات دائنة — تقلّل ما على العميل
  export const creditNotes = [
    { no:'CN-000318', c:cust(2),  date:'2026-08-13', src:'INV-027120', total: 1780.50, status:'issued', zatca:'ok',  reason:'مرتجع بضاعة' },
    { no:'CN-000317', c:cust(3),  date:'2026-08-08', src:'INV-027119', total: 3900.00, status:'issued', zatca:'ok',  reason:'خصم تجاري لاحق' },
    { no:'CN-000316', c:cust(1),  date:'2026-08-03', src:'INV-027121', total:12000.00, status:'draft',  zatca:null,  reason:'تسوية كمية' },
    { no:'CN-000315', c:cust(9),  date:'2026-07-27', src:'INV-027113', total: 5400.00, status:'issued', zatca:'bad', zatcaReason:'مرجع الفاتورة الأصلية غير موجود', reason:'خطأ في السعر' },
    { no:'CN-000314', c:cust(7),  date:'2026-07-20', src:'INV-027114', total: 1260.25, status:'issued', zatca:'ok',  reason:'مرتجع جزئي' },
    { no:'CN-000313', c:cust(4),  date:'2026-07-09', src:'INV-027118', total:  240.00, status:'void',   zatca:'ok',  reason:'أُلغي' }
  ];

  // إشعارات مدينة — تزوّد ما على العميل
  export const debitNotes = [
    { no:'DN-000094', c:cust(1),  date:'2026-08-15', src:'INV-027121', total: 4500.00, status:'issued', zatca:'ok',  reason:'رسوم شحن إضافية' },
    { no:'DN-000093', c:cust(9),  date:'2026-08-05', src:'INV-027113', total: 2100.00, status:'issued', zatca:'ok',  reason:'فرق سعر صرف' },
    { no:'DN-000092', c:cust(6),  date:'2026-07-28', src:'INV-027115', total:  890.00, status:'draft',  zatca:null,  reason:'رسوم تأخير سداد' },
    { no:'DN-000091', c:cust(0),  date:'2026-07-14', src:'INV-027122', total: 1350.00, status:'issued', zatca:'pending', reason:'خدمة تركيب إضافية' }
  ];

  export const attention = [
    { level:'critical', text:'فواتير مرفوضة من هيئة الزكاة والضريبة',  count:2, amount: 11180.50, go:'invoices.html' },
    { level:'critical', text:'فواتير تجاوزت تاريخ الاستحقاق',          count:2, amount:127410.00, go:'invoices.html' },
    { level:'warn',     text:'عروض أسعار تنتهي صلاحيتها خلال أسبوع',   count:3, amount: 46000.00, go:'quotations.html' },
    { level:'warn',     text:'مسودات لم تُصدَر منذ أكثر من 14 يوم',     count:2, amount: 54915.75, go:'invoices.html' }
  ];

/* ============================================================
   بنود الفواتير وسجل الحركة — بتتولّد من رقم المستند عشان
   تفضل ثابتة بين كل تحميل، ومطابقة لإجمالي الفاتورة بالضبط.
   ============================================================ */
export const catalog = [
  { code:'SRV-011', ar:'تصميم واجهات وتجربة استخدام', unit:'ساعة', price:  320 },
  { code:'SRV-024', ar:'تطوير واجهة أمامية',           unit:'ساعة', price:  280 },
  { code:'SRV-031', ar:'استضافة ودعم فني — شهري',      unit:'شهر',  price: 1500 },
  { code:'PRD-104', ar:'رخصة نظام — مستخدم',           unit:'رخصة', price:  850 },
  { code:'SRV-052', ar:'تدريب فريق العميل',            unit:'جلسة', price: 2400 },
  { code:'PRD-088', ar:'تكامل مع منصة فاتورة',         unit:'خدمة', price: 6500 },
]

const seedOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7)

/* بنود بأسعار وحدة واقعية، ومجموعها بيطابق صافي الفاتورة بالظبط
   (الإجمالي ÷ ١٫١٥). آخر بند بياخد فرق التقريب. */
export function linesOf(doc) {
  const seed = seedOf(doc.no)
  const n = 2 + (seed % 3)
  const net = +(doc.total / 1.15).toFixed(2)
  const w = Array.from({ length: n }, (_, i) => ((seed >> (i * 3)) % 7) + 2)
  const sum = w.reduce((a, b) => a + b, 0)

  const out = []
  let left = net
  for (let i = 0; i < n; i++) {
    const item = catalog[(seed + i * 5) % catalog.length]
    if (i === n - 1) {
      const qty = Math.max(1, Math.round(left / item.price))
      out.push({ ...item, qty, price: +(left / qty).toFixed(2), total: +left.toFixed(2) })
    } else {
      const share = (net * w[i]) / sum
      const qty = Math.max(1, Math.round(share / item.price))
      const total = +(qty * item.price).toFixed(2)
      left -= total
      out.push({ ...item, qty, total })
    }
  }
  return out
}

/* ★ التحصيل بيدخل الحساب اللي اتدفع فيه فعلًا.
   قبل كده كل تحصيل كان بيتقيّد على البنك، فحساب الشبكة وبوابة
   الدفع كانوا بياخدوا تحويلات تسوية **طالعة** من غير ما يدخلهم
   حاجة — يعني رصيدهم بيبقى سالب، وده مستحيل في الواقع.
   طريقة الدفع هي اللي بتحدد الحساب: شبكة ← ١٠٣٠، مدى/أبل باي ←
   ١٠٤٠، نقدًا ← ١٠١٠، تحويل ← ١٠٢٠. */
const PAY_ACC = {
  'شبكة': '1030', 'مدى — أبل باي': '1040', 'نقدًا': '1010', 'تحويل بنكي': '1020',
}
const PAY_WAYS = ['تحويل بنكي', 'شبكة', 'مدى — أبل باي', 'تحويل بنكي', 'نقدًا']

export function paymentsOf(doc) {
  if (!doc.paid) return []
  const seed = seedOf(doc.no)
  const full = doc.paid >= doc.total
  /* ★ الدفعة ما ينفعش تكون بتاريخ في المستقبل. الفاتورة المدفوعة
     بالكامل كانت بتاخد تاريخ الاستحقاق حتى لو لسه ما جاش — يعني
     فاتورة «مدفوعة» بدفعة هتحصل بعد شهر. بنقفلها على النهاردة. */
  const cap = (d) => (d && d > TODAY ? TODAY : d)
  const date = cap(full ? (doc.due || doc.date) : doc.date) || doc.date
  const way = PAY_WAYS[seed % PAY_WAYS.length]
  return [{ date, amount: doc.paid, way, acc: PAY_ACC[way],
    ref: `TRX-${9000 + (seed % 900)}` }]
}

/* سجل الحركة — بيتبني من حالة المستند نفسها، مفيش أحداث متخيّلة */
export function timelineOf(doc) {
  const t = [{ k: 'created', ar: 'اتعملت مسودة', date: doc.date, who: user.nameAr }]
  if (doc.status !== 'draft') {
    t.push({ k: 'issued', ar: 'اتصدرت واترسلت للعميل', date: doc.date, who: user.nameAr })
    if (doc.zatca === 'ok')      t.push({ k: 'zatca', ar: 'الهيئة قبلتها', date: doc.date, who: 'منصة فاتورة' })
    if (doc.zatca === 'pending') t.push({ k: 'wait',  ar: 'في انتظار رد الهيئة', date: doc.date, who: 'منصة فاتورة' })
    if (doc.zatca === 'bad')     t.push({ k: 'bad',   ar: `الهيئة رفضتها — ${doc.zatcaReason || 'سبب غير محدد'}`, date: doc.date, who: 'منصة فاتورة' })
  }
  paymentsOf(doc).forEach((p) =>
    t.push({ k: 'paid', ar: `اتسجّلت دفعة ${p.way}`, date: p.date, who: user.nameAr, amount: p.amount }))
  if (doc.status === 'cancelled') t.push({ k: 'void', ar: 'اتلغت', date: doc.due || doc.date, who: user.nameAr })
  return t
}

export const findInvoice = (no) => invoices.find((v) => v.no === no)

/* ---------- بيانات الفورم: فروع · مستودعات · مندوبين · بنوك ---------- */
/* ★ الفرع ليه **كود** `BR-` بيتكتب في رأس الفاتورة وبيروح للهيئة،
   مش نص حر. عندنا كان «فرع الرياض، العليا» نص من غير كود. */
export const branches = [
  { id: 'BR-01', code: 'BR-01', ar: 'الفرع الرئيسي', city: 'الرياض',
    address: 'طريق الملك فهد، مبنى ١٢، حي العليا', zip: '12214', main: true },
  { id: 'BR-02', code: 'BR-02', ar: 'فرع جدة', city: 'جدة',
    address: 'طريق المدينة، حي الروضة', zip: '23433', main: false },
  { id: 'BR-03', code: 'BR-03', ar: 'فرع الدمام', city: 'الدمام',
    address: 'شارع الملك سعود، حي الفيصلية', zip: '32241', main: false },
]
export const branchOf = (id) => branches.find((b) => b.id === id)

/* الفاتورة مقيّدة بإشعار؟ — بُعد مستقل عن السداد */
export function creditedState(no, total) {
  const c = creditNotes.filter((n) => n.src === no && n.status === 'issued')
    .reduce((s, n) => s + n.total, 0)
  if (c <= 0.009) return null
  return { amount: +c.toFixed(2), full: c >= total - 0.009,
    net: +(total - c).toFixed(2) }
}
export const warehouses = [
  { id: 'WH-01', ar: 'المستودع الرئيسي' },
  { id: 'WH-02', ar: 'مستودع جدة' },
]
/* المستودع على صف الفاتورة — السيستم بيعرضه في القايمة.
   مشتق من رقم المستند مش متخزّن، عشان يفضل ثابت لنفس الفاتورة
   في كل رندر بدل ما يتغيّر كل مرة. */
export const whOf = (no) =>
  warehouses[Math.abs(+String(no).replace(/\D/g, '')) % warehouses.length]
export const reps = [
  { id: 'SP-01', ar: 'مهاب هاني' },
  { id: 'SP-02', ar: 'سعد الحربي' },
  { id: 'SP-03', ar: 'نورة العتيبي' },
]

/* ---------- أبعاد المستند المشتقّة ----------
   الفرع والمندوب ومركز التكلفة مش متخزّنين على الفاتورة في
   الموك. بنشتقّهم من رقم المستند بنفس أسلوب `whOf` الموجود
   فوق: **ثابت لنفس الفاتورة** في كل رندر، فالفلترة بتدّي نفس
   النتيجة كل مرة بدل ما الأرقام ترقص.

   لما البيانات الحقيقية تيجي، الحقول دي بتتحط على المستند
   والدوال دي بتتشال — الواجهة مش هتتغيّر. */
const docSeed = (no) => Math.abs(+String(no).replace(/\D/g, '') || 0)
export const repOfDoc    = (no) => reps[docSeed(no) % reps.length]
export const branchOfDoc = (no) => branches[(docSeed(no) >> 1) % branches.length]
export const ccOfDoc     = (no) => costCenters[(docSeed(no) >> 2) % costCenters.length]
/* `logo`: مسار صورة في public/ (مثلًا '/banks/rajhi.svg').
   سايبينه null عمدًا لحد ما تتوفّر الشعارات — والواجهة بتحط
   أيقونة بنك مكانه، فمفيش حالة «صورة مكسورة». */
export const banks = [
  { id: 'BK-01', ar: 'البنك الأهلي السعودي', iban: 'SA03 8000 0000 6080 1016 7519', holder: 'Web Squids LLC', logo: '/banks/snb.png' },
  { id: 'BK-02', ar: 'مصرف الراجحي',        iban: 'SA44 2000 0001 2345 6789 1234', holder: 'Web Squids LLC', logo: null },
]
/* مراكز التكلفة اتنقلت لقسم المحاسبة تحت — تعريف واحد بكود ووصف.
   (كانت هنا تلات أسماء من غير أكواد، وكان فيها **أسماء مشاريع** —
   والمشروع بُعد تاني غير مركز التكلفة، ليه موديول لوحده.) */
/* الفئات الضريبية المعتمدة من الهيئة */
/* فئات الضريبة زي ما هي في السيستم — أكواد الهيئة (S · Z · E · O).
   الفرق بين صفري ومعفي وغير خاضع مش شكلي: بيتكتب في XML الفاتورة. */
export const taxRates = [
  { id: 'S',   ar: 'خاضع للضريبة ١٥٪',                  rate: 15 },
  { id: 'ZX',  ar: 'صادرات (Export — ٠٪)',              rate: 0  },
  { id: 'Z',   ar: 'توريدات بنسبة صفر — أخرى (Z — ٠٪)', rate: 0  },
  { id: 'E',   ar: 'معفي من الضريبة (E — ٠٪)',          rate: 0  },
  { id: 'O',   ar: 'غير خاضع للضريبة (O — ٠٪)',         rate: 0  },
]
export const rateOf = (id) => taxRates.find((t) => t.id === id)?.rate ?? 0

/* ★ أكواد الإعفاء الرسمية VATEX — الهيئة بتطلبها **مع** الفئة على
   البند الصفري أو المعفي، وبتتكتب في XML الفاتورة. عندنا كانت
   الفئة بس (S · ZX · Z · E · O) من غير الكود، والفاتورة كده
   بتترفض لو البند مش خاضع. */
export const vatexCodes = {
  ZX: [
    { id: 'VATEX-SA-32', ar: 'تصدير سلع خارج المملكة' },
    { id: 'VATEX-SA-33', ar: 'تصدير خدمات خارج المملكة' },
    { id: 'VATEX-SA-34-1', ar: 'النقل الدولي للسلع' },
    { id: 'VATEX-SA-34-2', ar: 'النقل الدولي للركاب' },
  ],
  Z: [
    { id: 'VATEX-SA-35', ar: 'أدوية وسلع طبية' },
    { id: 'VATEX-SA-36', ar: 'معادن استثمارية مؤهلة' },
    { id: 'VATEX-SA-EDU', ar: 'خدمات تعليمية خاصة لمواطن' },
    { id: 'VATEX-SA-HEA', ar: 'خدمات صحية خاصة لمواطن' },
  ],
  E: [
    { id: 'VATEX-SA-29', ar: 'خدمات مالية' },
    { id: 'VATEX-SA-29-7', ar: 'عقد تأمين على الحياة' },
    { id: 'VATEX-SA-30', ar: 'تأجير عقار سكني' },
  ],
  O: [{ id: 'VATEX-SA-OOS', ar: 'خارج نطاق الضريبة' }],
}
export const vatexFor = (tax) => vatexCodes[tax] || []
export const needsVatex = (tax) => tax !== 'S'

/* ============================================================
   دليل الحسابات — قايمة واحدة لكل السيستم، مفلترة بالنوع.

   في سيستم العميل قايمة «حساب المصروف» بتعرض الشجرة كلها
   (٥٦ حساب فيهم البنك ورأس المال وإيرادات المبيعات)، فتقدر
   تقيّد مصروف على حساب بنكي. هنا كل شاشة بتاخد نوعها بس:
   بند المبيعات ← revenue · المصروف ← expense · السداد ← cash
   ============================================================ */
export const accounts = [
  /* ---------- أصول ---------- */
  { id: '1010', ar: '١٠١٠ — الصندوق الرئيسي',             kind: 'cash',   type: 'asset' },
  { id: '1020', ar: '١٠٢٠ — الحساب البنكي الرئيسي',       kind: 'cash',   type: 'asset' },
  { id: '1030', ar: '١٠٣٠ — شبكة — نقاط البيع',           kind: 'cash',   type: 'asset' },
  { id: '1040', ar: '١٠٤٠ — مقاصة المدفوعات الإلكترونية', kind: 'cash',   type: 'asset' },
  { id: '1200', ar: '١٢٠٠ — الذمم المدينة التجارية',      kind: 'ar',     type: 'asset' },
  { id: '1300', ar: '١٣٠٠ — ضريبة القيمة المضافة — مدخلات', kind: 'vatIn',  type: 'asset' },
  { id: '1310', ar: '١٣١٠ — ضريبة المدخلات — الواردات',   kind: 'vatImp', type: 'asset' },
  { id: '1400', ar: '١٤٠٠ — المخزون',                     kind: 'stock',  type: 'asset' },
  /* ---------- التزامات ---------- */
  { id: '2000', ar: '٢٠٠٠ — الذمم الدائنة التجارية',      kind: 'ap',     type: 'liability' },
  { id: '2100', ar: '٢١٠٠ — ضريبة القيمة المضافة — مخرجات', kind: 'vatOut', type: 'liability' },
  { id: '2130', ar: '٢١٣٠ — مستحقات جمركية',              kind: 'customs', type: 'liability' },
  { id: '2200', ar: '٢٢٠٠ — مصروفات مستحقة',              kind: 'accrual', type: 'liability' },
  /* ---------- حقوق ملكية ---------- */
  { id: '3000', ar: '٣٠٠٠ — رأس المال',                   kind: 'equity', type: 'equity' },
  { id: '3200', ar: '٣٢٠٠ — الأرباح المبقاة',             kind: 'equity', type: 'equity' },
  /* ---------- إيرادات — بند فاتورة المبيعات ---------- */
  { id: '4101', ar: '٤١٠١ — إيرادات الخدمات',  kind: 'revenue', type: 'revenue' },
  { id: '4102', ar: '٤١٠٢ — إيرادات المبيعات', kind: 'revenue', type: 'revenue' },
  /* ★ «إيرادات أخرى» مش مبيعات. لو فضل `kind:'revenue'` كان هيتجمع
     جوّه «صافي المبيعات» — يعني تعويض تأميني يبان كأنه بيع. سطره
     الصح تحت الربح التشغيلي، زي ما هو في قائمة دخل العميل. */
  { id: '4201', ar: '٤٢٠١ — إيرادات أخرى',     kind: 'other',   type: 'revenue' },
  { id: '4150', ar: '٤١٥٠ — مردودات المبيعات', kind: 'contra',  type: 'revenue' },
  /* ---------- مصروفات — «حساب المصروف» وبند فاتورة الشراء ---------- */
  { id: '5010', ar: '٥٠١٠ — تكلفة البضاعة المباعة',   kind: 'expense', type: 'cogs' },
  { id: '5020', ar: '٥٠٢٠ — مصروفات تشغيلية عامة',    kind: 'expense', type: 'expense' },
  { id: '5030', ar: '٥٠٣٠ — رواتب وأجور',             kind: 'expense', type: 'expense' },
  { id: '5040', ar: '٥٠٤٠ — التأمينات الاجتماعية',     kind: 'expense', type: 'expense' },
  { id: '5050', ar: '٥٠٥٠ — إيجارات',                 kind: 'expense', type: 'expense' },
  { id: '5060', ar: '٥٠٦٠ — مرافق وخدمات',            kind: 'expense', type: 'expense' },
  { id: '5070', ar: '٥٠٧٠ — تسويق وإعلان',            kind: 'expense', type: 'expense' },
  { id: '5080', ar: '٥٠٨٠ — رسوم حكومية وتراخيص',     kind: 'expense', type: 'expense' },
  { id: '5090', ar: '٥٠٩٠ — اتصالات وبرمجيات',        kind: 'expense', type: 'expense' },
  { id: '5100', ar: '٥١٠٠ — صيانة وإصلاح',            kind: 'expense', type: 'expense' },
  { id: '5110', ar: '٥١١٠ — أتعاب مهنية',             kind: 'expense', type: 'expense' },
  { id: '5120', ar: '٥١٢٠ — رسوم بنكية',              kind: 'expense', type: 'expense' },
  { id: '5130', ar: '٥١٣٠ — عمولات وسائل الدفع',      kind: 'expense', type: 'expense' },
  { id: '5140', ar: '٥١٤٠ — مصاريف شحن ونقل',         kind: 'expense', type: 'expense' },
  { id: '5150', ar: '٥١٥٠ — عجز وفائض الصندوق',      kind: 'expense', type: 'expense' },
]
/* رأس المال الافتتاحي — القيد اللي بيخلّي الميزانية متوازنة من أول يوم.
   بيتوزّع على أكتر من حساب لأن المصروفات النقدية بتتدفع من الخزنة
   ومن مقاصة المدفوعات، ورصيد النقد ما ينفعش ينزل تحت الصفر. */
export const openingCapital = {
  date: '2026-01-01',
  splits: [
    { acc: '1020', amount: 250000 },   /* البنك */
    { acc: '1010', amount:  40000 },   /* الصندوق */
    { acc: '1040', amount:  10000 },   /* مقاصة المدفوعات */
  ],
}
export const openingTotal = openingCapital.splits.reduce((a, x) => a + x.amount, 0)

export const accountsOf = (kind) => accounts.filter((a) => a.kind === kind)
export const accountOf  = (id)   => accounts.find((a) => a.id === id)
/* الاسم من غير الرقم — للجداول الضيقة.

   ★ كان `split(' — ')[1]` — وده بيقصّ أي اسم فيه شرطة تانية:
   «ضريبة القيمة المضافة — مدخلات» كانت بتطلع «ضريبة القيمة
   المضافة»، وبكده حساب المدخلات وحساب المخرجات يظهروا بنفس
   الاسم بالظبط في الميزانية. الصح إننا نشيل **الرقم بس**. */
export const accLabel = (a) => {
  const s = typeof a === 'string' ? a : (a?.ar || '')
  const i = s.indexOf(' — ')
  return i < 0 ? s : s.slice(i + 3)
}
export const accName = (id) => accLabel(accountOf(id)) || id
/* قوالب الطباعة */
export const printTemplates = [
  { id: 'default', ar: 'القالب الافتراضي' },
  { id: 'compact', ar: 'قالب مختصر' },
  { id: 'letter',  ar: 'قالب بورق الشركة' },
]

/* ============================================================
   المنتجات والخدمات (المخزون)

   الداتا دي متبنية من جرد سيستم العميل (دوك ١٠) حقل بحقل:
   رمز الصنف والباركود والفئة وتاريخ الصلاحية ونوع الصنف
   وسعرَي البيع والشراء واسم ورمز الوحدة وفئة الضريبة
   والمخزون الافتتاحي وحد التنبيه.

   ★ الرصيد مش رقم مكتوب على الصنف — ده **مجموع حركاته**.
   عشان كده الرصيد بيتحسب من التسويات والنقل، مش متخزّن.
   ده اللي بيخلّي التقارير والقائمة يقولوا نفس الرقم دايمًا.
   ============================================================ */

/* رموز الوحدات — أكواد UN/ECE زي ما هي في السيستم (١٨ وحدة) */
export const units = [
  { code: 'PCE', ar: 'قطعة' },   { code: 'EA',  ar: 'وحدة' },
  { code: 'KGM', ar: 'كيلوغرام' }, { code: 'GRM', ar: 'غرام' },
  { code: 'TNE', ar: 'طن' },      { code: 'MTR', ar: 'متر' },
  { code: 'MTK', ar: 'متر مربع' }, { code: 'MTQ', ar: 'متر مكعب' },
  { code: 'LTR', ar: 'لتر' },     { code: 'MLT', ar: 'مليلتر' },
  { code: 'HUR', ar: 'ساعة' },    { code: 'DAY', ar: 'يوم' },
  { code: 'MON', ar: 'شهر' },     { code: 'ANN', ar: 'سنة' },
  { code: 'KWH', ar: 'كيلوواط ساعة' }, { code: 'SET', ar: 'طقم' },
  { code: 'PK',  ar: 'عبوة' },    { code: 'BX',  ar: 'صندوق' },
]
export const unitOf = (code) => units.find((u) => u.code === code)

/* المستودعات — بالشكل الكامل اللي في شاشة المستودعات */
export const stores = [
  { id: 'WH-01', ar: 'المستودع الرئيسي',  en: 'Main',        branch: 'BR-01', main: true  },
  { id: 'WH-02', ar: 'مستودع جدة',        en: 'Jeddah',      branch: 'BR-02', main: false },
  { id: 'WH-03', ar: 'مستودع المعرض',     en: 'Showroom',    branch: 'BR-01', main: false },
]
export const storeOf = (id) => stores.find((s) => s.id === id)

/* فئات الأصناف */
export const itemCats = ['مواد بناء', 'كهرباء', 'عزل وتشطيبات', 'خدمات هندسية', 'رخص وبرمجيات']

/* الأصناف — منتجات وخدمات. open = المخزون الافتتاحي لكل مستودع */
export const items = [
  { sku:'PRD-244991', ar:'أسمنت مقاوم — كيس ٥٠ كجم', en:'Sulphate-Resistant Cement 50kg',
    barcode:'6281000112233', cat:'مواد بناء', kind:'product', sell:24.50, cost:18.00,
    unitName:'كيس', unitCode:'BX', tax:'S', reorder:400, expiry:'2027-03-31',
    open:{ 'WH-01':1200, 'WH-03':150 }, desc:'أسمنت بورتلاندي مقاوم للأملاح للأساسات.' },

  { sku:'PRD-244992', ar:'حديد تسليح ١٢ مم', en:'Rebar 12mm',
    barcode:'6281000112240', cat:'مواد بناء', kind:'product', sell:3150.00, cost:2780.00,
    unitName:'طن', unitCode:'TNE', tax:'S', reorder:12,
    open:{ 'WH-01':38 }, desc:'حديد تسليح مطابق للمواصفة السعودية.' },

  { sku:'PRD-244993', ar:'كابل نحاس ٣×٤ مم', en:'Copper Cable 3x4mm',
    barcode:'6281000112257', cat:'كهرباء', kind:'product', sell:14.75, cost:11.20,
    unitName:'متر', unitCode:'MTR', tax:'S', reorder:1000,
    open:{ 'WH-01':2400, 'WH-02':600 } },

  { sku:'PRD-244994', ar:'لوح عزل مائي — رول', en:'Waterproofing Membrane Roll',
    barcode:'6281000112264', cat:'عزل وتشطيبات', kind:'product', sell:210.00, cost:168.00,
    unitName:'رول', unitCode:'PCE', tax:'S', reorder:60, expiry:'2026-09-30',
    open:{ 'WH-01':84 }, desc:'رول بيتوميني ٤ مم — صلاحية سنتين من الإنتاج.' },

  { sku:'PRD-244995', ar:'دهان أساس — جالون', en:'Primer Paint Gallon',
    barcode:'6281000112271', cat:'عزل وتشطيبات', kind:'product', sell:96.00, cost:71.50,
    unitName:'جالون', unitCode:'LTR', tax:'S', reorder:80, expiry:'2026-08-20',
    open:{ 'WH-03':46 } },

  { sku:'PRD-244996', ar:'رخصة نظام — مستخدم سنوي', en:'System Licence — User/Year',
    barcode:'', cat:'رخص وبرمجيات', kind:'product', sell:850.00, cost:520.00,
    unitName:'رخصة', unitCode:'EA', tax:'S', reorder:0,
    open:{ 'WH-01':25 } },

  { sku:'SRV-011000', ar:'تصميم واجهات وتجربة استخدام', en:'UI/UX Design',
    barcode:'', cat:'خدمات هندسية', kind:'service', sell:320.00, cost:0,
    unitName:'ساعة', unitCode:'HUR', tax:'S' },

  { sku:'SRV-024000', ar:'إشراف هندسي على التنفيذ', en:'Site Supervision',
    barcode:'', cat:'خدمات هندسية', kind:'service', sell:2275.00, cost:0,
    unitName:'يوم', unitCode:'DAY', tax:'S' },

  { sku:'SRV-031000', ar:'استضافة ودعم فني — شهري', en:'Hosting & Support — Monthly',
    barcode:'', cat:'رخص وبرمجيات', kind:'service', sell:1500.00, cost:0,
    unitName:'شهر', unitCode:'MON', tax:'S' },

  { sku:'SRV-052000', ar:'أعمال صبّ الخرسانة', en:'Concrete Casting Works',
    barcode:'', cat:'خدمات هندسية', kind:'service', sell:1450.00, cost:0,
    unitName:'متر مكعب', unitCode:'MTQ', tax:'S' },

  { sku:'SRV-052001', ar:'تركيب أعمال التكييف', en:'HVAC Installation',
    barcode:'', cat:'خدمات هندسية', kind:'service', sell:3100.00, cost:0,
    unitName:'خدمة', unitCode:'EA', tax:'S' },

  { sku:'SRV-052002', ar:'تدريب فريق العميل', en:'Client Team Training',
    barcode:'', cat:'خدمات هندسية', kind:'service', sell:2400.00, cost:0,
    unitName:'جلسة', unitCode:'SET', tax:'E' },
]
export const findItem = (sku) => items.find((i) => i.sku === sku)
export const stockItems = () => items.filter((i) => i.kind === 'product')

/* تسويات المخزون — زيادة أو نقص بسبب مكتوب */
export const adjustments = [
  { no:'ADJ-000104', sku:'PRD-244991', store:'WH-01', dir:'down', qty:40,  reason:'تلف أثناء التخزين', date:'2026-08-14', who:'مهاب هاني' },
  { no:'ADJ-000103', sku:'PRD-244993', store:'WH-01', dir:'down', qty:120, reason:'فرق جرد', date:'2026-08-11', who:'سعد الحربي' },
  { no:'ADJ-000102', sku:'PRD-244992', store:'WH-01', dir:'up',   qty:4,   reason:'تصحيح رصيد افتتاحي', date:'2026-08-04', who:'مهاب هاني' },
  { no:'ADJ-000101', sku:'PRD-244994', store:'WH-01', dir:'down', qty:9,   reason:'عينات للعميل', date:'2026-07-28', who:'نورة العتيبي' },
]

/* نقل المخزون — ليه دورة حياة: مسودة ← صادر (زي المستندات) */
export const transfers = [
  { no:'TRF-000042', sku:'PRD-244993', from:'WH-01', to:'WH-02', qty:400, note:'تغذية مشروع جدة', date:'2026-08-12', status:'issued', files:1, who:'مهاب هاني' },
  { no:'TRF-000041', sku:'PRD-244991', from:'WH-01', to:'WH-03', qty:150, note:'عرض المعرض', date:'2026-08-06', status:'issued', files:0, who:'سعد الحربي' },
  { no:'TRF-000040', sku:'PRD-244995', from:'WH-01', to:'WH-03', qty:46,  note:'', date:'2026-08-16', status:'draft', files:0, who:'مهاب هاني' },
]

/* ---------- الرصيد: بيتحسب من الحركة، مش متخزّن ---------- */

/* رصيد صنف في مستودع واحد */
export function stockAt(sku, store) {
  const it = findItem(sku)
  if (!it || it.kind !== 'product') return 0
  let q = (it.open && it.open[store]) || 0
  adjustments.forEach((a) => {
    if (a.sku === sku && a.store === store) q += a.dir === 'up' ? a.qty : -a.qty
  })
  /* المسودة ما اتحركتش لسه — الرصيد بيتأثر بالصادر بس */
  transfers.forEach((t) => {
    if (t.sku !== sku || t.status !== 'issued') return
    if (t.from === store) q -= t.qty
    if (t.to === store)   q += t.qty
  })
  return q
}

/* الرصيد الكلي عبر المستودعات */
export const stockOf = (sku) =>
  stores.reduce((a, s) => a + stockAt(sku, s.id), 0)

/* الرصيد مفصّل لكل مستودع — بيرجّع اللي فيه رصيد بس */
export const stockRows = (sku) =>
  stores.map((s) => ({ store: s, qty: stockAt(sku, s.id) })).filter((r) => r.qty !== 0)

/* تحت حد التنبيه؟ الصفر مش حد — الصنف اللي حده صفر مش بيتراقب */
export const isLow = (it) =>
  it.kind === 'product' && it.reorder > 0 && stockOf(it.sku) <= it.reorder

export const isOut = (it) => it.kind === 'product' && stockOf(it.sku) <= 0

/* قيمة المخزون = الرصيد × متوسط التكلفة */
export const stockValue = (it) => +(stockOf(it.sku) * (it.cost || 0)).toFixed(2)

/* حركة الصنف — التسويات والنقل مرتبين بالتاريخ */
export function movesOf(sku) {
  const out = []
  adjustments.filter((a) => a.sku === sku).forEach((a) =>
    out.push({ k: 'adj', no: a.no, date: a.date, who: a.who,
      ar: a.dir === 'up' ? 'تسوية بالزيادة' : 'تسوية بالنقص',
      sub: a.reason, store: a.store, qty: a.dir === 'up' ? a.qty : -a.qty }))
  transfers.filter((t) => t.sku === sku).forEach((t) =>
    out.push({ k: 'trf', no: t.no, date: t.date, who: t.who,
      ar: 'نقل بين المستودعات', draft: t.status === 'draft',
      sub: `${storeOf(t.from)?.ar} ← ${storeOf(t.to)?.ar}`, qty: t.qty }))
  return out.sort((a, b) => new Date(b.date) - new Date(a.date))
}


/* ════════════════════════════════════════════════════════════
   المشتريات والمصروفات
   ════════════════════════════════════════════════════════════ */

/* فئات ضريبة المشتريات — القيم اللي في سيستم العميل بالظبط */
export const purchaseTax = [
  { id:'S',  ar:'خاضع للضريبة 15%',              rate:0.15 },
  { id:'ZX', ar:'مشتريات خاضعة لنسبة الصفر (0%)', rate:0    },
  { id:'Z',  ar:'مشتريات معفاة (0%)',             rate:0    },
  { id:'O',  ar:'مشتريات خارج النطاق (0%)',       rate:0    },
]
export const taxOf = (id) => purchaseTax.find((t) => t.id === id)

/* ---------- الموردون ---------- */
/* balance مش مكتوب — بيتحسب من الفواتير والدفعات. زي المخزون. */
export const suppliers = [
  { id:'SUP-2041', ar:'مصنع الرياض للحديد',        en:'Riyadh Steel Factory',
    vat:'310556711200003', cr:'1010449281', type:'company', city:'الرياض',
    phone:'+966 11 445 7712', email:'sales@riyadhsteel.sa', terms:'صافي 30 يوم',
    open:0, cat:'مواد بناء' },
  { id:'SUP-2038', ar:'شركة أسمنت المنطقة الوسطى',  en:'Central Region Cement Co.',
    vat:'302881445600003', cr:'1010228834', type:'company', city:'الرياض',
    phone:'+966 11 220 9934', email:'orders@crcement.sa', terms:'صافي 45 يوم',
    open:0, cat:'مواد بناء' },
  { id:'SUP-2033', ar:'مؤسسة الخليج لمعدات السلامة', en:'Gulf Safety Equipment Est.',
    vat:'308114779000003', cr:'2050338817', type:'company', city:'الدمام',
    phone:'+966 13 887 2201', email:'info@gulfsafety.sa', terms:'صافي 30 يوم',
    open:0, cat:'معدات' },
  { id:'SUP-2029', ar:'اليمامة للتوريدات الكهربائية', en:'Al Yamamah Electrical Supplies',
    vat:'305779223400003', cr:'1010991143', type:'company', city:'الرياض',
    phone:'+966 11 663 4478', email:'sales@yamamah-elec.sa', terms:'صافي 15 يوم',
    open:0, cat:'كهرباء' },
  { id:'SUP-2024', ar:'الخرسانة العربية الجاهزة',    en:'Arabian Ready Mix Concrete',
    vat:'309223558800003', cr:'1010774432', type:'company', city:'جدة',
    phone:'+966 12 664 0091', email:'jeddah@arabianmix.sa', terms:'عند الاستلام',
    open:0, cat:'مواد بناء' },
  { id:'SUP-2018', ar:'مكتب الاستشارات الهندسية المتحد', en:'United Engineering Consultants',
    vat:'301447889300003', cr:'1010556621', type:'company', city:'الرياض',
    phone:'+966 11 201 7745', email:'admin@uec.sa', terms:'صافي 30 يوم',
    open:0, cat:'خدمات' },
  { id:'SUP-2011', ar:'سعود بن ناصر الدوسري',       en:'Saud N. Al Dossari',
    vat:'', cr:'', type:'person', city:'الرياض',
    phone:'+966 55 330 8812', email:'saud.dossari@example.sa', terms:'عند الاستلام',
    open:0, cat:'خدمات' },
  { id:'SUP-2006', ar:'شركة أفق التقنية للبرمجيات',  en:'Ufuq Tech Software Co.',
    vat:'304118662200003', cr:'1010883376', type:'company', city:'الرياض',
    phone:'+966 11 990 2214', email:'billing@ufuqtech.sa', terms:'سنوي مقدّم',
    open:0, cat:'رخص وبرمجيات' },
]
export const supplierOf = (id) => suppliers.find((s) => s.id === id)
const sup = (i) => suppliers[i]

/* ---------- فواتير المشتريات ---------- */
/* status : draft | posted | cancelled   ← حالة المستند
   paid   : المدفوع فعليًا. حالة السداد بتتحسب منه مش مخزّنة.
   ref    : رقم فاتورة المورد نفسه (مستنده هو) */
export const bills = [
  { no:'BL-000318', s:sup(0), date:'2026-08-15', due:'2026-09-17', ref:'RSF-2026-4417',
    pay:'none', status:'posted', store:'WH-01', po:'PO-000142',
    lines:[{ sku:'PRD-244992', qty:44, price:2795.00, tax:'S', acc: '1400' }] },
  { no:'BL-000317', s:sup(1), date:'2026-08-16', due:'2026-09-30', ref:'CRC-88214',
    pay:'full', status:'posted', store:'WH-01',
    lines:[{ sku:'PRD-244991', qty:1600, price:17.25, tax:'S', acc: '1400' }] },
  { no:'BL-000316', s:sup(3), date:'2026-08-14', due:'2026-08-29', ref:'YEL-9932',
    pay:12000.00, status:'posted', store:'WH-01',
    lines:[{ sku:'PRD-244993', qty:2400, price:11.20, tax:'S', acc: '1400' }] },
  { no:'BL-000315', s:sup(2), date:'2026-08-11', due:'2026-09-10', ref:'GSE-1174',
    pay:'none', status:'posted', store:'WH-03',
    lines:[{ sku:'PRD-244995', qty:210, price:34.75, tax:'S', acc: '1400' }] },
  { no:'BL-000314', s:sup(5), date:'2026-08-08', due:'2026-08-08', ref:'UEC-2026-77',
    pay:'full', status:'posted',
    lines:[{ sku:'SRV-024000', qty:1, price:18000.00, tax:'S', acc: '5110', cc:'CC-03', prj:'PRJ-014' }] },
  { no:'BL-000313', s:sup(4), date:'2026-08-04', due:'2026-08-04', ref:'ARM-55210',
    pay:'none', status:'posted', store:'WH-02',
    lines:[{ sku:'PRD-244994', qty:95, price:130.55, tax:'S', acc: '1400' }] },
  { no:'BL-000312', s:sup(7), date:'2026-07-30', due:'2026-08-29', ref:'UTS-INV-3391',
    pay:'full', status:'posted',
    lines:[{ sku:'SRV-031000', qty:1, price:40000.00, tax:'S', acc: '5090', cc:'CC-04', prj:'PRJ-012' }] },
  { no:'BL-000311', s:sup(0), date:'2026-07-24', due:'2026-08-23', ref:'RSF-2026-4102',
    pay:30000.00, status:'posted', store:'WH-01',
    lines:[{ sku:'PRD-244992', qty:19.6, price:2799.00, tax:'S', acc: '1400' }] },
  { no:'BL-000310', s:sup(6), date:'2026-07-19', due:'2026-07-19', ref:'',
    pay:'full', status:'posted',
    lines:[{ sku:'SRV-024000', qty:1, price:8000.00, tax:'S', acc: '5110', cc:'CC-03', prj:'PRJ-013' }] },
  { no:'BL-000309', s:sup(2), date:'2026-08-14', due:null, ref:'',
    pay:'none', status:'draft', store:'WH-01',
    lines:[{ sku:'PRD-244995', qty:310, price:34.85, tax:'S', acc: '1400' }] },
  { no:'BL-000308', s:sup(1), date:'2026-08-16', due:null, ref:'',
    pay:'none', status:'draft', store:'WH-01', po:'PO-000141',
    lines:[{ sku:'PRD-244991', qty:1200, price:17.25, tax:'S', acc: '1400' }] },
  { no:'BL-000307', s:sup(3), date:'2026-07-11', due:'2026-08-10', ref:'',
    pay:'none', status:'cancelled',
    lines:[{ sku:'PRD-244993', qty:464, price:11.20, tax:'S', acc: '1400' }] },
]

/* ---------- أوامر الشراء ---------- */
/* status : draft | approved | sent | closed | cancelled
   الاستلام والفوترة بُعدين منفصلين، متحسبين من البنود مش من الحالة.
   got   = المستلم من البند · billed = المفوتر منه */
export const purchaseOrders = [
  { no:'PO-000145', s:sup(0), date:'2026-08-15', expect:'2026-09-15', status:'sent', store:'WH-01',
    note:'حديد مشروع العليا — المرحلة الثانية',
    lines:[{ sku:'PRD-244992', qty:60, price:2795.00, tax:'S', acc: '1400', got:0,  billed:0 }] },
  { no:'PO-000144', s:sup(2), date:'2026-08-14', expect:'2026-09-04', status:'sent', store:'WH-03',
    note:'',
    lines:[{ sku:'PRD-244995', qty:400, price:34.75, tax:'S', acc: '1400', got:180, billed:0 }] },
  { no:'PO-000143', s:sup(4), date:'2026-08-17', expect:'2026-08-28', status:'sent', store:'WH-02',
    note:'خرسانة موقع جدة',
    lines:[{ sku:'PRD-244994', qty:140, price:130.55, tax:'S', acc: '1400', got:140, billed:0 }] },
  { no:'PO-000142', s:sup(0), date:'2026-08-10', expect:'2026-08-18', status:'sent', store:'WH-01',
    note:'',
    lines:[{ sku:'PRD-244992', qty:44, price:2795.00, tax:'S', acc: '1400', got:44, billed:44 }] },
  { no:'PO-000141', s:sup(1), date:'2026-08-06', expect:'2026-08-12', status:'sent', store:'WH-01',
    note:'أسمنت — دفعتين',
    lines:[{ sku:'PRD-244991', qty:2800, price:17.25, tax:'S', acc: '1400', got:1600, billed:1200 }] },
  { no:'PO-000140', s:sup(3), date:'2026-08-02', expect:'2026-08-20', status:'approved', store:'WH-01',
    note:'',
    lines:[{ sku:'PRD-244993', qty:3000, price:11.20, tax:'S', acc: '1400', got:0, billed:0 }] },
  { no:'PO-000139', s:sup(7), date:'2026-07-28', expect:'2026-08-01', status:'closed',
    note:'تجديد رخص سنوي',
    lines:[{ sku:'SRV-031000', qty:1, price:40000.00, tax:'S', acc: '5090', got:1, billed:1 }] },
  { no:'PO-000138', s:sup(5), date:'2026-08-15', expect:'2026-09-20', status:'draft',
    note:'',
    lines:[{ sku:'SRV-024000', qty:1, price:22000.00, tax:'S', acc: '5110', got:0, billed:0 }] },
  { no:'PO-000137', s:sup(2), date:'2026-07-15', expect:'2026-07-30', status:'cancelled',
    note:'اتلغى — المورد ما قدرش يوفّر',
    lines:[{ sku:'PRD-244995', qty:500, price:36.00, tax:'S', acc: '1400', got:0, billed:0 }] },
]

/* ---------- دفعات الموردين ---------- */
/* كل دفعة مربوطة بفاتورة، والمرجع اللي جاي منه المبلغ */
export const supplierPayments = [
  { no:'PV-000221', s:'SUP-2038', bill:'BL-000317', date:'2026-08-17', amount:31740.00, acc:'1020', ref:'حوالة الراجحي 88214' },
  { no:'PV-000220', s:'SUP-2029', bill:'BL-000316', date:'2026-08-16', amount:12000.00, acc:'1020', ref:'دفعة أولى' },
  { no:'PV-000219', s:'SUP-2018', bill:'BL-000314', date:'2026-08-09', amount:20700.00, acc:'1020', ref:'' },
  { no:'PV-000218', s:'SUP-2006', bill:'BL-000312', date:'2026-07-31', amount:46000.00, acc:'1020', ref:'تجديد سنوي' },
  { no:'PV-000217', s:'SUP-2041', bill:'BL-000311', date:'2026-07-28', amount:30000.00, acc:'1020', ref:'دفعة على الحساب' },
  { no:'PV-000216', s:'SUP-2011', bill:'BL-000310', date:'2026-07-19', amount: 9200.00, acc:'1010', ref:'نقدًا' },
]

/* ---------- البيانات الجمركية ---------- */
/* status : draft | posted. base والضريبة بيتحسبوا مش متخزّنين */
export const customs = [
  { no:'CD-000014', decl:'20260812-4471', date:'2026-08-12', port:'ميناء جدة الإسلامي',
    s:'SUP-2024', cif: 11400.00, duty: 570.00, rate:0.15, sadad:'SD-889231144',
    bills:['BL-000313'], status:'posted' },
  { no:'CD-000013', decl:'20260729-3318', date:'2026-07-29', port:'ميناء الملك عبدالعزيز — الدمام',
    s:'SUP-2033', cif:  6700.00, duty: 335.00, rate:0.15, sadad:'SD-889227790',
    bills:['BL-000315'], status:'posted' },
  { no:'CD-000012', decl:'', date:'2026-08-16', port:'مطار الملك خالد الدولي',
    s:'SUP-2029', cif:  9800.00, duty:0, rate:0.15, sadad:'',
    bills:[], status:'draft' },
]
export const customsBase = (d) => +(d.cif + d.duty).toFixed(2)
export const customsVat  = (d) => +(customsBase(d) * d.rate).toFixed(2)

/* ---------- المصروفات ---------- */
/* status : draft | posted. المبلغ شامل الضريبة — زي سيستم العميل. */
export const expenses = [
  { no:'EXP-000412', date:'2026-08-16', desc:'إيجار المكتب — أغسطس',        gross:34500.00, tax:'S',  acc:'5050', cash:'1020', cc:'CC-01', ref:'عقد إيجار ٢٠٢٦', status:'posted' },
  { no:'EXP-000411', date:'2026-08-15', desc:'فاتورة الكهرباء — الفرع الرئيسي', gross: 4382.50, tax:'S',  acc:'5060', cash:'1020', cc:'CC-01', ref:'SEC-8841722', status:'posted' },
  { no:'EXP-000410', date:'2026-08-13', desc:'حملة إعلانية — منصات التواصل', gross:18400.00, tax:'S',  acc:'5070', cash:'1020', cc:'CC-02', prj:'PRJ-014', ref:'', status:'posted' },
  { no:'EXP-000409', date:'2026-08-16', desc:'رسوم تجديد السجل التجاري',     gross: 1200.00, tax:'O',  acc:'5080', cash:'1010', cc:'CC-01', ref:'وزارة التجارة', status:'posted' },
  { no:'EXP-000408', date:'2026-08-15', desc:'اشتراك أدوات التصميم — سنوي',  gross: 9660.00, tax:'S',  acc:'5090', cash:'1020', cc:'CC-04', ref:'', status:'posted' },
  { no:'EXP-000407', date:'2026-08-12', desc:'صيانة مكيفات المستودع',        gross: 2760.00, tax:'S',  acc:'5100', cash:'1010', cc:'CC-03', prj:'PRJ-012', ref:'', status:'posted' },
  { no:'EXP-000406', date:'2026-08-09', desc:'رسوم تحويلات بنكية — يوليو',   gross:  345.00, tax:'Z',  acc:'5120', cash:'1020', cc:'CC-01', ref:'', status:'posted' },
  { no:'EXP-000405', date:'2026-08-06', desc:'عمولة مدى — يوليو',            gross: 1890.75, tax:'S',  acc:'5130', cash:'1040', cc:'CC-02', ref:'', status:'posted' },
  { no:'EXP-000404', date:'2026-08-16', desc:'شحن عيّنات لعميل الدمام',      gross:  920.00, tax:'S',  acc:'5140', cash:'1010', ref:'', status:'draft'  },
  { no:'EXP-000403', date:'2026-08-17', desc:'',                             gross:    0.00, tax:'S',  acc:'5020', cash:'1020', ref:'', status:'draft'  },
]

/* ---------- حساب مشتق: مفيش رقم مخزّن ---------- */

/* صافي وضريبة السطر */
export const lineNet = (l) => +(l.qty * l.price).toFixed(2)
export const lineVat = (l) => +(lineNet(l) * (taxOf(l.tax)?.rate || 0)).toFixed(2)

export const docNet   = (d) => +(d.lines || []).reduce((a, l) => a + lineNet(l), 0).toFixed(2)
export const docVat   = (d) => +(d.lines || []).reduce((a, l) => a + lineVat(l), 0).toFixed(2)
export const docTotal = (d) => +(docNet(d) + docVat(d)).toFixed(2)

/* المصروف مبلغه شامل الضريبة — بنفكّه للعكس */
export const expNet = (e) => {
  const r = taxOf(e.tax)?.rate || 0
  return +(e.gross / (1 + r)).toFixed(2)
}
export const expVat = (e) => +(e.gross - expNet(e)).toFixed(2)

/* حالة سداد الفاتورة — متحسبة، مش مخزّنة. المتأخر بُعد تاني. */
export const billDue  = (b) => +(b.total - (b.paid || 0)).toFixed(2)
export const billPay  = (b) => {
  if (b.status !== 'posted') return null
  if (billDue(b) <= 0.009) return 'paid'
  return (b.paid || 0) > 0 ? 'partial' : 'unpaid'
}
export const isLate = (b, today = TODAY) =>
  b.status === 'posted' && billDue(b) > 0.009 && !!b.due && b.due < today

/* ★ يوم واحد بس في السيستم كله. كان فيه اتنين — `format.js`
   بيقول ١٧ أغسطس و`mock.js` بيقول ٢٩، فالمتأخر كان بيتحسب
   بتاريخين مختلفين على نفس الشاشة. */
export const TODAY = FMT_TODAY.toISOString().slice(0, 10)

/* رصيد المورد = فواتيره المرحّلة − دفعاته + رصيد افتتاحي */
export function supplierBalance(id) {
  const s = supplierOf(id)
  let b = s?.open || 0
  bills.forEach((x) => {
    if (x.s.id !== id || x.status !== 'posted') return
    b += x.total - (x.paid || 0)
  })
  /* الإشعارات المرحّلة بتغيّر الرصيد زي الفاتورة بالظبط */
  supplierNotes.forEach((n) => {
    if (n.s !== id || n.status !== 'posted') return
    b += supNoteSign(n) * docTotal(n)
  })
  /* ★ سند الصرف المستقل (سلفة أو دفعة تحت الحساب) بيقلّل المستحق
     للمورد زي السداد على فاتورة. */
  paymentVouchers.forEach((p) => {
    if (p.status !== 'posted' || p.to !== '2000' || p.party?.id !== id) return
    b -= p.amount
  })
  return +b.toFixed(2)
}

/* كشف حساب المورد — الفاتورة دائن والدفعة مدين (الاتجاه الصح لحساب ذمم دائنة) */
export function supplierLedger(id, from, to) {
  const rows = []
  bills.forEach((b) => {
    if (b.s.id !== id || b.status !== 'posted') return
    rows.push({ date:b.date, kind:'فاتورة شراء', ref:b.no, cr:b.total, dr:0, go:`/purchases/bills/${b.no}` })
  })
  supplierPayments.forEach((p) => {
    if (p.s !== id) return
    rows.push({ date:p.date, kind:'دفعة', ref:p.ref || p.no, cr:0, dr:p.amount, go:`/purchases/bills/${p.bill}` })
  })
  paymentVouchers.forEach((p) => {
    if (p.status !== 'posted' || p.to !== '2000' || p.party?.id !== id) return
    rows.push({ date:p.date, kind:'سند صرف', ref:p.no, cr:0, dr:p.amount,
      go:`/cash/payments/${p.no}` })
  })
  rows.sort((a, b) => a.date.localeCompare(b.date))
  const inRange = (d) => (!from || d >= from) && (!to || d <= to)
  let open = supplierOf(id)?.open || 0
  const out = []
  rows.forEach((r) => {
    if (!inRange(r.date)) { open += r.cr - r.dr; return }
    out.push(r)
  })
  let run = open
  out.forEach((r) => { run += r.cr - r.dr; r.bal = +run.toFixed(2) })
  return { open:+open.toFixed(2), rows:out, close:+run.toFixed(2) }
}

/* أمر الشراء — نسب الاستلام والفوترة، بُعدين مستقلين */
export const poQty    = (p) => (p.lines || []).reduce((a, l) => a + l.qty, 0)
export const poGot    = (p) => (p.lines || []).reduce((a, l) => a + (l.got || 0), 0)
export const poBilled = (p) => (p.lines || []).reduce((a, l) => a + (l.billed || 0), 0)
export const poRecvPct = (p) => (poQty(p) ? poGot(p) / poQty(p) : 0)
export const poBillPct = (p) => (poQty(p) ? poBilled(p) / poQty(p) : 0)
/* الالتزام المفتوح = قيمة اللي لسه ما اتفوترش */
/* الالتزام شامل الضريبة — عشان يبقى قابل للمقارنة بالمستحق على الفواتير */
export const poOpenValue = (p) => +(p.lines || []).reduce((a, l) => {
  const net = (l.qty - (l.billed || 0)) * l.price
  return a + net * (1 + (taxOf(l.tax)?.rate || 0))
}, 0).toFixed(2)
export const poLive = (p) => p.status !== 'draft' && p.status !== 'cancelled' && p.status !== 'closed'

/* ★ الإجمالي والمدفوع **مش مكتوبين** على الفاتورة — بيتحسبوا من البنود.
   `pay` بتقول القصة بس: 'none' ولا 'full' ولا مبلغ. كده مستحيل
   الفاتورة تقول رقم والبنود تقول رقم تاني. */
bills.forEach((b) => {
  b.total = docTotal(b)
  b.paid  = b.pay === 'full' ? b.total : b.pay === 'none' ? 0 : b.pay
})

/* فواتير مورد معيّن */
export const billsOf = (id) => bills.filter((b) => b.s.id === id)
export const supPaymentsOf = (id) => supplierPayments.filter((p) => p.s === id)
export const poOf = (id) => purchaseOrders.filter((p) => p.s.id === id)
export const lastBuy = (id) => billsOf(id).filter((b) => b.status === 'posted')
  .sort((a, b) => b.date.localeCompare(a.date))[0] || null


/* ============================================================
   العميل — دوال مشتقّة لشاشة تفاصيله

   نفس مبدأ المورد: **الرصيد مش رقم مخزّن**. الحقل `balance` اللي
   على العميل بقى الرصيد الافتتاحي بس، والرصيد الحقيقي بيتحسب من
   الفواتير والإشعارات والتحصيلات — فمستحيل يختلف عن شاشة الفواتير.
   ============================================================ */
const LIVE_INV = ['issued', 'partial', 'paid', 'overdue']

export const findCustomer = (id) => customers.find((c) => c.id === id)

export const invoicesOf = (id) => invoices.filter((v) => v.c?.id === id)
export const quotesOf   = (id) => quotations.filter((q) => q.c?.id === id)
export const cnOf       = (id) => creditNotes.filter((n) => n.c?.id === id)
export const dnOf       = (id) => debitNotes.filter((n) => n.c?.id === id)

/* كل دفعات العميل — من كل فواتيره */
export function custPayments(id) {
  const out = []
  invoicesOf(id).forEach((v) => {
    if (!LIVE_INV.includes(v.status)) return
    paymentsOf(v).forEach((p) => out.push({ ...p, no: v.no, go: `/sales/invoices/${v.no}` }))
  })
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/* الرصيد على العميل = فواتير + إشعارات مدينة − دائنة − تحصيل */
export function customerBalance(id) {
  let b = 0
  invoicesOf(id).forEach((v) => {
    if (!LIVE_INV.includes(v.status)) return
    b += v.total - (v.paid || 0)
  })
  dnOf(id).forEach((n) => { if (n.status === 'issued') b += n.total })
  cnOf(id).forEach((n) => { if (n.status === 'issued') b -= n.total })
  /* ★ سند القبض المستقل (دفعة مقدّمة) بيقلّل ذمة العميل زي التحصيل
     بالظبط. من غير السطر ده رصيد العميل كان هيخالف حساب ١٢٠٠. */
  receiptVouchers.forEach((r) => {
    if (r.status !== 'posted' || r.to !== '1200' || r.party?.id !== id) return
    b -= r.amount
  })
  return +b.toFixed(2)
}

/* كشف حساب العميل — الفاتورة مدين والتحصيل دائن (ذمم مدينة) */
export function customerLedger(id, from, to) {
  const rows = []
  invoicesOf(id).forEach((v) => {
    if (!LIVE_INV.includes(v.status)) return
    rows.push({ date: v.date, kind: 'فاتورة مبيعات', ref: v.no,
      dr: v.total, cr: 0, go: `/sales/invoices/${v.no}` })
    paymentsOf(v).forEach((p) => rows.push({ date: p.date, kind: 'تحصيل',
      ref: p.ref || v.no, dr: 0, cr: p.amount, go: `/sales/invoices/${v.no}` }))
  })
  dnOf(id).forEach((n) => { if (n.status === 'issued')
    rows.push({ date: n.date, kind: 'إشعار مدين', ref: n.no, dr: n.total, cr: 0,
      go: '/sales/debit-notes' }) })
  cnOf(id).forEach((n) => { if (n.status === 'issued')
    rows.push({ date: n.date, kind: 'إشعار دائن', ref: n.no, dr: 0, cr: n.total,
      go: '/sales/credit-notes' }) })
  receiptVouchers.forEach((r) => {
    if (r.status !== 'posted' || r.to !== '1200' || r.party?.id !== id) return
    rows.push({ date: r.date, kind: 'سند قبض', ref: r.no, dr: 0, cr: r.amount,
      go: `/cash/receipts/${r.no}` })
  })

  rows.sort((a, b) => a.date.localeCompare(b.date))
  const inR = (d) => (!from || d >= from) && (!to || d <= to)
  let open = 0
  const out = []
  rows.forEach((r) => { if (!inR(r.date)) { open += r.dr - r.cr } else out.push(r) })
  let run = open
  out.forEach((r) => { run += r.dr - r.cr; r.bal = +run.toFixed(2) })
  return { open: +open.toFixed(2), rows: out, close: +run.toFixed(2),
    totDr: +out.reduce((s, x) => s + x.dr, 0).toFixed(2),
    totCr: +out.reduce((s, x) => s + x.cr, 0).toFixed(2) }
}

/* أعمار الديون — المستحق موزّع على شرائح التأخير */
export function agingOf(id, today = TODAY) {
  const buckets = [
    { id: 'cur',  ar: 'في موعدها',   min: -1e9, max: 0,   docs: [], amount: 0 },
    { id: 'b30',  ar: '١–٣٠ يوم',    min: 1,  max: 30,    docs: [], amount: 0 },
    { id: 'b60',  ar: '٣١–٦٠ يوم',   min: 31, max: 60,    docs: [], amount: 0 },
    { id: 'b90',  ar: '٦١–٩٠ يوم',   min: 61, max: 90,    docs: [], amount: 0 },
    { id: 'b90p', ar: 'أكتر من ٩٠',  min: 91, max: 1e9,   docs: [], amount: 0 },
  ]
  invoicesOf(id).forEach((v) => {
    if (!LIVE_INV.includes(v.status)) return
    const due = +(v.total - (v.paid || 0)).toFixed(2)
    if (due <= 0.009) return
    const late = v.due ? Math.floor((new Date(today) - new Date(v.due)) / 86400000) : 0
    const b = buckets.find((x) => late >= x.min && late <= x.max) || buckets[0]
    b.amount = +(b.amount + due).toFixed(2)
    b.docs.push({ ...v, due$: due, late })
  })
  return buckets
}

/* آخر بيع للعميل — بيظهر في محرّر البنود */
export const lastSale = (id) => invoicesOf(id)
  .filter((v) => LIVE_INV.includes(v.status))
  .sort((a, b) => b.date.localeCompare(a.date))[0] || null

/* آخر سعر اتباع بيه صنف معيّن لنفس العميل — «آخر بيع لهذا العميل» */
export function lastPriceFor(custId, code) {
  const vs = invoicesOf(custId).filter((v) => LIVE_INV.includes(v.status))
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const v of vs) {
    const l = linesOf(v).find((x) => x.code === code)
    if (l) return { price: l.price ?? +(l.total / l.qty).toFixed(2), date: v.date, no: v.no }
  }
  return null
}


/* ---------- إشعارات المورد — مستندات كاملة ----------
   كانت أمر بيفتح تأكيد بس. الإشعار الدائن من المورد بيقلّل اللي
   عليك (مرتجع أو خصم)، والمدين بيزوّده (فرق سعر أو رسوم). */
export const supplierNotes = [
  { no:'SCN-000042', s:'SUP-2041', src:'BL-000311', date:'2026-08-02', kind:'credit',
    reason:'مرتجع حديد تالف', qty:2, status:'posted',
    lines:[{ sku:'PRD-244992', qty:2, price:2799.00, tax:'S', acc:'1400' }] },
  { no:'SCN-000041', s:'SUP-2038', src:'BL-000317', date:'2026-08-14', kind:'credit',
    reason:'خصم كمية بعد الفاتورة', status:'posted',
    lines:[{ sku:'PRD-244991', qty:60, price:17.25, tax:'S', acc:'1400' }] },
  { no:'SDN-000018', s:'SUP-2029', src:'BL-000316', date:'2026-08-15', kind:'debit',
    reason:'رسوم شحن ما كانتش في الفاتورة', status:'posted',
    lines:[{ sku:'SRV-024000', qty:1, price:900.00, tax:'S', acc:'5140' }] },
  { no:'SCN-000040', s:'SUP-2033', src:'BL-000315', date:'2026-08-16', kind:'credit',
    reason:'نقص في الكمية المستلمة', status:'draft',
    lines:[{ sku:'PRD-244995', qty:12, price:34.75, tax:'S', acc:'1400' }] },
]
export const supNotesOf = (id) => supplierNotes.filter((n) => n.s === id)
export const notesOfBill = (no) => supplierNotes.filter((n) => n.src === no)
export const supNoteSign = (n) => (n.kind === 'credit' ? -1 : 1)

/* ============================================================
   النقد والبنوك
   ============================================================ */

/* ---------- الحسابات النقدية والبنكية ----------
   الحساب موجود أصلًا في شجرة الحسابات (`kind:'cash'`). اللي زايد
   هنا هو **بيانات البنك**: النوع والعملة والآيبان.

   ★ الرصيد **مش هنا**. الرصيد بيتحسب من دفتر اليومية زي أي رصيد
   تاني في السيستم. لو خزّناه هنا كان ممكن يخالف الميزانية. */
export const cashAccounts = [
  { acc:'1010', kind:'cash',    ar:'الصندوق الرئيسي',            cur:'SAR',
    place:'الفرع الرئيسي — العليا', keeper:'مها العتيبي' },
  { acc:'1020', kind:'bank',    ar:'الحساب البنكي الرئيسي',      cur:'SAR',
    bank:'BK-01', iban:'SA03 8000 0000 6080 1016 7519', main:true },
  { acc:'1030', kind:'pos',     ar:'شبكة — نقاط البيع',          cur:'SAR',
    bank:'BK-02', settleDays:1 },
  { acc:'1040', kind:'gateway', ar:'مقاصة المدفوعات الإلكترونية', cur:'SAR',
    provider:'مدى · Apple Pay', settleDays:2 },
]
export const cashAccountOf = (acc) => cashAccounts.find((a) => a.acc === acc)
export const CASH_KIND_AR = { cash:'خزنة', bank:'حساب بنكي', pos:'نقاط بيع', gateway:'بوابة دفع' }

/* ---------- التحويل بين الحسابات ----------
   `status`: draft | posted. الرسوم مصروف بنكي، مش جزء من المحوّل. */
export const cashTransfers = [
  { no:'TRF-000112', date:'2026-08-16', from:'1030', to:'1020', amount: 18400.00,
    fee: 55.00, ref:'تسوية شبكة يومية', status:'posted' },
  { no:'TRF-000111', date:'2026-08-13', from:'1040', to:'1020', amount:  4200.00,
    fee: 42.00, ref:'تحويل مقاصة مدى', status:'posted' },
  { no:'TRF-000110', date:'2026-08-06', from:'1020', to:'1010', amount: 15000.00,
    fee: 0, ref:'تغذية الخزنة', status:'posted' },
  { no:'TRF-000109', date:'2026-08-17', from:'1020', to:'1010', amount:  6000.00,
    fee: 0, ref:'مصروف نثري للفرع', status:'draft' },
]

/* ---------- سندات القبض المستقلة ----------
   ★ **مش كل قبض له فاتورة.** دي اللي مالهاش مستند: دفعة مقدّمة من
   عميل قبل ما الفاتورة تتعمل، أو تحصيل إيراد آخر.
   القبض اللي على فاتورة **مش هنا** — هو مقيّد أصلًا مع الفاتورة،
   وتكراره هنا كان هيقيّده مرتين في الدفتر. القايمة بتعرض الاتنين
   مع بعض بس القيد بيتكتب مرة واحدة. */
export const receiptVouchers = [
  { no:'RV-000318', date:'2026-08-15', party:{ k:'customer', id:'C-1038' },
    acc:'1020', to:'1200', amount: 25000.00, way:'تحويل بنكي',
    ref:'حوالة الأهلي 55120', memo:'دفعة مقدّمة على مشروع الواجهة', status:'posted' },
  { no:'RV-000317', date:'2026-08-11', party:{ k:'other', ar:'شركة الوسيط للتأمين' },
    acc:'1020', to:'4201', amount:  4300.00, way:'تحويل بنكي',
    ref:'تعويض مطالبة', memo:'تعويض تأميني عن تلف بضاعة', status:'posted' },
  { no:'RV-000316', date:'2026-08-17', party:{ k:'customer', id:'C-1033' },
    acc:'1010', to:'1200', amount:  3200.00, way:'نقدًا',
    ref:'', memo:'دفعة على الحساب', status:'draft' },
]

/* ---------- سندات الصرف المستقلة ----------
   نفس القاعدة: `supplierPayments` مربوطة بفواتير ومقيّدة معاها.
   دي المدفوعات اللي **برّا الفواتير** — سلفة لمورد، أو مصروف
   مباشر من الخزنة. */
export const paymentVouchers = [
  { no:'PV-000232', date:'2026-08-14', party:{ k:'supplier', id:'SUP-2024' },
    acc:'1020', to:'2000', amount: 12000.00, way:'تحويل بنكي',
    ref:'دفعة تحت الحساب', memo:'سلفة على توريدات سبتمبر', status:'posted' },
  { no:'PV-000231', date:'2026-08-12', party:{ k:'other', ar:'أمانة منطقة الرياض' },
    acc:'1010', to:'5080', amount:  1850.00, way:'نقدًا',
    ref:'رسوم لوحة', memo:'تجديد لوحة المحل', status:'posted' },
  { no:'PV-000230', date:'2026-08-17', party:{ k:'other', ar:'مكتب المحاسب القانوني' },
    acc:'1020', to:'5110', amount:  7500.00, way:'شيك',
    ref:'شيك 004412', memo:'أتعاب مراجعة الربع', status:'draft' },
]

/* اسم الطرف مهما كان نوعه — العميل والمورد ليهم ملفات، وغيرهم نص */
export function partyAr(p) {
  if (!p) return '—'
  if (p.k === 'customer') return customers.find((c) => c.id === p.id)?.ar || p.id
  if (p.k === 'supplier') return supplierOf(p.id)?.ar || p.id
  return p.ar || '—'
}
export function partyGo(p) {
  if (p?.k === 'customer') return `/sales/customers/${p.id}`
  if (p?.k === 'supplier') return `/purchases/suppliers/${p.id}`
  return null
}

/* ---------- القايمة الموحّدة ----------
   ★ ده قرار التصميم الأساسي في الموديول.

   عند العميل «تسجيل دفعة» على الفاتورة حاجة، و«سندات الصرف» شاشة
   تانية في موديول تاني — والمستخدم لازم يعرف الفرق قبل ما يبدأ.
   وكشف حساب المورد بيعرض الاتنين مع بعض، فالتفرقة دي مش موجودة
   في النتيجة أصلًا.

   عندنا: **قايمة واحدة**، وكل سطر بيقول جاي منين (`src`). القبض
   اللي على فاتورة بيتعرض هنا كسند، بس **قيده اتكتب مع الفاتورة** —
   عشان كده `posted:false` على السطر ده في الجورنال. */
export function receipts() {
  const out = []
  invoices.forEach((v) => {
    if (['draft', 'cancelled'].includes(v.status)) return
    paymentsOf(v).forEach((p, i) => out.push({
      no: `RV-${100000 + (seedOf(v.no) % 899000) + i}`,
      date: p.date, party: { k: 'customer', id: v.c?.id }, acc: p.acc || '1020', to: '1200',
      amount: p.amount, way: p.way, ref: p.ref, memo: `تحصيل على ${v.no}`,
      status: 'posted', src: v.no, srcGo: `/sales/invoices/${v.no}`,
    }))
  })
  receiptVouchers.forEach((r) => out.push({ ...r, src: null }))
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

export function payments() {
  const out = []
  supplierPayments.forEach((p) => {
    const b = bills.find((x) => x.no === p.bill)
    if (!b || b.status !== 'posted') return
    out.push({
      no: p.no, date: p.date, party: { k: 'supplier', id: p.s }, acc: p.acc, to: '2000',
      amount: p.amount, way: p.acc === '1010' ? 'نقدًا' : 'تحويل بنكي', ref: p.ref,
      memo: `سداد على ${p.bill}`, status: 'posted', src: p.bill,
      srcGo: `/purchases/bills/${p.bill}`,
    })
  })
  paymentVouchers.forEach((p) => out.push({ ...p, src: null }))
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

export const findReceipt  = (no) => receipts().find((r) => r.no === no)
export const findPayment  = (no) => payments().find((r) => r.no === no)
export const findTransfer = (no) => cashTransfers.find((t) => t.no === no)

/* الرسوم بتروح على «رسوم بنكية»، والمحوّل بيدخل بالكامل */
export const transferOut = (t) => +(t.amount + (t.fee || 0)).toFixed(2)


/* ============================================================
   المحاسبة
   ============================================================ */

/* ---------- مراكز التكلفة ----------
   موجودة في سيستم العميل كشاشة، بس **مش موصولة بأي تقرير** —
   تقدر تعمل مركز تكلفة ومفيش مكان بيقول صرف عليه كام.
   هنا المركز بيتحط على المستند، والتقرير بيتحسب من القيود. */
export const costCenters = [
  { id:'CC-01', ar:'الإدارة العامة',   code:'ADM', note:'مصروفات إدارية مش مربوطة بمشروع' },
  { id:'CC-02', ar:'المبيعات والتسويق', code:'SLS', note:'حملات وعمولات ومصاريف بيع' },
  { id:'CC-03', ar:'التشغيل والمستودع', code:'OPS', note:'مستودعات وصيانة وشحن' },
  { id:'CC-04', ar:'تقنية المعلومات',   code:'IT',  note:'اشتراكات وبرمجيات وأجهزة' },
]
export const ccOf = (id) => costCenters.find((c) => c.id === id)

/* ---------- قيود اليومية اليدوية ----------
   ★ أغلب القيود في السيستم **بتتولّد من المستندات** — الفاتورة
   بتكتب قيدها والمصروف بيكتب قيده. القيد اليدوي هو الاستثناء:
   تسويات آخر الشهر اللي مالهاش مستند.

   وقاعدة من البورد: **رقم القيد هو المسلسل الوحيد في السيستم**
   (باقي المستندات أرقامها عشوائية لكل منشأة). عشان كده أرقام
   القيود هنا متتابعة من غير فجوات.

   `status`: draft | posted. المُرحَّل **مينفعش يتعدّل** — التصحيح
   بقيد عكسي، وده مكتوب في البورد بالحرف. */
export const journalEntries = [
  { no:'JE-000031', date:'2026-08-16', memo:'إثبات إيجار المستودع المستحق عن أغسطس',
    ref:'تسوية شهرية', status:'posted', lines:[
      { acc:'5050', dr:12000, cr:0, cc:'CC-03', note:'إيجار مستودع الخرج' },
      { acc:'2200', dr:0, cr:12000, note:'مستحق يُدفع أول سبتمبر' },
    ] },
  { no:'JE-000030', date:'2026-08-15', memo:'تسوية عجز الصندوق بعد الجرد',
    ref:'محضر جرد ١٥ أغسطس', status:'posted', lines:[
      { acc:'5150', dr:320, cr:0, cc:'CC-01' },
      { acc:'1010', dr:0, cr:320, note:'الفرق بين الجرد الفعلي والدفتري' },
    ] },
  { no:'JE-000029', date:'2026-08-17', memo:'إثبات رواتب أغسطس قبل الصرف',
    ref:'مسير الرواتب', status:'draft', lines:[
      { acc:'5030', dr:86500, cr:0, cc:'CC-01' },
      { acc:'2200', dr:0, cr:86500 },
    ] },
]
export const findEntry = (no) => journalEntries.find((j) => j.no === no)
export const entryDr = (j) => +(j.lines || []).reduce((a, l) => a + (l.dr || 0), 0).toFixed(2)
export const entryCr = (j) => +(j.lines || []).reduce((a, l) => a + (l.cr || 0), 0).toFixed(2)
export const entryBalanced = (j) => Math.abs(entryDr(j) - entryCr(j)) < 0.01


/* ============================================================
   المشاريع
   ============================================================ */

/* ★ المشروع **بُعد تالت** غير الفرع ومركز التكلفة، والتلاتة
   بيتحطوا على نفس المستند. الفرق بينهم:
   • **الفرع** — مكان الحركة (وبيروح للهيئة في الفاتورة)
   • **مركز التكلفة** — الوحدة اللي صرفت (إدارة · تسويق · تشغيل)
   • **المشروع** — الشغلانة اللي ليها بداية ونهاية وميزانية

   ومن غير التلاتة مع بعض ما تعرفش «المشروع ده كسب ولا خسر».

   `status`: active | onhold | closed */
export const projects = [
  { id:'PRJ-014', ar:'برج النخيل — أعمال التشطيبات', code:'NKL-24', c:'C-1038',
    start:'2026-05-01', end:'2026-10-31', budget: 320000, manager:'سعود القحطاني',
    status:'active', note:'عقد بالمرحلة — الدفعة الثانية عند تسليم الدور الرابع' },
  { id:'PRJ-013', ar:'صيانة سنوية — مجمع الصهباء', code:'SHB-24', c:'C-1029',
    start:'2026-01-01', end:'2026-12-31', budget:  90000, manager:'ريم الدوسري',
    status:'active', note:'عقد صيانة سنوي بفواتير شهرية' },
  { id:'PRJ-012', ar:'توريد وتركيب أثاث مكتبي', code:'OFF-24', c:'C-1041',
    start:'2026-06-15', end:'2026-08-30', budget: 145000, manager:'سعود القحطاني',
    status:'active', note:'التركيب خلص، فاضل تسليم نهائي' },
  { id:'PRJ-011', ar:'تجهيز فرع الدمام', code:'DMM-23', c:null,
    start:'2025-11-01', end:'2026-03-31', budget: 210000, manager:'ريم الدوسري',
    status:'closed', note:'مشروع داخلي — مقفول بعد التسليم' },
]
export const projectOf = (id) => projects.find((p) => p.id === id)
export const PRJ_STATUS = { active:'شغّال', onhold:'موقوف', closed:'مقفول' }

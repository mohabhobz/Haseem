/* صيغ موحّدة للأرقام والتواريخ — مصدر واحد للحقيقة (إصلاح ملاحظة C3 في الأوديت) */
export const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
export const TODAY = new Date('2026-08-17')

export function fmtDate(iso) {
  if (!iso) return 'غير محدد'
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function daysFrom(iso) {
  if (!iso) return null
  return Math.round((new Date(iso) - TODAY) / 86400000)
}

export function relDate(iso) {
  const n = daysFrom(iso)
  if (n === null) return ''
  if (n === 0) return 'اليوم'
  if (n === 1) return 'غدًا'
  if (n === -1) return 'أمس'
  if (n > 0) return `خلال ${n} يوم`
  return `متأخرة ${Math.abs(n)} يوم`
}

/* خانتان عشريتان دائمًا — عشان الأعمدة تتحاذى */
/* جمع «يوم» زي ما العربي بيتقال — مش «5 يوم».
   مكانها هنا مش في كومبوننت واحد، لأن أكتر من شاشة بتستخدمها. */
export const dayAr = (n) =>
  n === 0 ? 'اليوم'
    : n === 1 ? 'يوم واحد'
    : n === 2 ? 'يومين'
    : n <= 10 ? `${n} أيام`
    : `${n} يومًا`

export function fmtMoney(v) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* قاموس الحالات — كلها مؤنثة لأنها تصف «الفاتورة» (إصلاح C1) */
export const STATUS = {
  draft:     { label: 'مسودة',            tone: 'neutral',   dot: 'hollow' },
  issued:    { label: 'صادرة',            tone: 'info',      dot: 'solid'  },
  partial:   { label: 'مدفوعة جزئيًا',    tone: 'info',      dot: 'solid'  },
  paid:      { label: 'مدفوعة',           tone: 'positive',  dot: 'solid'  },
  overdue:   { label: 'متأخرة',           tone: 'attention', dot: 'solid'  },
  void:      { label: 'ملغاة بقيد عكسي',  tone: 'neutral',   dot: 'solid'  },
  cancelled: { label: 'ملغاة',            tone: 'neutral',   dot: 'solid'  },
  sent:      { label: 'مُرسَلة',           tone: 'info',      dot: 'solid'  },
  accepted:  { label: 'مقبولة',           tone: 'positive',  dot: 'solid'  },
  rejected:  { label: 'مرفوضة',           tone: 'critical',  dot: 'solid'  },
  expired:   { label: 'منتهية الصلاحية',  tone: 'neutral',   dot: 'solid'  },
  converted: { label: 'حُوِّلت لفاتورة',   tone: 'positive',  dot: 'solid'  },
  /* الفاتورة اللي اتقيّد عليها إشعار — بُعد تاني غير السداد.
     كانت في سيستم العميل ومكانتش عندنا. */
  credited:     { label: 'مقيّدة بإشعار جزئيًا', tone: 'info',    dot: 'solid' },
  fullCredited: { label: 'مقيّدة بالكامل',      tone: 'neutral', dot: 'solid' },

  /* المشتريات — مستند داخلي، مفيش هيئة. الترحيل هو الخط اللي مالوش رجعة. */
  posted:    { label: 'مُرحَّلة',          tone: 'info',      dot: 'solid'  },
  unpaid:    { label: 'غير مدفوعة',       tone: 'neutral',   dot: 'hollow' },
  reversed:  { label: 'معكوسة بقيد',      tone: 'neutral',   dot: 'solid'  },
  /* أوامر الشراء */
  approved:  { label: 'معتمد',            tone: 'info',      dot: 'hollow' },
  closed:    { label: 'مقفول',            tone: 'neutral',   dot: 'solid'  },

  /* النقد والبنوك — السند مالوش هيئة، الترحيل هو خط اللا رجعة */
  deleted:   { label: 'متمسوحة',          tone: 'neutral',   dot: 'hollow' },
}

/* ============================================================
   المبلغ كتابةً.

   ده مش تزويق: سند القبض والصرف في السعودية بيتكتب فيه المبلغ
   بالحروف جنب الرقم، عشان الرقم ما ينفعش يتزوّد عليه خانة.
   السند اللي فيه الرقم بس سند ناقص.

   القواعد العربية اللي متطبّقة هنا:
   • المئة والألف والمليون ليهم صيغة **مثنّى** (مئتان · ألفان)
   • من ٣ لـ١٠ جمع (ثلاثة آلاف) ومن ١١ لـ٩٩ مفرد منصوب (أحد عشر ألفًا)
   • الترتيب من الأصغر للأكبر جوّه المجموعة (خمسة وعشرون)
   ============================================================ */
const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
const AR_HUND = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة',
  'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة']

/* مجموعة من تلات خانات */
function trio(n) {
  const out = []
  const h = Math.floor(n / 100), r = n % 100
  if (h) out.push(AR_HUND[h])
  if (r < 20) { if (r) out.push(AR_ONES[r]) }
  else {
    const o = r % 10, t = Math.floor(r / 10)
    if (o) out.push(AR_ONES[o])
    out.push(AR_TENS[t])
  }
  return out.join(' و')
}

/* اسم المرتبة حسب العدد — مفرد ومثنى وجمع.

   ★ التمييز بيتحدد بآخر خانتين من العدد مش بالعدد كله:
   • ٣–١٠  → جمع        (ثلاثة آلاف)
   • ١١–٩٩ → مفرد منصوب (خمسة وعشرون ألفًا)
   • مضاعفات المئة → مفرد مجرور (مئة ألف — مش «مئة ألفًا») */
function scaleWord(n, [one, two, few, many]) {
  if (n === 1) return one
  if (n === 2) return two
  const r = n % 100
  if (r === 0) return one
  if (r >= 3 && r <= 10) return few
  return many
}

const SCALES = [
  [1e9, ['مليار', 'ملياران', 'مليارات', 'مليارًا']],
  [1e6, ['مليون', 'مليونان', 'ملايين', 'مليونًا']],
  [1e3, ['ألف',   'ألفان',   'آلاف',   'ألفًا']],
]

function intToArabic(n) {
  if (n === 0) return 'صفر'
  const parts = []
  let left = n
  SCALES.forEach(([base, words]) => {
    const c = Math.floor(left / base)
    if (!c) return
    left -= c * base
    const w = scaleWord(c, words)
    /* «ألف» و«ألفان» بيتقالوا لوحدهم من غير عدد قبلهم */
    parts.push(c <= 2 ? w : `${trio(c)} ${w}`)
  })
  if (left) parts.push(trio(left))
  return parts.join(' و')
}

/* المبلغ كامل بالريال والهللة */
export function amountInWords(v, cur = 'ريال سعودي') {
  const neg = v < 0
  const n = Math.abs(+(+v).toFixed(2))
  const whole = Math.floor(n)
  const cents = Math.round((n - whole) * 100)
  let s = `${intToArabic(whole)} ${cur}`
  if (cents) s += ` و${intToArabic(cents)} هللة`
  return `${neg ? 'سالب ' : ''}فقط ${s} لا غير`
}

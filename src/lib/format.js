/* صيغ موحّدة للأرقام والتواريخ — مصدر واحد للحقيقة (إصلاح ملاحظة C3 في الأوديت) */
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
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
}

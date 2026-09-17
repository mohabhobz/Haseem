/* ============================================================
   هوية المنشأة البصرية — لون واحد وخطّين، بيتفرضوا على السيستم كله.

   الفكرة: المستخدم بيختار **لون أساسي واحد**، وإحنا بنولّد منه
   السلّم كله (اللون · الحبر فوقه · التظليل الفاتح · لون القائمة
   النشطة · ألوان الرسوم البيانية · خلفية الأيقونات) — بحساب،
   مش بقايمة ألوان مكتوبة بالإيد.

   ليه ده مهم: عشان أي لون يختاره الكلاينت — أزرق، بنفسجي، نبيتي —
   السيستم يفضل **مقروء**. الحبر فوق اللون بيتحسب بالتباين الفعلي،
   والتظليل بيتولّد من نفس درجة اللون عشان يفضل من نفس العيلة.

   التطبيق: بنكتب المتغيّرات على <html> مباشرة. كل الـCSS بتقرا من
   نفس المتغيّرات (مفيش لون مكتوب بإيده في app.css)، فالتغيير بيوصل
   لكل شاشة في نفس اللحظة — القوايم والأزرار والحالات والطباعة.

   الوضع الداكن ليه سلّم تاني من نفس اللون (أفتح وأقل تشبّعًا)،
   وبيتعاد حسابه لما المستخدم يبدّل الوضع.

   ملاحظة للباك إند: ده كله فرونت. القيم المحفوظة هنا في localStorage
   لازم تتخزّن على المنشأة في الداتابيز وتترجع مع بياناتها.
   ============================================================ */

const KEY = 'haseem-brand'

/* ---------- الخطوط ----------
   تلاتة عربي وتلاتة إنجليزي، مختلفين في الشكل مش في الاسم.
   الترتيب في الـstack مهم: اللاتيني الأول عشان الأرقام والحروف
   الإنجليزية تيجي منه، والعربي بعده بياخد الحروف العربية تلقائيًا. */
export const FONTS_AR = [
  { id: 'plexar', name: 'IBM Plex Sans Arabic', css: "'IBM Plex Sans Arabic'",
    note: 'هندسي وواضح — الأقرب لواجهات الأنظمة المحاسبية',
    sample: 'فاتورة ضريبية · مبيعات' },
  { id: 'tajawal', name: 'Tajawal', css: "'Tajawal'",
    note: 'خطوط مستقيمة وفتحات واسعة — عصري ومحايد',
    sample: 'فاتورة ضريبية · مبيعات' },
  { id: 'almarai', name: 'Almarai', css: "'Almarai'",
    note: 'أطراف مدوّرة ونبرة أدفأ — أقرب للعلامات التجارية',
    sample: 'فاتورة ضريبية · مبيعات' },
]

export const FONTS_EN = [
  { id: 'inter', name: 'Inter', css: "'Inter'",
    note: 'خط واجهات محايد — أرقامه أوضح شيء للجداول المالية',
    sample: 'Invoice 12,450.00' },
  { id: 'jakarta', name: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans'",
    note: 'هندسي وودود — حروفه أعرض وأكثر شخصية',
    sample: 'Invoice 12,450.00' },
  { id: 'plex', name: 'IBM Plex Sans', css: "'IBM Plex Sans'",
    note: 'تقني ورصين — يتناغم مع IBM Plex العربي',
    sample: 'Invoice 12,450.00' },
]

/* ---------- الألوان: ١٢ لون جاهز ---------- */
export const SWATCHES = [
  { id: 'haseem',  ar: 'أخضر حسيم',   hex: '#003E31' },
  { id: 'emerald', ar: 'زمرّدي',      hex: '#0B7A5A' },
  { id: 'teal',    ar: 'تركوازي',     hex: '#0E6E72' },
  { id: 'ocean',   ar: 'أزرق محيطي',  hex: '#14587F' },
  { id: 'royal',   ar: 'أزرق ملكي',   hex: '#26489C' },
  { id: 'indigo',  ar: 'نيلي',        hex: '#4338A8' },
  { id: 'violet',  ar: 'بنفسجي',      hex: '#6A34A0' },
  { id: 'plum',    ar: 'برقوقي',      hex: '#8A2C6B' },
  { id: 'crimson', ar: 'قرمزي',       hex: '#A32741' },
  { id: 'clay',    ar: 'طيني',        hex: '#9E4A28' },
  { id: 'sand',    ar: 'رملي داكن',   hex: '#8A6516' },
  { id: 'graphite',ar: 'فحمي',        hex: '#31404C' },
]

export const DEFAULT_BRAND = {
  color: '#003E31',
  fontAr: 'plexar',
  fontEn: 'inter',
  logo: '/tenant-logo.svg',
  /* خلفية صفحة الدخول. `null` = الخلفية المولّدة من لون المنشأة.
     لو المستخدم رفع صورة بتتحفظ هنا كـdata URL (مصغّرة). */
  authBg: null,
}

/* ============================================================
   حساب الألوان
   ============================================================ */
const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export function hexToHsl(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  let s = 0, hu = 0
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) hu = ((g - b) / d + (g < b ? 6 : 0))
    else if (mx === g) hu = (b - r) / d + 2
    else hu = (r - g) / d + 4
    hu *= 60
  }
  return { h: hu, s: s * 100, l: l * 100 }
}

export function hslToHex(h, s, l) {
  s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`
}

/* اللمعان النسبي — نفس معادلة WCAG، مش تقدير بالعين */
function lum(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrast(a, b) {
  const la = lum(a), lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/* الحبر فوق اللون: أبيض ولا أسود؟ بالحساب مش بالذوق */
const inkOn = (hex) => (contrast(hex, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#17191C')

/* الهالة والظلال محتاجة اللون بشفافية، والـCSS مش بتعرف تعمل كده
   من متغيّر هيكس — فبنطلّع الـrgba جاهزة من هنا. */
function rgba(hex, a) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

/* الرمادي الفاتح اللي بيقلب مع الوضع الداكن — نفس قيمة --k-50.
   لازم يتكتب هنا عشان مجموعة المفاتيح في الوضعين تفضل واحدة:
   لو مفتاح اتكتب في وضع وما اتكتبش في التاني، بيفضل عالق بقيمته
   القديمة لما المستخدم يبدّل الوضع. */
const NEUTRAL_LIGHT = '#F3F4F5'

/* ============================================================
   السلّم الكامل من لون واحد
   ============================================================ */
export function ramp(hex, dark = false) {
  const { h, s } = hexToHsl(hex)
  const S = clamp(s, 18, 92)

  if (!dark) {
    /* اللون بيتساب زي ما المستخدم اختاره **بالظبط** طول ما النص
       الأبيض فوقه مقروء. لو مش مقروء، بنغمّقه درجة درجة لحد ما
       يعدّي حد التباين — بدل ما نطلّع زرار محدش يقدر يقراه. */
    let L = hexToHsl(hex).l
    let base = hex
    while (contrast(base, '#FFFFFF') < 4.5 && L > 12) { L -= 3; base = hslToHex(h, S, L) }
    const ink = inkOn(base)
    const bl = hexToHsl(base).l
    return {
      '--accent': base,
      '--accent-ink': ink,
      '--accent-quiet': hslToHex(h, clamp(S * 0.42, 12, 40), 94),
      '--accent-indicator': base,
      '--accent-deep': hslToHex(h, S, clamp(bl - 10, 6, 40)),
      '--accent-deeper': hslToHex(h, S, clamp(bl - 18, 4, 32)),
      '--accent-glow': rgba(base, 0.16),
      '--surface-selected': hslToHex(h, clamp(S * 0.42, 12, 40), 94),
      /* خلفية التلميحات — لون المنشأة غامق، والحبر الأبيض فوقه
         مضمون لأن base بيتغمّق لحد ما يعدّي حد التباين فوق. */
      '--surface-inverse': base,
      '--nav-active-bg': base,
      '--nav-ink-active': ink,
      '--tint-bg': hslToHex(h, clamp(S * 0.35, 10, 34), 96),
      '--tint-ink': hslToHex(h, S, 34),
      '--tint-1': hslToHex(h, clamp(S * 0.35, 10, 34), 96),
      '--tint-2': hslToHex(h, clamp(S * 0.35, 10, 34), 96),
      '--tint-3': hslToHex(h, clamp(S * 0.35, 10, 34), 96),
      '--tint-4': hslToHex(h, clamp(S * 0.35, 10, 34), 96),
      '--tint-ink-1': hslToHex(h, S, 34),
      '--tint-ink-2': hslToHex(h, S, 34),
      '--tint-ink-3': hslToHex(h, S, 34),
      '--tint-ink-4': hslToHex(h, S, 34),
      /* السلاسل التلاتة لازم تفضل مفصولة عن بعض مهما كان اللون،
         فالدرجات بتتحسب **بالنسبة لإضاءة اللون نفسه** مش بقيم ثابتة —
         اللون الغامق كان بيدّي سلسلتين متشابهتين لما القيم كانت ثابتة. */
      '--chart-1': base,
      '--chart-2': hslToHex(h, clamp(S * 0.78, 18, 72), clamp(bl + 19, 38, 58)),
      '--chart-3': hslToHex(h, clamp(S * 0.55, 16, 58), clamp(bl + 52, 66, 82)),
      '--chart-track': hslToHex(h, clamp(S * 0.3, 8, 28), 95),
    }
  }

  /* الوضع الداكن: نفس درجة اللون بس أفتح وأقل تشبّعًا،
     عشان ميضربش على خلفية سودا. */
  const base = hslToHex(h, clamp(S * 0.86, 16, 78), 44)
  return {
    '--accent': base,
    '--accent-ink': inkOn(base),
    '--accent-quiet': hslToHex(h, clamp(S * 0.6, 12, 50), 17),
    '--accent-indicator': hslToHex(h, clamp(S * 0.8, 16, 72), 56),
    '--accent-deep': hslToHex(h, clamp(S * 0.7, 12, 60), 22),
    '--accent-deeper': hslToHex(h, clamp(S * 0.7, 12, 60), 13),
    '--accent-glow': rgba(base, 0.22),
    '--surface-selected': hslToHex(h, clamp(S * 0.3, 6, 26), 19),
    /* في الداكن التلميحة بتنقلب: سطح فاتح وحبر غامق — زي التوكنز */
    '--surface-inverse': NEUTRAL_LIGHT,
    '--nav-active-bg': base,
    '--nav-ink-active': inkOn(base),
    '--tint-bg': hslToHex(h, clamp(S * 0.3, 6, 24), 14),
    '--tint-ink': hslToHex(h, clamp(S * 0.75, 16, 66), 62),
    '--tint-1': hslToHex(h, clamp(S * 0.3, 6, 24), 14),
    '--tint-2': hslToHex(h, clamp(S * 0.3, 6, 24), 14),
    '--tint-3': hslToHex(h, clamp(S * 0.3, 6, 24), 14),
    '--tint-4': hslToHex(h, clamp(S * 0.3, 6, 24), 16),
    '--tint-ink-1': hslToHex(h, clamp(S * 0.75, 16, 66), 62),
    '--tint-ink-2': hslToHex(h, clamp(S * 0.75, 16, 66), 62),
    '--tint-ink-3': hslToHex(h, clamp(S * 0.75, 16, 66), 62),
    '--tint-ink-4': hslToHex(h, clamp(S * 0.75, 16, 66), 66),
    '--chart-1': hslToHex(h, clamp(S * 0.8, 16, 72), 52),
    '--chart-2': base,
    '--chart-3': hslToHex(h, clamp(S * 0.6, 14, 58), 70),
    '--chart-track': hslToHex(h, clamp(S * 0.25, 5, 20), 18),
  }
}

/* ============================================================
   التخزين والتطبيق
   ============================================================ */
export function getBrand() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_BRAND, ...JSON.parse(raw) } : { ...DEFAULT_BRAND }
  } catch (e) { return { ...DEFAULT_BRAND } }
}

export function saveBrand(b) {
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch (e) { /* تجاهل */ }
  applyBrand(b)
  window.dispatchEvent(new CustomEvent('haseem:brand', { detail: b }))
}

export function resetBrand() {
  try { localStorage.removeItem(KEY) } catch (e) { /* تجاهل */ }
  applyBrand(DEFAULT_BRAND)
  window.dispatchEvent(new CustomEvent('haseem:brand', { detail: DEFAULT_BRAND }))
  return { ...DEFAULT_BRAND }
}

/* بتتطبّق على <html> — أعلى من أي قاعدة في الـCSS، فبتغلب
   الوضع الفاتح والداكن الاتنين. عشان كده بنعيد استدعاءها
   لما الوضع يتبدّل. */
export function applyBrand(b = getBrand()) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const dark = root.dataset.theme === 'dark'
  const color = b.color || DEFAULT_BRAND.color
  const vars = ramp(color, dark)

  if (color.toLowerCase() === DEFAULT_BRAND.color.toLowerCase()) {
    /* اللون الافتراضي = بالِت حسيم الأصلية. بنشيل التخصيص خالص
       بدل ما نعيد حسابه، عشان الشكل يفضل مطابق ١٠٠٪ للتوكنز. */
    Object.keys(vars).forEach((k) => root.style.removeProperty(k))
  } else {
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }

  const ar = FONTS_AR.find((f) => f.id === b.fontAr) || FONTS_AR[0]
  const en = FONTS_EN.find((f) => f.id === b.fontEn) || FONTS_EN[0]
  const stack = `${en.css}, ${ar.css}, system-ui, sans-serif`
  root.style.setProperty('--font-ui', stack)
  root.style.setProperty('--font-mono', `${en.css}, system-ui, sans-serif`)
  /* ★ `--font-display` مش بيتغيّر مع هوية المنشأة.
     Fustat هو صوت **حسيم** نفسه في العناوين — زي ما الجايد لاين
     بتفصل: Fustat للعناوين، وخط النص للمحتوى. المنشأة بتختار خط
     المحتوى، وعناوين المنتج بتفضل بصوت المنتج. */
  root.style.setProperty('--brand-logo', `url("${b.logo || DEFAULT_BRAND.logo}")`)

  /* خلفية صفحة الدخول: صورة المستخدم لو رفع واحدة، وإلا `none`
     فتفضل الخلفية المولّدة من لون المنشأة هي اللي باينة. */
  root.style.setProperty('--auth-bg', b.authBg ? `url("${b.authBg}")` : 'none')
}

import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Button, IconButton, SearchField } from './primitives.jsx'
import { Ico, Riyal } from './icons.jsx'
import { Toaster, ConfirmHost, toast } from './feedback.jsx'
import { Modal } from './modal.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { getTheme, setTheme } from '../lib/theme.js'
import { getBrand } from '../lib/brand.js'
import { Drawer } from './drawer.jsx'
import { NotificationsDrawer, NOTIF_COUNT } from './notifications.jsx'

/* ============================================================
   الهيكل — Option B (handoff §3):
     توب بار ٦٤ · سايدبار أيقونات ٧٦ (بيتوسّع لـ٢٦٠ بالأسماء)
     · درج تنقّل على الموبايل · مفيش هوفر.
   مكان كل شاشة في التنقّل ما اتغيّرش (handoff §12).
   ============================================================ */
const NAV = [
  { Ic: Ico.home, label: 'الرئيسية', to: '/dashboard' },
  { Ic: Ico.dollar, label: 'المبيعات', children: [
      { label: 'فواتير المبيعات', to: '/sales/invoices' },
      { label: 'عروض الأسعار',    to: '/sales/quotations' },
      { label: 'إشعارات دائنة',   to: '/sales/credit-notes' },
      { label: 'إشعارات مدينة',   to: '/sales/debit-notes' },
  ]},
  { Ic: Ico.customers, label: 'العملاء', to: '/sales/customers' },
  { Ic: Ico.trend, label: 'التقارير', children: [
      { label: 'تقرير المبيعات',   to: '/reports/sales' },
      { label: 'تقرير المصروفات',  to: '/reports/expenses' },
      { label: 'قائمة الدخل',      to: '/reports/income-statement' },
      { label: 'التدفق النقدي',    to: '/reports/cash-flow' },
      { label: 'ميزان المراجعة',   to: '/reports/trial-balance' },
      { label: 'الميزانية العمومية', to: '/reports/balance-sheet' },
      { label: 'الإقرار الضريبي',  to: '/reports/vat-return' },
      { label: 'كشف الحساب',       to: '/reports/statement' },
  ]},
  { Ic: Ico.box, label: 'المنتجات والخدمات', children: [
      { label: 'الأصناف',        to: '/inventory/items' },
      { label: 'المستودعات',     to: '/inventory/warehouses' },
      { label: 'تسويات المخزون', to: '/inventory/adjustments' },
      { label: 'نقل المخزون',    to: '/inventory/transfers' },
      { label: 'تقارير المخزون', to: '/inventory/reports' },
  ]},
  { Ic: Ico.purchases, label: 'المشتريات والمصروفات', children: [
      { label: 'فواتير المشتريات', to: '/purchases/bills' },
      { label: 'أوامر الشراء',     to: '/purchases/orders' },
      { label: 'الموردون',         to: '/purchases/suppliers' },
      { label: 'المصروفات',        to: '/purchases/expenses' },
      { label: 'البيانات الجمركية', to: '/purchases/customs' },
  ]},
  { Ic: Ico.wallet, label: 'النقد والبنوك', children: [
      { label: 'الحسابات',      to: '/cash/accounts' },
      { label: 'سندات القبض',   to: '/cash/receipts' },
      { label: 'سندات الصرف',   to: '/cash/payments' },
      { label: 'التحويلات',     to: '/cash/transfers' },
  ]},
  { Ic: Ico.ledger, label: 'المحاسبة', children: [
      { label: 'قيود اليومية',   to: '/accounting/journal' },
      { label: 'دفتر الأستاذ',   to: '/accounting/ledger' },
      { label: 'دليل الحسابات',  to: '/accounting/accounts' },
      { label: 'مراكز التكلفة',  to: '/accounting/cost-centers' },
  ]},
  { Ic: Ico.projects, label: 'المشاريع', to: '/projects' },
  { Ic: Ico.help, label: 'المساعدة', children: [
      { label: 'مركز المساعدة',  to: '/help' },
      { label: 'مسرد المصطلحات', to: '/help/glossary' },
      { label: 'الدعم',          to: '/help/support' },
  ]},
  { Ic: Ico.settings, label: 'الإعدادات', children: [
      { label: 'المنشأة',           to: '/settings/organization' },
      { label: 'الفروع',            to: '/settings/branches' },
      { label: 'الفريق والصلاحيات', to: '/settings/team' },
      { label: 'المستندات',         to: '/settings/documents' },
      { label: 'العملات',           to: '/settings/currencies' },
      { label: 'الهيئة والفوترة',   to: '/settings/zatca' },
      { label: 'الهوية البصرية',    to: '/settings/brand' },
  ]},
]

/* «إضافة سريعة» — النصوص من handoff §8 */
const QUICK = [
  { Ic: Ico.invoice,   t: 'إنشاء فاتورة مبيعات',  s: 'استلم أسرع',              to: '/sales/invoices/new' },
  { Ic: Ico.purchases, t: 'إنشاء فاتورة مشتريات', s: 'تتبع الإنفاق',             to: '/purchases/bills/new' },
  { Ic: Ico.file,      t: 'إنشاء عرض سعر',        s: 'أرسل عرض سعر للعميل',      to: '/sales/invoices/new?kind=quote' },
  { Ic: Ico.userPlus,  t: 'إضافة عميل جديد',      s: 'أضف عميلًا جديدًا',         to: '/sales/customers/new' },
]

/* قفل عند الضغط برا أو Esc — قايمة واحدة مفتوحة في المرة (handoff §7-12) */
export function useDismiss(open, close, refs = []) {
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (refs.some((r) => r.current && r.current.contains(e.target))) return; close() }
    const esc = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('haseem:pop', close)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('haseem:pop', close)
    }
  }, [open])
}
/* أي قايمة بتتفتح بتقفل التانيين الأول */
export const closeOtherPops = () => window.dispatchEvent(new Event('haseem:pop'))

const hitsPath = (pathname, to) => pathname === to || pathname.startsWith(to + '/')
const activeIn = (pathname, kids) =>
  kids.filter((c) => hitsPath(pathname, c.to)).sort((a, b) => b.to.length - a.to.length)[0]?.to

function SideNav({ col, onToggle, onNavigate }) {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [theme, setTh] = useState(getTheme)
  const [open, setOpen] = useState(() => {
    const o = {}
    NAV.forEach((it) => { if (it.children && activeIn(pathname, it.children)) o[it.label] = true })
    return o
  })
  const [fly, setFly] = useState(null)   /* { label, top, kids } */
  const flyRef = useRef(null)
  const navRef = useRef(null)
  useDismiss(!!fly, () => setFly(null), [flyRef, navRef])
  useEffect(() => { setFly(null) }, [pathname])

  const go = (to) => { nav(to); onNavigate?.() }

  /* ★ في الوضع المطوي: الماوس فوق البلاطة بيفتح الموديولات اللي جوّاها
     من غير ضغط (طلب مهاب ١٩ سبتمبر). اللمس والكيبورد بيفتحوها بالضغط.
     القفل بعد ١٥٠ms عشان الماوس يلحق يعدّي من البلاطة للقايمة. */
  const hideT = useRef(null)
  const openFly = (it, el) => {
    clearTimeout(hideT.current)
    if (fly?.label === it.label) return
    const r = el.getBoundingClientRect()
    /* البنود المفردة (الرئيسية، العملاء، المشاريع…) بتطلع نفس القايمة
       فيها اسم الموديول بس — الضغط عليه بيفتحه (طلب مهاب ١٩ سبتمبر). */
    const single = !it.children
    const kids = it.children || [{ label: it.label, to: it.to }]
    closeOtherPops()
    setFly({ label: it.label, kids, single, top: Math.min(r.top - (single ? 4 : 8), window.innerHeight - (kids.length * 44 + (single ? 24 : 70))) })
  }
  const leaveFly = () => { clearTimeout(hideT.current); hideT.current = setTimeout(() => setFly(null), 150) }
  const keepFly = () => clearTimeout(hideT.current)
  useEffect(() => () => clearTimeout(hideT.current), [])

  return (
    <nav ref={navRef} className={`ob-side${col ? ' is-col' : ''}`} aria-label="التنقّل الرئيسي" data-component="Sidebar">
      {NAV.map((it) => {
        if (!it.children) {
          const on = hitsPath(pathname, it.to)
          return (
            <NavLink key={it.label} to={it.to} aria-label={col ? it.label : undefined}
              aria-current={on ? 'page' : undefined} onClick={() => { setFly(null); onNavigate?.() }}
              onPointerEnter={(e) => { if (col && e.pointerType === 'mouse') openFly(it, e.currentTarget) }}
              onPointerLeave={(e) => { if (col && e.pointerType === 'mouse') leaveFly() }}
              className={() => `ob-side__nv${on ? ' is-on' : ''}`}>
              <it.Ic size={20} /><span>{it.label}</span>
            </NavLink>
          )
        }
        const cur = activeIn(pathname, it.children)
        const isOpen = !col && open[it.label]
        return (
          <div key={it.label} style={{ display: 'contents' }}>
            <button type="button" aria-label={col ? it.label : undefined}
              className={`ob-side__nv is-grp${cur ? ' is-on' : ''}${isOpen ? ' is-open' : ''}`}
              aria-expanded={col ? fly?.label === it.label : !!isOpen}
              aria-haspopup={col ? 'menu' : undefined}
              onPointerEnter={(e) => { if (col && e.pointerType === 'mouse') openFly(it, e.currentTarget) }}
              onPointerLeave={(e) => { if (col && e.pointerType === 'mouse') leaveFly() }}
              onClick={(e) => {
                /* ★ المنيو مقفولة: الضغط على الأيقونة بيفتح أول موديول جوّا
                   التاب (طلب مهاب ١٩ سبتمبر) — باقي الموديولات بتظهر بالهوفر. */
                if (col) { setFly(null); go(it.children[0].to); return }
                setOpen((p) => ({ ...p, [it.label]: !p[it.label] }))
              }}>
              <it.Ic size={20} /><span>{it.label}</span>
              <Ico.chevron size={16} className="ob-side__chev" />
            </button>
            {isOpen && (
              <div className="ob-side__sub">
                {it.children.map((c) => (
                  <NavLink key={c.to} to={c.to} onClick={() => onNavigate?.()}
                    aria-current={cur === c.to ? 'page' : undefined}
                    className={() => (cur === c.to ? 'is-on' : '')}>{c.label}</NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="ob-side__foot">
        {onToggle && (
          <button type="button" className="btn" onClick={onToggle}
            aria-label={col ? 'توسيع القائمة' : 'طي القائمة'} title={col ? 'توسيع القائمة' : 'طي القائمة'}>
            <Ico.panel size={20} className="ob-dir" />
          </button>
        )}
        <button type="button" className="btn"
          aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); setTh(t) }}>
          {theme === 'dark' ? <Ico.sun size={20} /> : <Ico.moon size={20} />}
        </button>
      </div>

      {fly && createPortal(
        <div ref={flyRef} className={`ob-menu ob-fly${fly.single ? " ob-fly--one" : ""}`} role="menu" aria-label={fly.label} dir="rtl"
          onPointerEnter={keepFly} onPointerLeave={(e) => { if (e.pointerType === 'mouse') leaveFly() }}
          style={{ top: Math.max(72, fly.top), insetInlineStart: 84 }}>
          {!fly.single && <div className="ob-menu__h">{fly.label}</div>}
          {fly.kids.map((c) => {
            const on = fly.single ? hitsPath(pathname, c.to) : activeIn(pathname, fly.kids) === c.to
            return (
              <button key={c.to} type="button" role="menuitem"
                className={`ob-menu__i${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}
                onClick={() => go(c.to)}>
                <span>{c.label}</span>{on && <Ico.check size={16} />}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </nav>
  )
}

/* ============================================================
   ★ الترقية — حالة عامة (طلب مهاب ٢٠ سبتمبر)
   رسالة واحدة تنفع للمشترك وغير المشترك (زي المربوط بمنصة فاتورة):
   بتقول هياخد إيه، مش بس «ترقية». الأرقام والباقات تتوصل بعدين.
   ============================================================ */
const UP_PERKS = [
  ['فواتير بلا حد شهري', 'أصدِر وأرسِل للهيئة من غير ما توقف عند حد الباقة'],
  ['مستخدمين وفروع إضافية', 'فريقك كله على نفس الحساب، بصلاحيات لكل واحد'],
  ['تقارير مالية متقدمة', 'قائمة الدخل والميزانية والتدفقات النقدية جاهزة'],
  ['ربط بنكي وتسوية تلقائية', 'الحركات البنكية بتتطابق مع السندات لوحدها'],
  ['دعم فني بأولوية', 'رد أسرع من فريق حسيم على الشات والإيميل'],
]
function UpgradeModal({ onClose }) {
  return (
    <Modal title="افتح كل مزايا حسيم" sub="اختار الباقة المناسبة لمنشأتك — تقدر تغيّرها أو تلغيها في أي وقت."
      onClose={onClose}
      footer={<>
        <button type="button" className="btn btn--primary" onClick={() => { onClose(); toast.info('صفحة الباقات — جاية قريب') }}>عرض الباقات</button>
        <button type="button" className="btn" onClick={onClose}>لاحقًا</button>
      </>}>
      <ul className="ob-perks">
        {UP_PERKS.map(([t, d]) => (
          <li key={t}><span className="ob-perks__ic"><Ico.check size={16} /></span><span><b>{t}</b><small>{d}</small></span></li>
        ))}
      </ul>
    </Modal>
  )
}

function TopBar({ onMenu }) {
  const nav = useNavigate()
  const [qa, setQa] = useState(false)
  const [um, setUm] = useState(false)
  const [orgs, setOrgs] = useState(false)
  const [orgQ, setOrgQ] = useState('')
  const [notif, setNotif] = useState(false)
  const qaRef = useRef(null)
  const umRef = useRef(null)
  useDismiss(qa, () => setQa(false), [qaRef])
  useDismiss(um, () => setUm(false), [umRef])

  const [brand, setBrand] = useState(getBrand)
  useEffect(() => {
    const on = (e) => setBrand(e.detail || getBrand())
    const openOrgs = () => setOrgs(true)
    window.addEventListener('haseem:brand', on)
    window.addEventListener('haseem:orgs', openOrgs)
    return () => { window.removeEventListener('haseem:brand', on); window.removeEventListener('haseem:orgs', openOrgs) }
  }, [])

  const soon = (t) => toast.info(`${t} — جاي قريب`)
  const [up, setUp] = useState(false)

  return (
    <header className="ob-top" data-component="TopBar">
      <button type="button" className="iconbtn ob-top__menu" onClick={onMenu} aria-label="القائمة">
        <Ico.menu size={20} />
      </button>
      <img className="ob-top__logo" src="/haseem-mark.svg" alt="حسيم" />

      <div className="ob-picker" ref={qaRef}>
        <button type="button" className="btn btn--primary ob-top__qa" aria-expanded={qa} aria-haspopup="menu"
          aria-label="إضافة سريعة" onClick={() => { if (!qa) closeOtherPops(); setQa(!qa) }}>
          <Ico.plus size={20} /><span className="ob-top__qat">إضافة سريعة</span>
        </button>
        {qa && (
          <div className="ob-menu ob-qa" role="menu">
            <div className="ob-qa__h"><b>إضافة سريعة</b><span>ماذا تريد إضافة؟</span></div>
            {QUICK.map((q) => (
              <button key={q.t} type="button" role="menuitem" className="ob-menu__i"
                onClick={() => { setQa(false); nav(q.to) }}>
                <span className="ob-menu__ic"><q.Ic size={20} /></span>
                <span>{q.t}<small>{q.s}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="ob-top__sp" />

      {/* ★ دعوة الترقية/الاشتراك — حالة عامة لكل المستخدمين (طلب مهاب ٢٠ سبتمبر).
          برنامج الشراكة اتنقل لقايمة الحساب. */}
      <button type="button" className="ob-up" onClick={() => setUp(true)} aria-haspopup="dialog">
        <Ico.sparkle size={18} /><span className="ob-up__t">افتح كل مزايا حسيم</span>
      </button>
      {up && <UpgradeModal onClose={() => setUp(false)} />}
      <button type="button" className="iconbtn" onClick={() => setNotif(true)} aria-label="الإشعارات" title="الإشعارات">
        <Ico.bell size={20} />
      </button>

      <div className="ob-picker" ref={umRef}>
        <button type="button" className="ob-ws" aria-expanded={um} aria-haspopup="menu"
          onClick={() => { if (!um) closeOtherPops(); setUm(!um) }}>
          <span className="ob-ws__av">
            {brand.logo ? <img src={brand.logo} alt="" /> : DATA.org.initials}
          </span>
          <span className="ob-ws__t">
            <span className="ob-ws__n">{DATA.org.nameAr}</span>
            <span className="ob-ws__st"><i className={DATA.org.zatcaOk ? 'is-ok' : ''} />{DATA.org.zatca}</span>
          </span>
          <span className="ob-ws__u">
            {DATA.user.photo ? <img src={DATA.user.photo} alt="" /> : DATA.user.initials}
          </span>
        </button>
        {um && (
          <div className="ob-menu is-end" role="menu" style={{ minWidth: 240 }}>
            <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { setUm(false); setOrgs(true) }}>
              <Ico.org size={20} />تغيير المنشأة</button>
            <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { setUm(false); soon('ملفي الشخصي') }}>
              <Ico.user size={20} />ملفي الشخصي</button>
            <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { setUm(false); soon('الاشتراك') }}>
              <Ico.card size={20} />الاشتراك</button>
            <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { setUm(false); soon('الربح والشراكة') }}>
              <Ico.gift size={20} />الربح والشراكة</button>
            <hr />
            <button type="button" role="menuitem" className="ob-menu__i ob-menu__i--danger" onClick={() => { setUm(false); nav('/login') }}>
              <Ico.logout size={20} className="ob-dir" />تسجيل الخروج</button>
          </div>
        )}
      </div>

      <Drawer open={orgs} onClose={() => setOrgs(false)} title="المنشآت" meta="اختر المنشأة اللي عايز تشتغل عليها">
        <div className={`odrw__zatca${DATA.org.zatcaOk ? ' is-ok' : ''}`}>
          <i className="omenu__dot" />
          <span className="omenu__zt">{DATA.org.zatca}</span>
          <span className="omenu__zs">{DATA.org.zatcaSync}</span>
        </div>
        {DATA.orgs.length >= 8 && (
          <input className="fld__i odrw__s" placeholder="ابحث باسم المنشأة…"
            value={orgQ} onChange={(e) => setOrgQ(e.target.value)} />
        )}
        <div className="odrw__l">
          {DATA.orgs.filter((o) => o.nameAr.includes(orgQ.trim())).map((o) => (
            <button key={o.id} type="button" className={`odrw__o${o.current ? ' is-on' : ''}`} onClick={() => setOrgs(false)}>
              <span className="odrw__av">{o.logo ? <img src={o.logo} alt="" /> : <b>{o.initials}</b>}</span>
              <span className="odrw__t"><b>{o.nameAr}</b><em>{o.current ? 'المنشأة الشغّالة دلوقتي' : 'اضغط للتبديل'}</em></span>
              {o.current && <Ico.check size={16} />}
            </button>
          ))}
        </div>
        <div className="odrw__acts">
          <button type="button" className="odrw__i" onClick={() => { setOrgs(false); nav('/settings/organization') }}>
            <span className="omenu__ic"><Ico.settings size={16} /></span>إعدادات المنشأة
          </button>
          <button type="button" className="odrw__i"><span className="omenu__ic"><Ico.plus size={16} /></span>إضافة منشأة</button>
        </div>
      </Drawer>
      <NotificationsDrawer open={notif} onClose={() => setNotif(false)} />
    </header>
  )
}

/* `aside`: لوحة جانبية على inline-end (المعاينة) — المحتوى يفضل شغّال جنبها */
/* ★ أكشنز الجداول (طلب مهاب ٢٠ سبتمبر): كل زرار على قد الكلمة + ١٦ بادنج،
   وفي كل جدول، كل الأزرار السياقية (المختلفة) بتاخد عرض أطول واحد فيهم —
   أقل مقاس يناسبهم كلهم. بيتحسب تاني لما محتوى الجدول يتغير. */
const ACT_SEL = '.ob-acts > .btn--soft, td .act'
function equalizeRowActions(root) {
  if (!root) return
  root.querySelectorAll('table').forEach((t) => {
    const btns = [...t.querySelectorAll(ACT_SEL)]
    const phs = [...t.querySelectorAll('.ob-actph')]
    if (!btns.length) { phs.forEach((p) => { p.style.display = 'none' }); return }
    btns.forEach((b) => { b.style.width = '' })
    const w = Math.ceil(Math.max(...btns.map((b) => b.getBoundingClientRect().width)))
    btns.forEach((b) => { b.style.width = w + 'px' })
    t.style.setProperty('--ob-actw', w + 'px')
    phs.forEach((p) => { p.style.display = '' })
  })
}
function useEqualActions(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => equalizeRowActions(el)) }
    run()
    const mo = new MutationObserver((muts) => {
      if (muts.every((m) => m.type === 'attributes' && m.attributeName === 'style')) return
      run()
    })
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => { mo.disconnect(); cancelAnimationFrame(raf) }
  }, [ref])
}

export function AppShell({ children, aside }) {
  const [col, setCol] = useState(() => {
    try { const v = localStorage.getItem('ob:navcol'); return v == null ? true : v === '1' } catch { return true }
  })
  const toggle = () => setCol((c) => { const n = !c; try { localStorage.setItem('ob:navcol', n ? '1' : '0') } catch {} return n })
  const [drawer, setDrawer] = useState(false)
  const mainRef = useRef(null)
  useEqualActions(mainRef)
  const { pathname } = useLocation()
  useEffect(() => { setDrawer(false) }, [pathname])
  useEffect(() => {
    if (!drawer) return
    const esc = (e) => { if (e.key === 'Escape') setDrawer(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [drawer])

  return (
    <div className="ob-shell" data-component="AppShell">
      <TopBar onMenu={() => setDrawer(true)} />
      <div className="ob-body">
        <SideNav col={col} onToggle={toggle} />
        <main ref={mainRef} className={`ob-main${aside ? ' has-pv' : ''}`}>
          {aside ? <><div className="ob-main__c">{children}</div>{aside}</> : children}
        </main>
      </div>
      {drawer && (
        <div className="ob-navdrawer" onClick={(e) => { if (e.target === e.currentTarget) setDrawer(false) }}>
          <SideNav col={false} onNavigate={() => setDrawer(false)} />
        </div>
      )}
      <Toaster />
      <ConfirmHost />
    </div>
  )
}

/* إعلان العملة — مرة واحدة فوق، بدل ما «SAR» تتكرر جنب كل رقم في الجدول */
export function CurrencyNote() {
  return (
    <p className="curnote" data-component="CurrencyNote">
      <Riyal />كل المبالغ بالريال السعودي
    </p>
  )
}

/* هيدر الصفحة الموحّد (handoff §3):
   h1 22/700 + شارة الحالة + سطر الاستخدام … الأزرار.
   «رجوع» زرار ghost أول الأزرار (زي Create §3). */
export function PageHeader({ title, sub, actions, back, chip, usage }) {
  const nav = useNavigate()
  const goBack = () => (typeof back === 'function' ? back() : nav(back))
  return (
    <div data-component="PageHeader" className="ob-ph">
      <div className="ob-ph__l">
        <div className="ob-ph__t"><h1>{title}</h1>{chip}</div>
        {(sub || usage) && <div className="ob-ph__sub">{sub && <span>{sub}</span>}{usage}</div>}
      </div>
      <div className="ob-ph__acts">
        {back && <button type="button" className="btn btn--ghost" onClick={goBack}>رجوع</button>}
        {actions}
      </div>
    </div>
  )
}

/* سطر الاستخدام — «118 من 300 فاتورة هذا الشهر» + شريط (Create §6) */
export function UsageLine({ used, limit, unit = 'فاتورة' }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <span className="ob-usage">
      <span className="ob-prog" aria-hidden="true"><i className={pct >= 90 ? 'is-hi' : ''} style={{ width: pct + '%' }} /></span>
      <span><span className="num">{used}</span> من <span className="num">{limit}</span> {unit} هذا الشهر</span>
    </span>
  )
}

/* كرت المنشأة — متروك للاستخدام في شاشات تانية لو احتجناه */
export function ProfileCard() {
  return (
    <div data-component="ProfileCard" className="profilecard">
      <div className="profilecard__av">وس</div>
      <div className="profilecard__t">
        <div className="profilecard__n">{DATA.org.nameAr}</div>
        <div className="profilecard__h">@websquids</div>
      </div>
    </div>
  )
}

export function Tabs({ items, value, onChange }) {
  return (
    <div data-component="Tabs" className="tabs">
      {items.map((t) => (
        <button key={t.id} className={`tab${value === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function FilterBar({ filters, extra }) {
  return (
    <div data-component="FilterBar" className="filterbar">
      {filters.map((f) => (
        <button key={f.label} data-component="FilterSelect" className={`select${f.on ? ' on' : ''}`}>
          <span>{f.label}</span>{f.value && <span className="val">{f.value}</span>}<span className="chev">▼</span>
        </button>
      ))}
      <div className="filterbar__spacer" />
      {extra}
    </div>
  )
}

/* بديل صف كروت الـKPI — رقم قائد واحد وأرقام تابعة بحجم أصغر.

   `money={false}` للرقم اللي مش مبلغ (عدد حسابات مثلًا) — من
   غيرها كان بيطلع «٣٣٫٠٠ ﷼» وده رقم بيكدب على المستخدم. */
export function SummaryStrip({ label, value, note, items = [], money = true, unit }) {
  return (
    <div data-component="SummaryStrip" className="summary">
      <div className="summary__lead">
        <div className="summary__label">{label}</div>
        <div className="summary__value">
          <span className="num">{money ? fmtMoney(value) : value}</span>
          {money ? <Riyal /> : unit ? <em className="summary__unit">{unit}</em> : null}
        </div>
        {note && <div className="summary__note">{note}</div>}
      </div>
      <div className="summary__rest">
        {items.map((i) => (
          <div key={i.label} className={`summary__item${i.alert ? ' is-alert' : ''}`}>
            <div className="l">{i.label}</div>
            <div className="v"><span className="num">{i.money === false ? i.value : fmtMoney(i.value)}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Panel({ title, action, children, flush = false }) {
  return (
    <section data-component="Panel" className="panel">
      {title && (
        <div className="panel__head">
          <div className="panel__title">{title}</div>
          {action}
        </div>
      )}
      <div className={`panel__body${flush ? ' panel__body--flush' : ''}`}>{children}</div>
    </section>
  )
}

export function AttentionList({ items }) {
  return (
    <div data-component="AttentionList" className="attn">
      {items.map((i) => (
        <a key={i.text} className="attn__row" href={i.go ? `#${i.go}` : '#'}>
          <span className={`attn__mark${i.level === 'warn' ? ' attn__mark--warn' : ''}`} />
          <span className="attn__text"><b className="num">{i.count}</b> {i.text}</span>
          <span className="attn__meta"><span className="num">{fmtMoney(i.amount)}</span></span>
          <span className="attn__go">←</span>
        </a>
      ))}
    </div>
  )
}

/* مبدّل حالات الشاشة — للمراجعة فقط، يُحذف قبل الإنتاج */
export function StateSwitcher({ value, onChange }) {
  const opts = [['normal', 'عادية'], ['loading', 'تحميل'], ['empty', 'فاضية']]
  return (
    <div data-component="StateSwitcher" className="stateswitch">
      {opts.map(([k, l]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  )
}

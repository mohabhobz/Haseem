import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button, IconButton, SearchField } from './primitives.jsx'
import { Ico, Riyal } from './icons.jsx'
import { Toaster, ConfirmHost, toast } from './feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { getTheme, setTheme } from '../lib/theme.js'
import { getBrand } from '../lib/brand.js'
import { Drawer } from './drawer.jsx'
import { NotificationsDrawer, NOTIF_COUNT } from './notifications.jsx'

/* خريطة التنقل — قائمة واحدة متصلة، من غير تقسيمات */
const NAV = [
  { Ic: Ico.dashboard, label: 'الرئيسية', to: '/dashboard' },
  { Ic: Ico.invoice, label: 'المبيعات', children: [
      { label: 'فواتير المبيعات', to: '/sales/invoices' },
      { label: 'عروض الأسعار',    to: '/sales/quotations' },
      { label: 'إشعارات دائنة',   to: '/sales/credit-notes' },
      { label: 'إشعارات مدينة',   to: '/sales/debit-notes' },
  ]},
  { Ic: Ico.customers, label: 'العملاء', to: '/sales/customers' },
  { Ic: Ico.reports, label: 'التقارير', children: [
      { label: 'تقرير المبيعات',   to: '/reports/sales' },
      { label: 'تقرير المصروفات',  to: '/reports/expenses' },
      { label: 'قائمة الدخل',      to: '/reports/income-statement' },
      { label: 'التدفق النقدي',    to: '/reports/cash-flow' },
      { label: 'ميزان المراجعة',   to: '/reports/trial-balance' },
      { label: 'الميزانية العمومية', to: '/reports/balance-sheet' },
      { label: 'الإقرار الضريبي',  to: '/reports/vat-return' },
      { label: 'كشف الحساب',       to: '/reports/statement' },
  ]},
  { Ic: Ico.items, label: 'المنتجات والخدمات', children: [
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
  { Ic: Ico.bank, label: 'النقد والبنوك', children: [
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

const PROFILE_MENU = [
  { Ic: Ico.org,  label: 'تغيير المنشأة' },
  { Ic: Ico.user, label: 'ملفي الشخصي' },
  { Ic: Ico.card, label: 'الاشتراك' },
]

export function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [orgMenu, setOrgMenu] = useState(false)
  const [orgQ, setOrgQ]       = useState('')

  /* أي شاشة تقدر تفتح دراور المنشآت من غير ما تعرف حاجة عن
     الـShell — «تغيير» اللي في رأس الفاتورة بيستخدمه */
  useEffect(() => {
    const open = () => setOrgMenu(true)
    window.addEventListener('haseem:orgs', open)
    return () => window.removeEventListener('haseem:orgs', open)
  }, [])
  const [theme, setTh] = useState(getTheme)
  /* شعار المنشأة بيتقرا من الهوية، وبيتحدّث لحظيًا لما تتغيّر */
  const [brand, setBrand] = useState(getBrand)
  useEffect(() => {
    const on = (e) => setBrand(e.detail || getBrand())
    window.addEventListener('haseem:brand', on)
    return () => window.removeEventListener('haseem:brand', on)
  }, [])
  /* ★ الرابط النشِط: أطول مسار مطابق، مش أي مسار بادئ.
     `NavLink` لوحده بيطابق بالبادئة، يعني وإنت في /help/glossary
     بيعتبر /help نشط كمان — فبيبان لينكين مضوّيين مع بعض.
     الصح: الأخ اللي مساره أطول وبيطابق هو النشِط لوحده. */
  const hits = (to) => pathname === to || pathname.startsWith(to + '/')
  const activeIn = (kids) =>
    kids.filter((c) => hits(c.to)).sort((a, b) => b.to.length - a.to.length)[0]?.to

  const [open, setOpen] = useState(() => {
    const o = {}
    NAV.forEach((it) => { if (it.children && activeIn(it.children)) o[it.label] = true })
    return o
  })

  /* القسم اللي فيه الصفحة الحالية بيفتح لوحده — عشان لو دخلت
     صفحة من زرار جوه المحتوى، القايمة تبان مفتوحة على مكانك. */
  useEffect(() => {
    setOpen((p) => {
      const o = { ...p }
      let ch = false
      NAV.forEach((it) => {
        if (it.children && activeIn(it.children) && !o[it.label]) { o[it.label] = true; ch = true }
      })
      return ch ? o : p
    })
  }, [pathname])

  useEffect(() => {
    if (!menu && !orgMenu) return
    const away = () => { setMenu(false); setOrgMenu(false) }
    const esc = (e) => { if (e.key === 'Escape') away() }
    document.addEventListener('click', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', esc) }
  }, [menu, orgMenu])

  const renderItem = (it) => {
    if (it.children) {
      const on = activeIn(it.children)
      return (
        <div key={it.label} data-component="NavGroup" className={`nav__group${open[it.label] ? ' open' : ''}`}>
          {/* ★ والقايمة مقفولة، الدوسة **بتودّيك جوّه الموديول**
              والقايمة تفضل مقفولة زي ما هي.
              قبل كده كانت بتفتح القايمة — وده كان بيغيّر حالة
              الشاشة من غير ما المستخدم يطلب. هو قافلها عن قصد،
              وبيعرف أسماء الموديولز من الهوفر، وبيختار من
              اللوحة الجانبية. فمفيش سبب الدوسة تفتحها.
              القايمة بتتفتح من مقبض الحافة **بس**.
              والوجهة: الشاشة الشغّالة جوّه المجموعة لو فيه،
              وإلا أول شاشة فيها. */}
          {/* `is-ison` = فيه شاشة شغّالة جوّه المجموعة دي. مهم في
              الوضع المقفول: العناصر الفرعية مخفية، فلو المجموعة
              ما اتعلّمتش المستخدم مش عارف هو فين خالص. */}
          <button className={'nav__item' + (on ? ' is-ison' : '')} title={it.label}
            onClick={() => {
              if (collapsed) { nav(on || it.children[0].to); return }
              setOpen((p) => ({ ...p, [it.label]: !p[it.label] }))
            }}>
            <span className="ico"><it.Ic size={18} /></span>
            <span className="label">{it.label}</span>
            <Ico.chevron size={16} className="chev" />
          </button>
          <div className="nav__sub">
            {it.children.map((c) => (
              <NavLink key={c.label} to={c.to} data-component="NavLink"
                /* لازم شكل الدالة: NavLink بيزوّد كلاس `active` بتاعه
                   لوحده لما الكلاس نص عادي — وده اللي كان بيضوّي لينكين */
                aria-current={on === c.to ? 'page' : undefined}
                className={() => `nav__link${on === c.to ? ' active' : ''}`}>{c.label}</NavLink>
            ))}
          </div>

          {/* ★ القايمة مقفولة: المجموعة بتفتح لوحة جنبية بالهوفر.
              من غيرها المستخدم لازم يفتح القايمة كلها عشان يشوف
              فين هو — واللوحة بتوري كمان **العنصر الشغّال**،
              فالمقفولة ما بتبقاش بتخبّي مكانك. */}
          <div className="nav__fly" role="menu" aria-label={it.label}>
            <span className="nav__flyt">{it.label}</span>
            {it.children.map((c) => (
              <NavLink key={c.label} to={c.to} role="menuitem"
                aria-current={on === c.to ? 'page' : undefined}
                className={() => `nav__flyi${on === c.to ? ' active' : ''}`}>
                {c.label}
                {on === c.to && <Ico.check size={14} />}
              </NavLink>
            ))}
          </div>
        </div>
      )
    }
    if (it.to === '#') {
      /* شاشة لسه متبنيتش — بتفضل بشكلها الطبيعي، مش رمادية ولا
         معطّلة، بس بتقول الحقيقة بدل ما تسكت */
      return (
        <button key={it.label} className="nav__item" data-component="NavItem" title={it.label}
          onClick={() => toast.info(`${it.label} — الموديول ده لسه تحت التصميم`,
            { sub: 'المبيعات والعملاء هما الجاهزين دلوقتي' })}>
          <span className="ico"><it.Ic size={18} /></span><span className="label">{it.label}</span>
        </button>
      )
    }
    /* العنصر المفرد بياخد لوحة كمان — عشان الوضع المقفول
       يبقى فيه **قاعدة واحدة**: أي أيقونة تهوفر عليها تقولك
       اسمها وحالتها، مش بعضهم يقول وبعضهم لأ. */
    return (
      <div key={it.label} className="nav__one">
        <NavLink to={it.to} data-component="NavItem"
          className={({ isActive }) => `nav__item${isActive ? ' active' : ''}`}>
          <span className="ico"><it.Ic size={18} /></span><span className="label">{it.label}</span>
        </NavLink>
        <div className="nav__fly nav__fly--one" role="tooltip">
          <span className={'nav__flyi' + (hits(it.to) ? ' active' : '')}>
            {it.label}
            {hits(it.to) && <Ico.check size={14} />}
          </span>
        </div>
      </div>
    )
  }

  return (
    <nav data-component="Sidebar" className="nav">
      {/* ★ رأس القائمة = هوية المنشأة نفسها. ده منتج SaaS —
          العميل بيشوف شركته هو فوق، مش شعار حسيم. */}
      {/* ★ رأس القائمة بقى زرار واحد بيفتح دراور.
          قبل كده كان فيه قايمة منسدلة صغيرة فيها حالة الهيئة
          وقايمة المنشآت والإعدادات مكدّسين في ٢٤٠px. والمنشآت
          ممكن تبقى عشرات — قايمة بالحجم ده مش مكانها.
          الدراور بيدّي مساحة للبحث ولاسم كامل لكل منشأة. */}
      <div className="orgtop" data-component="OrgSwitcher">
        <button className="orgtop__id" aria-haspopup="dialog" aria-expanded={orgMenu}
          onClick={(e) => { e.stopPropagation(); setOrgMenu(true) }}>
          <span className="orgtop__av">
            {brand.logo
              ? <img src={brand.logo} alt="" />
              : <b>{DATA.org.initials}</b>}
          </span>
          <span className="orgtop__n" title={DATA.org.nameAr}>{DATA.org.nameAr}</span>
          <Ico.chevron size={15} className="orgtop__cv" />
        </button>
      </div>

      <Drawer open={orgMenu} onClose={() => setOrgMenu(false)}
        title="المنشآت" meta="اختر المنشأة اللي عايز تشتغل عليها">

        {/* حالة الربط مع الهيئة للمنشأة الشغّالة دلوقتي */}
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
          {DATA.orgs
            .filter((o) => o.nameAr.includes(orgQ.trim()))
            .map((o) => (
              <button key={o.id} className={`odrw__o${o.current ? ' is-on' : ''}`}
                onClick={() => setOrgMenu(false)}>
                <span className="odrw__av">
                  {o.logo ? <img src={o.logo} alt="" /> : <b>{o.initials}</b>}
                </span>
                <span className="odrw__t">
                  <b>{o.nameAr}</b>
                  <em>{o.current ? 'المنشأة الشغّالة دلوقتي' : 'اضغط للتبديل'}</em>
                </span>
                {o.current && <Ico.check size={16} />}
              </button>
            ))}
        </div>

        <div className="odrw__acts">
          <button className="odrw__i"
            onClick={() => { setOrgMenu(false); nav('/settings/organization') }}>
            <span className="omenu__ic"><Ico.settings size={16} /></span>إعدادات المنشأة
          </button>
          <button className="odrw__i">
            <span className="omenu__ic"><Ico.plus size={16} /></span>إضافة منشأة
          </button>
        </div>
      </Drawer>

      <div className="nav__scroll">
        {NAV.map(renderItem)}
      </div>
      {/* ★ بانر برنامج الشراكة — صورة واحدة فيها الهدية والخلفية،
          والنص فوقها HTML عشان يفضل قابل للتغيير والقراءة. لما
          القايمة تتقفل بيتحوّل لمربّع بيوريّ الهدية بس. */}
      <button className="navban" data-component="PartnerBanner"
        onClick={() => toast.info('برنامج الشراكة جاي قريب',
          { sub: 'هتكسب عمولة على كل عميل بيسجّل من لينكك' })}
        aria-label="اربح مع برنامج الشراكة">
        <span className="navban__t">اربح مع برنامج الشراكة</span>
      </button>

      <div className="nav__foot">
        {menu && (
          <div className="pmenu" data-component="ProfileMenu" onClick={(e) => e.stopPropagation()}>
            {PROFILE_MENU.map((m) => (
              <button key={m.label} className="pmenu__i">
                <span className="pmenu__ic"><m.Ic size={17} /></span>
                <span>{m.label}</span>
              </button>
            ))}
            <div className="pmenu__sep" />

            {/* مبدّل الوضع */}
            <div className="pmenu__theme">
              <span className="pmenu__themel">المظهر</span>
              <div className="segbtn" role="group" aria-label="المظهر">
                <button className={theme === 'light' ? 'on' : ''}
                  onClick={() => { setTheme('light'); setTh('light') }}>
                  <Ico.sun size={14} /><span>فاتح</span>
                </button>
                <button className={theme === 'dark' ? 'on' : ''}
                  onClick={() => { setTheme('dark'); setTh('dark') }}>
                  <Ico.moon size={14} /><span>داكن</span>
                </button>
              </div>
            </div>

            <div className="pmenu__sep" />
            <button className="pmenu__i pmenu__i--out"
              onClick={() => { setMenu(false); nav('/login') }}>
              <span className="pmenu__ic"><Ico.logout size={17} /></span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}

        <button className={`navprofile${menu ? ' is-open' : ''}`} data-component="NavProfile"
          onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}>
          <span className="uav" title={DATA.user.nameAr}>
            {DATA.user.photo
              ? <img src={DATA.user.photo} alt="" />
              : <b>{DATA.user.initials}</b>}
          </span>
          <span className="navprofile__t">
            <span className="navprofile__n">{DATA.user.nameAr}</span>
            <span className="navprofile__h">{DATA.user.role}</span>
          </span>
          <Ico.chevron size={16} className="navprofile__chev" />
        </button>

        {/* توقيع المنتج — أصغر عنصر في الشاشة */}
        <div className="navsig">
          <img className="navsig__mark" src="/haseem-mark.svg" alt="" aria-hidden="true" />
          <span className="navsig__t">مدعوم بمنصة <b>حسيم</b></span>
        </div>
      </div>
    </nav>
  )
}

export function TopBar({ search }) {
  return (
    <header data-component="TopBar" className="topbar">
      <button data-component="OrgSwitcher" className="org">
        <span className="org__avatar">وس</span>
        <span>
          <span className="org__name">{DATA.org.nameAr}</span><br />
          <span className="org__meta">{DATA.org.zatca}</span>
        </span>
        <span className="chev hint">▼</span>
      </button>
      <SearchField placeholder={search || 'ابحث برقم مستند أو اسم عميل…'} width={300} />
      <div className="topbar__spacer" />
      <Button label="إضافة سريعة" variant="primary" size="sm" icon="＋" />
      <IconButton icon="◔" title="الإشعارات" className="badged" />
      <button className="org" title={DATA.user.nameAr}>
        <span className="org__avatar">{DATA.user.initials}</span>
      </button>
    </header>
  )
}

/* ============================================================
   NavRail — الخط اللي بيفصل القايمة عن المحتوى، وهو نفسه
   المقبض بتاعها.
   ------------------------------------------------------------
   • **سحب** بيغيّر عرض القايمة (١٨٠ → ٣٦٠).
   • **دوسة** من غير سحب بتقفل/تفتح.
   • السحب تحت ١٥٠ بيقفلها — نفس حركة الإيد في أي IDE.

   ملاحظة اتجاه: القايمة على **اليمين**، فتوسيعها معناه إن
   الماوس بيروح **شمال** — يعني الفرق `startX - clientX`
   موجب. في LTR العكس، عشان كده في `dirSign`.
   ============================================================ */
const NAV_MIN = 180
const NAV_MAX = 360
const NAV_SNAP = 150

function NavRail({ collapsed, width, onWidth, onToggle }) {
  const drag = useRef(null)

  const down = (e) => {
    e.preventDefault()
    const sign = document.documentElement.dir === 'rtl' ? -1 : 1
    drag.current = { x: e.clientX, w: width, moved: false, sign }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    const delta = (e.clientX - d.x) * d.sign
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true
    const next = d.w + delta
    if (next < NAV_SNAP) { onWidth(NAV_MIN); if (!collapsed) onToggle(true); return }
    if (collapsed) onToggle(false)
    onWidth(Math.min(NAV_MAX, Math.max(NAV_MIN, next)))
  }

  const up = (e) => {
    const d = drag.current
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    /* دوسة من غير سحب = قفل/فتح */
    if (d && !d.moved) onToggle(!collapsed)
  }

  return (
    <div className="navrail" onPointerDown={down} onPointerMove={move}
      onPointerUp={up} onPointerCancel={up}
      role="separator" aria-orientation="vertical"
      aria-label="عرض القائمة — اسحب للتغيير أو اضغط للطي">
      <button className="navrail__b" tabIndex={-1}
        aria-label={collapsed ? 'فتح القائمة' : 'طي القائمة'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onToggle(!collapsed)}>
        <Ico.collapse size={15} />
      </button>
    </div>
  )
}

/* ============================================================
   MobileNav — شريط التنقّل التحتاني (تحت ٩٠٠px).
   ------------------------------------------------------------
   الهيكل منقول من سيستم العميل بالحرف بعد قراءته من الصفحة
   نفسها: ستة عناصر وزرار إضافة مرفوع في النص، والشريط ٧٢px.

   اللي اتغيّر بطلب منك: آخر عنصر بقى **المزيد** بدل الإعدادات —
   وبيفتح شيت فيه الموديولات اللي مش في الشريط، بدل ما تبقى
   مدفونة ورا البرجر فوق.

   ★ ليه شيت من تحت مش قايمة منسدلة؟ لأن الإيد على الموبايل
   تحت، والشيت بيفتح من نفس المكان اللي الصباع فيه. القايمة
   المنسدلة من فوق بتخلّي المستخدم يمدّ إيده لأعلى الشاشة.
   ============================================================ */
/* ★ خمس خانات بالظبط، **زرار الإضافة و«المزيد» محسوبين فيهم**:
   الرئيسية · المبيعات · [+] · المشتريات · المزيد.
   يعني تلات روابط بس — والباقي كله جوّه «المزيد». */
const MOBE = [
  { Ic: Ico.dashboard, label: 'الرئيسية',  to: '/dashboard' },
  { Ic: Ico.invoice,   label: 'المبيعات',  to: '/sales/invoices' },
  { Ic: Ico.purchases, label: 'المشتريات', to: '/purchases/bills' },
]

/* الموديولات اللي مش في الشريط — بتتفتح من «المزيد» */
const MORE = [
  { Ic: Ico.bank,      label: 'المعاملات',           to: '/cash/accounts' },
  { Ic: Ico.reports,   label: 'التقارير',            to: '/reports/sales' },
  { Ic: Ico.customers, label: 'العملاء',            to: '/sales/customers' },
  { Ic: Ico.items,     label: 'المنتجات والخدمات',  to: '/inventory/items' },
  { Ic: Ico.ledger,    label: 'المحاسبة',           to: '/accounting/journal' },
  { Ic: Ico.projects,  label: 'المشاريع',           to: '/projects' },
  { Ic: Ico.help,      label: 'المساعدة',           to: '/help' },
  { Ic: Ico.settings,  label: 'الإعدادات',          to: '/settings/organization' },
]

/* اختصارات الإضافة السريعة — نفس أفعال «إضافة سريعة» عندهم */
const QUICK = [
  { Ic: Ico.invoice,   label: 'فاتورة مبيعات',  to: '/sales/invoices/new' },
  { Ic: Ico.reports,   label: 'عرض سعر',        to: '/sales/quotations' },
  { Ic: Ico.purchases, label: 'فاتورة مشتريات', to: '/purchases/bills/new' },
  { Ic: Ico.customers, label: 'عميل جديد',      to: '/sales/customers/new' },
  { Ic: Ico.items,     label: 'صنف جديد',       to: '/inventory/items/new' },
  { Ic: Ico.wallet,    label: 'سند قبض',        to: '/cash/receipts' },
]

function MoSheet({ open, onClose, title, items, nav }) {
  useEffect(() => {
    if (!open) return
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null

  return (
    <div className="mosheet__root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mosheet__scrim" onClick={onClose} />
      <div className="mosheet">
        <span className="mosheet__grip" aria-hidden="true" />
        <div className="mosheet__h">
          <b>{title}</b>
          <button className="mosheet__x" onClick={onClose} aria-label="إغلاق">
            <Ico.close size={16} />
          </button>
        </div>
        <div className="mosheet__l">
          {items.map((it) => (
            <button key={it.label} className="mosheet__i"
              onClick={() => { onClose(); nav(it.to) }}>
              <span className="mosheet__ic"><it.Ic size={19} /></span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MobileNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [add, setAdd] = useState(false)
  const [more, setMore] = useState(false)
  const on = (to) => pathname === to || pathname.startsWith(to + '/')
  const inMore = MORE.some((m) => on(m.to))

  return (
    <>
      <nav className="mobnav" data-component="MobileNav" aria-label="التنقل الرئيسي">
        {/* الكبسولة فيها الروابط بس — زرار الإضافة دايرة منفصلة
            جنبها، زي المرجع، مش مرفوع فوق الشريط. */}
        <div className="mobnav__pill">
        {MOBE.map((it) => (
          <NavLink key={it.label} to={it.to}
            className={() => 'mobnav__i' + (on(it.to) ? ' active' : '')}>
            <span className="mobnav__ic"><it.Ic size={17} /></span>
            <span className="mobnav__t">{it.label}</span>
          </NavLink>
        ))}

        <button className={'mobnav__i' + (inMore || more ? ' active' : '')}
          aria-expanded={more} onClick={() => setMore(true)}>
          <span className="mobnav__ic"><Ico.menu size={17} /></span>
          <span className="mobnav__t">المزيد</span>
        </button>
        </div>

        <button className="mobnav__add" onClick={() => setAdd(true)}
          aria-label="إضافة سريعة" title="إضافة سريعة">
          <Ico.plus size={22} />
        </button>
      </nav>

      <MoSheet open={add} onClose={() => setAdd(false)} nav={nav}
        title="إضافة سريعة" items={QUICK} />
      <MoSheet open={more} onClose={() => setMore(false)} nav={nav}
        title="المزيد" items={MORE} />
    </>
  )
}

export function AppShell({ children, search }) {
  /* ★★ حالة القايمة بتتخزّن.
     كل شاشة بترسم `<AppShell>` بتاعها، فالتنقّل بيهدّ المكوّن
     ويبنيه من أول وجديد — يعني أي حالة جوّاه بترجع لأصلها.
     ده كان بيخلّي القايمة تتفتح لوحدها بعد كل تنقّلة، والمستخدم
     اللي قافلها عن قصد يلاقيها اتفتحت من غير ما يطلب.
     التخزين بيخلّي القرار بتاعه هو اللي يعيش، مش الافتراضي. */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('nav:collapsed') === '1' } catch { return false }
  })
  const [navW, setNavW] = useState(() => {
    try { return +localStorage.getItem('nav:w') || 252 } catch { return 252 }
  })
  /* دراور الإشعارات — بيتفتح من جرس الشريط العلوي في الموبايل */
  const [notif, setNotif] = useState(false)

  /* ★ الكتابة بتحصل **من فعل المستخدم بس**، مش في `useEffect`
     بيشتغل مع كل بناء للمكوّن. الفرق مهم: الشاشة بتتبني من أول
     وجديد مع كل تنقّلة، ولو الكتابة معلّقة على البناء، أي حالة
     عابرة بتتسجّل كأنها قرار. كده اللي بيتخزّن هو اللي المستخدم
     عمله بإيده بس، والقايمة ما بتغيّرش نفسها أبدًا. */
  const applyCollapsed = (v) => {
    setCollapsed((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      if (next !== prev) { try { localStorage.setItem('nav:collapsed', next ? '1' : '0') } catch {} }
      return next
    })
  }
  const applyWidth = (w) => {
    setNavW(w)
    try { localStorage.setItem('nav:w', String(w)) } catch {}
  }
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  /* أي تنقّل بيقفل قائمة الموبايل */
  useEffect(() => { setNavOpen(false) }, [pathname])

  return (
    <div data-component="AppShell"
      style={{ '--nav-w': navW + 'px' }}
      className={`shell${collapsed ? ' collapsed' : ''}${navOpen ? ' navopen' : ''}`}>

      {/* شريط الموبايل — بيظهر تحت 900px بس */}
      {/* ★ الشريط العلوي: اللوجو على اليمين (بداية السطر في RTL)
          والجرس على الشمال. البرجر اتشال — التنقّل كله بقى من
          شريط التحت و«المزيد». */}
      <header className="mobar" data-component="MobileBar">
        <img className="mobar__logo nav__logo--light" src="/haseem-logo-ar.svg" alt="حسيم" />
        <img className="mobar__logo nav__logo--dark" src="/haseem-logo-ar-dark.svg" alt="" aria-hidden="true" />
        <button className="mobar__bell" onClick={() => setNotif(true)}
          aria-label="الإشعارات" title="الإشعارات">
          <Ico.bell size={16} />
          <span className="mobar__n num">{NOTIF_COUNT}</span>
        </button>
      </header>

      <div className="navscrim" onClick={() => setNavOpen(false)} />
      <Sidebar collapsed={collapsed} onToggle={() => applyCollapsed((c) => !c)} />

      {/* المقبض بقى ابن مباشر للشيل مش للمحتوى — عشان الزرار
          اللي راكب على الخط يقع نص في القايمة ونص في المحتوى
          من غير ما حد فيهم يقصّه */}
      <NavRail collapsed={collapsed} width={navW} onWidth={applyWidth}
        onToggle={applyCollapsed} />

      <main className="main">
        <div className="content">{children}</div>
      </main>

      <MobileNav />
      <NotificationsDrawer open={notif} onClose={() => setNotif(false)} />

      {/* طبقة الرد على الأمر — مرة واحدة للتطبيق كله */}
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

/* `back`: مسار أو دالة. لما تتبعت، بيظهر سهم رجوع **قبل اسم
   الشاشة** بدل زرار «رجوع» مدفون بين أزرار الحفظ.
   السبب: الرجوع مش أمر من أوامر المستند — هو تنقّل. ولما كان
   قاعد جنب «حفظ كمسودة» كان بياخد نفس وزنه البصري، والمستخدم
   لازم يقرا الأزرار كلها عشان يلاقي الخروج. */
export function PageHeader({ title, sub, actions, back }) {
  const nav = useNavigate()
  const goBack = () => (typeof back === 'function' ? back() : nav(back))

  return (
    <div data-component="PageHeader" className="pagehead">
      <div className="pagehead__lead">
        {back && (
          <button className="pagehead__back" onClick={goBack} aria-label="رجوع" title="رجوع">
            <Ico.back size={18} />
          </button>
        )}
        <div>
          <h1 className="pagehead__title">{title}</h1>
          {sub && <div className="pagehead__sub">{sub}</div>}
        </div>
      </div>
      <div className="pagehead__actions">{actions}</div>
    </div>
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

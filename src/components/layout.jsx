import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button, IconButton, SearchField } from './primitives.jsx'
import { Ico, Riyal } from './icons.jsx'
import { Toaster, ConfirmHost, toast } from './feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { getTheme, setTheme } from '../lib/theme.js'
import { getBrand } from '../lib/brand.js'

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
          <button className="nav__item" onClick={() => setOpen((p) => ({ ...p, [it.label]: !p[it.label] }))}>
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
        </div>
      )
    }
    if (it.to === '#') {
      /* شاشة لسه متبنيتش — بتفضل بشكلها الطبيعي، مش رمادية ولا
         معطّلة، بس بتقول الحقيقة بدل ما تسكت */
      return (
        <button key={it.label} className="nav__item" data-component="NavItem"
          onClick={() => toast.info(`${it.label} — الموديول ده لسه تحت التصميم`,
            { sub: 'المبيعات والعملاء هما الجاهزين دلوقتي' })}>
          <span className="ico"><it.Ic size={18} /></span><span className="label">{it.label}</span>
        </button>
      )
    }
    return (
      <NavLink key={it.label} to={it.to} data-component="NavItem"
        className={({ isActive }) => `nav__item${isActive ? ' active' : ''}`}>
        <span className="ico"><it.Ic size={18} /></span><span className="label">{it.label}</span>
      </NavLink>
    )
  }

  return (
    <nav data-component="Sidebar" className="nav">
      {/* ★ رأس القائمة = هوية المنشأة نفسها. ده منتج SaaS —
          العميل بيشوف شركته هو فوق، مش شعار حسيم. */}
      <div className="orgtop" data-component="OrgSwitcher">
        <span className="orgtop__id">
          <span className="orgtop__av">
            {brand.logo
              ? <img src={brand.logo} alt="" />
              : <b>{DATA.org.initials}</b>}
          </span>
          <span className="orgtop__n" title={DATA.org.nameAr}>{DATA.org.nameAr}</span>
        </span>

        <button className={`orgtop__btn${orgMenu ? ' is-open' : ''}`}
          aria-label="خيارات المنشأة" aria-expanded={orgMenu}
          onClick={(e) => { e.stopPropagation(); setOrgMenu((v) => !v) }}>
          <Ico.chevron size={16} />
        </button>

        {orgMenu && (
          <div className="omenu" data-component="OrgMenu" onClick={(e) => e.stopPropagation()}>
            <div className={`omenu__zatca${DATA.org.zatcaOk ? ' is-ok' : ''}`}>
              <i className="omenu__dot" />
              <span className="omenu__zt">{DATA.org.zatca}</span>
              <span className="omenu__zs">{DATA.org.zatcaSync}</span>
            </div>

            <div className="omenu__sep" />
            <div className="omenu__lbl">تبديل المنشأة</div>
            {DATA.orgs.map((o) => (
              <button key={o.id} className={`omenu__org${o.current ? ' is-on' : ''}`}>
                <span className="omenu__oav">
                  {o.logo ? <img src={o.logo} alt="" /> : <b>{o.initials}</b>}
                </span>
                <span className="omenu__on">{o.nameAr}</span>
                {o.current && <Ico.check size={15} className="omenu__ok" />}
              </button>
            ))}

            <div className="omenu__sep" />
            <button className="omenu__i"
              onClick={() => { setOrgMenu(false); nav('/settings/organization') }}>
              <span className="omenu__ic"><Ico.settings size={16} /></span>إعدادات المنشأة
            </button>
            <button className="omenu__i">
              <span className="omenu__ic"><Ico.plus size={16} /></span>إضافة منشأة
            </button>
          </div>
        )}
      </div>
      <div className="nav__scroll">
        {NAV.map(renderItem)}
      </div>
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

export function AppShell({ children, search }) {
  const [collapsed, setCollapsed] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  /* أي تنقّل بيقفل قائمة الموبايل */
  useEffect(() => { setNavOpen(false) }, [pathname])

  return (
    <div data-component="AppShell"
      className={`shell${collapsed ? ' collapsed' : ''}${navOpen ? ' navopen' : ''}`}>

      {/* شريط الموبايل — بيظهر تحت 900px بس */}
      <header className="mobar" data-component="MobileBar">
        <button className="mobar__burger" onClick={() => setNavOpen(true)} aria-label="القائمة">
          <span /><span /><span />
        </button>
        <img className="mobar__logo nav__logo--light" src="/haseem-logo-ar.svg" alt="حسيم" />
        <img className="mobar__logo nav__logo--dark" src="/haseem-logo-ar-dark.svg" alt="" aria-hidden="true" />
        <button className="mobar__bell" aria-label="الإشعارات"><Ico.bell size={18} /></button>
      </header>

      <div className="navscrim" onClick={() => setNavOpen(false)} />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <main className="main">
        <div className="content">{children}</div>
      </main>

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

export function PageHeader({ title, sub, actions }) {
  return (
    <div data-component="PageHeader" className="pagehead">
      <div>
        <h1 className="pagehead__title">{title}</h1>
        {sub && <div className="pagehead__sub">{sub}</div>}
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

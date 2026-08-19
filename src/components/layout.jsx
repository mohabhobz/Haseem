import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button, IconButton, SearchField } from './primitives.jsx'
import { Ico } from './icons.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { getTheme, setTheme } from '../lib/theme.js'

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
  { Ic: Ico.reports, label: 'التقارير', to: '#' },
  { Ic: Ico.items, label: 'المنتجات والخدمات', to: '#' },
  { Ic: Ico.purchases, label: 'المشتريات والمصروفات', to: '#' },
  { Ic: Ico.bank, label: 'النقد والبنوك', to: '#' },
  { Ic: Ico.ledger, label: 'المحاسبة', to: '#' },
  { Ic: Ico.settings, label: 'الإعدادات', to: '#' },
  { Ic: Ico.projects, label: 'المشاريع', to: '#' },
  { Ic: Ico.help, label: 'المساعدة', to: '#' },
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
  const [theme, setTh] = useState(getTheme)
  const [open, setOpen] = useState(() => {
    const o = {}
    NAV.forEach((it) => {
      if (it.children?.some((c) => c.to === pathname)) o[it.label] = true
    })
    return o
  })

  useEffect(() => {
    if (!menu) return
    const away = () => setMenu(false)
    document.addEventListener('click', away)
    return () => document.removeEventListener('click', away)
  }, [menu])

  const renderItem = (it) => {
    if (it.children) {
      return (
        <div key={it.label} data-component="NavGroup" className={`nav__group${open[it.label] ? ' open' : ''}`}>
          <button className="nav__item" onClick={() => setOpen((p) => ({ ...p, [it.label]: !p[it.label] }))}>
            <span className="ico"><it.Ic size={18} /></span>
            <span className="label">{it.label}</span>
            <Ico.chevron size={15} className="chev" />
          </button>
          <div className="nav__sub">
            {it.children.map((c) => (
              <NavLink key={c.label} to={c.to} data-component="NavLink"
                className={({ isActive }) => `nav__link${isActive ? ' active' : ''}`}>{c.label}</NavLink>
            ))}
          </div>
        </div>
      )
    }
    if (it.to === '#') {
      /* شاشة لسه متبنيتش — بتفضل بشكلها الطبيعي، مش رمادية ولا معطّلة */
      return (
        <button key={it.label} className="nav__item" data-component="NavItem">
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
      <div className="nav__brand">
        <img className="nav__logo nav__logo--light" src="/haseem-logo-ar.svg" alt="حسيم" />
        <img className="nav__logo nav__logo--dark" src="/haseem-logo-ar-dark.svg" alt="" aria-hidden="true" />
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
          <span className="avstack" data-component="AvatarStack">
            <span className="avstack__a avstack__a--org" title={DATA.org.nameAr}>
              <img src="/haseem-mark.svg" alt="" />
            </span>
            <span className="avstack__a avstack__a--user" title={DATA.user.nameAr}>
              {DATA.user.photo
                ? <img src={DATA.user.photo} alt="" />
                : <b>{DATA.user.initials}</b>}
            </span>
          </span>
          <span className="navprofile__t">
            <span className="navprofile__n">{DATA.org.nameAr}</span>
            <span className="navprofile__h">{DATA.user.nameAr}</span>
          </span>
          <Ico.chevron size={16} className="navprofile__chev" />
        </button>
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
    </div>
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

/* بديل صف كروت الـKPI — رقم قائد واحد وأرقام تابعة بحجم أصغر */
export function SummaryStrip({ label, value, note, items = [] }) {
  return (
    <div data-component="SummaryStrip" className="summary">
      <div className="summary__lead">
        <div className="summary__label">{label}</div>
        <div className="summary__value"><span className="num">{fmtMoney(value)}</span><span className="cur">SAR</span></div>
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

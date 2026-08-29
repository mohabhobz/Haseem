import { useState } from 'react'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { toast, confirmAction } from '../components/feedback.jsx'
import { fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الفريق والصلاحيات.

   ★ القاعدة من البورد: **الصلاحيات بتخفي الروابط في القايمة**،
   مش بتقفلها. يعني الموظف اللي مالوش صلاحية المحاسبة، القسم ده
   مش بيبان له أصلًا.

   وده بيخلق مشكلة تصميمية حقيقية: **المستخدم مش هيعرف إن فيه
   حاجة موجودة عشان يطلبها.** عشان كده في صفحة الصلاحيات هنا
   المدير بيشوف **قدام كل دور، هو شايف كام قسم من كام** — عشان
   يعرف هو بيخفي إيه لما يدّي الدور ده لحد.

   ★ وكل أكشن هنا **بيتنفّذ في مكانه**: تغيير الدور بيفتح اختيار
   بيوري الفرق قبل وبعد، والشيل بيفتح تأكيد بيقول إيه اللي هيحصل
   للمستندات، والدور المخصّص بيتبني بالأقسام قدامك. مفيش زرار
   بيقولك «روح مكان تاني وشوف».
   ============================================================ */

const MODULES = [
  { id: 'sales',   ar: 'المبيعات والعملاء' },
  { id: 'inv',     ar: 'المنتجات والمخزون' },
  { id: 'buy',     ar: 'المشتريات والمصروفات' },
  { id: 'cash',    ar: 'النقد والبنوك' },
  { id: 'acct',    ar: 'المحاسبة' },
  { id: 'prj',     ar: 'المشاريع' },
  { id: 'reports', ar: 'التقارير' },
  { id: 'set',     ar: 'الإعدادات' },
]

const ROLES0 = [
  { id: 'owner', ar: 'مالك المنشأة', note: 'كل حاجة، ومش بيتشال',
    mods: MODULES.map((m) => m.id), lock: true },
  { id: 'acct',  ar: 'محاسب', note: 'الدفتر والتقارير والمستندات',
    mods: ['sales', 'buy', 'cash', 'acct', 'reports', 'prj'] },
  { id: 'sales', ar: 'مندوب مبيعات', note: 'العملاء وفواتيرهم بس',
    mods: ['sales'] },
  { id: 'store', ar: 'أمين مستودع', note: 'الأصناف والاستلام',
    mods: ['inv', 'buy'] },
  { id: 'view',  ar: 'مشاهدة فقط', note: 'بيقرا ومش بيعدّل',
    mods: ['sales', 'buy', 'reports'] },
]

const MEMBERS0 = [
  { id: 'U1', ar: 'مهاب هاني', email: 'mohab@websquids.sa', role: 'owner',
    branch: 'كل الفروع', last: '2026-08-17', status: 'active' },
  { id: 'U2', ar: 'سعود القحطاني', email: 'saud@websquids.sa', role: 'acct',
    branch: 'كل الفروع', last: '2026-08-16', status: 'active' },
  { id: 'U3', ar: 'ريم الدوسري', email: 'reem@websquids.sa', role: 'sales',
    branch: 'الفرع الرئيسي', last: '2026-08-14', status: 'active' },
  { id: 'U4', ar: 'مها العتيبي', email: 'maha@websquids.sa', role: 'store',
    branch: 'فرع جدة', last: '2026-07-30', status: 'active' },
  { id: 'U5', ar: 'حساب المراجع الخارجي', email: 'audit@ext.sa', role: 'view',
    branch: 'كل الفروع', last: null, status: 'invited' },
]

export default function SetTeam() {
  const [roles, setRoles] = useState(ROLES0)
  const [members, setMembers] = useState(MEMBERS0)
  const [invite, setInvite] = useState(false)
  const [newRole, setNewRole] = useState(false)
  const [chRole, setChRole] = useState(null)   // العضو اللي بنغيّر دوره
  const [openRole, setOpenRole] = useState(null)

  const roleOf = (id) => roles.find((r) => r.id === id)

  /* ---------- شيل عضو ---------- */
  const remove = async (m) => {
    const ok = await confirmAction({
      title: `شيل ${m.ar} من الفريق؟`,
      body: 'الشيل بيوقف دخوله للمنشأة من دلوقتي.',
      consequences: [
        'المستندات اللي أصدرها بتفضل باسمه — الدفتر ما بيتغيّرش',
        'لو كان له دعوة مفتوحة، اللينك بيبطل',
        'تقدر تدعوه تاني بنفس الإيميل في أي وقت',
      ],
      confirm: 'شيله',
    })
    if (!ok) return
    /* API: DELETE /settings/team/members/:id */
    setMembers((p) => p.filter((x) => x.id !== m.id))
    toast.ok(`${m.ar} اتشال`, { sub: 'مستنداته زي ما هي' })
  }

  /* ---------- غيّر دور عضو ---------- */
  const applyRole = (m, rid) => {
    /* API: PUT /settings/team/members/:id → { role } */
    setMembers((p) => p.map((x) => (x.id === m.id ? { ...x, role: rid } : x)))
    setChRole(null)
    toast.ok(`${m.ar} بقى ${roleOf(rid)?.ar}`, {
      sub: `بيشوف ${roleOf(rid)?.mods.length} من ${MODULES.length} أقسام`,
    })
  }

  return (
    <SettingsShell
      title="الفريق والصلاحيات"
      sub="مين يدخل، وكل واحد بيشوف إيه"
      footer={null}>

      {/* ---------- الأعضاء ---------- */}
      <section className="fcard">
        <div className="fcard__h">
          <h2 className="fcard__t">الأعضاء <em>{members.length} أعضاء</em></h2>
          <button className="gbtn2" onClick={() => setInvite(true)}>
            <Ico.plus size={14} />دعوة عضو
          </button>
        </div>

        <ul className="tmlist">
          {members.map((m) => {
            const r = roleOf(m.role)
            return (
              <li key={m.id}>
                <span className="tmlist__av" aria-hidden="true">{m.ar.trim()[0]}</span>
                <span className="tmlist__n">
                  <b>{m.ar}</b>
                  <em className="ltr">{m.email}</em>
                </span>
                <span className="tmlist__r">
                  <b>{r?.ar}</b>
                  <em>{r?.mods.length} من {MODULES.length} أقسام</em>
                </span>
                <span className="tmlist__b">{m.branch}</span>
                <span className="tmlist__s">
                  {m.status === 'invited'
                    ? <span className="st st--info">الدعوة اتبعتت</span>
                    : <em>آخر دخول {m.last ? fmtDate(m.last) : '—'}</em>}
                </span>
                <span className="tmlist__a">
                  {r?.lock ? (
                    <em className="hint">مالك</em>
                  ) : (
                    <>
                      <button className="gbtn2" onClick={() => setChRole(m)}>الدور</button>
                      <button className="lines__x" aria-label={`شيل ${m.ar}`}
                        onClick={() => remove(m)}>
                        <Ico.close size={15} />
                      </button>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------- الأدوار ---------- */}
      <section className="fcard">
        <div className="fcard__h">
          <h2 className="fcard__t">
            الأدوار <em>الدور بيحدد الأقسام اللي بتبان في القايمة</em>
          </h2>
          <button className="gbtn2" onClick={() => setNewRole(true)}>
            <Ico.plus size={14} />دور مخصّص
          </button>
        </div>

        <ul className="rolelist">
          {roles.map((r) => {
            const on = openRole === r.id
            const used = members.filter((m) => m.role === r.id).length
            return (
              <li key={r.id}>
                <button className="rolelist__r" onClick={() => setOpenRole(on ? null : r.id)}
                  aria-expanded={on}>
                  <span className="rolelist__n">
                    <b>{r.ar}</b>
                    <em>{r.note}</em>
                  </span>
                  <span className="rolelist__c">
                    <span className="rolelist__bar" aria-hidden="true">
                      <i style={{ width: `${(r.mods.length / MODULES.length) * 100}%` }} />
                    </span>
                    <em>{r.mods.length} من {MODULES.length}</em>
                  </span>
                  <span className="rolelist__u">{used} عضو</span>
                  <Ico.chevron size={15} className={`cclist__ch${on ? ' is-on' : ''}`} />
                </button>

                {on && (
                  <div className="rolegrid">
                    {MODULES.map((mo) => {
                      const has = r.mods.includes(mo.id)
                      return (
                        <span key={mo.id} className={`rolegrid__i${has ? ' is-on' : ''}`}>
                          {has ? <Ico.check size={14} /> : <Ico.close size={14} />}
                          {mo.ar}
                        </span>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <p className="fnote fnote--warn">
          <Ico.ban size={14} />
          القسم اللي مش في الدور <b>بيختفي من القايمة</b> — ما بيبانش مقفول. يعني
          العضو مش هيعرف إنه موجود عشان يطلبه، فخلّي بالك وإنت بتختار الدور.
        </p>
      </section>

      {invite && (
        <InviteForm roles={roles} modules={MODULES} onClose={() => setInvite(false)}
          onDone={(m) => { setMembers((p) => [...p, m]); setInvite(false) }} />
      )}

      {newRole && (
        <RoleForm modules={MODULES} onClose={() => setNewRole(false)}
          onDone={(r) => {
            /* API: POST /settings/team/roles */
            setRoles((p) => [...p, r]); setNewRole(false); setOpenRole(r.id)
            toast.ok(`دور «${r.ar}» اتضاف`, {
              sub: `بيشوف ${r.mods.length} من ${MODULES.length} أقسام`,
            })
          }} />
      )}

      {chRole && (
        <RoleSwitch member={chRole} roles={roles} modules={MODULES} current={roleOf(chRole.role)}
          onClose={() => setChRole(null)} onDone={(rid) => applyRole(chRole, rid)} />
      )}
    </SettingsShell>
  )
}

/* ============================================================
   تغيير دور عضو.

   المهم مش «اختار دور» — المهم **إيه اللي هيتغيّر عنده**. عشان
   كده المودال بيوري الأقسام اللي هتتفتح والأقسام اللي هتتقفل
   مقارنة بدوره الحالي، قبل ما تدوس تأكيد.
   ============================================================ */
function RoleSwitch({ member, roles, modules, current, onClose, onDone }) {
  const [pick, setPick] = useState(member.role)
  const next = roles.find((r) => r.id === pick)

  const gained = next?.mods.filter((m) => !current?.mods.includes(m)) || []
  const lost = current?.mods.filter((m) => !next?.mods.includes(m)) || []
  const nameOf = (id) => modules.find((m) => m.id === id)?.ar

  return (
    <Modal title={`دور ${member.ar}`}
      sub={`دلوقتي: ${current?.ar} — بيشوف ${current?.mods.length} من ${modules.length} أقسام`}
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" disabled={pick === member.role}
            onClick={() => onDone(pick)}>تغيير الدور</button>
        </>
      }>
      <div className="pick">
        {roles.filter((r) => !r.lock).map((r) => (
          <button key={r.id} className={`pick__o${pick === r.id ? ' is-on' : ''}`}
            onClick={() => setPick(r.id)} aria-pressed={pick === r.id}>
            <b>{r.ar}</b><em>{r.mods.length} من {modules.length} أقسام</em>
          </button>
        ))}
      </div>

      {pick === member.role ? (
        <p className="fnote fnote--quiet">ده دوره الحالي — اختار دور تاني عشان تشوف الفرق.</p>
      ) : (
        <section className="fsub">
          <h3 className="fsub__t">
            إيه اللي هيتغيّر عنده
            <em>الأقسام دي بتظهر أو بتختفي من قايمته على طول</em>
          </h3>
          <div className="rolegrid">
            {gained.map((id) => (
              <span key={id} className="rolegrid__i is-on">
                <Ico.check size={14} />{nameOf(id)} — هيبان
              </span>
            ))}
            {lost.map((id) => (
              <span key={id} className="rolegrid__i">
                <Ico.close size={14} />{nameOf(id)} — هيختفي
              </span>
            ))}
            {gained.length === 0 && lost.length === 0 && (
              <span className="rolegrid__i">نفس الأقسام — الفرق في التسمية بس</span>
            )}
          </div>
        </section>
      )}
    </Modal>
  )
}

/* ---------- دور مخصّص ---------- */
function RoleForm({ modules, onClose, onDone }) {
  const [ar, setAr] = useState('')
  const [note, setNote] = useState('')
  const [mods, setMods] = useState([])
  const [touched, setTouched] = useState(false)

  const bad = !ar.trim() || mods.length === 0
  const flip = (id) =>
    setMods((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const save = () => {
    setTouched(true)
    if (bad) {
      toast.bad('الدور ناقص', {
        sub: !ar.trim() ? 'اكتب اسم الدور' : 'اختار قسم واحد على الأقل',
      })
      return
    }
    onDone({
      id: 'r' + Date.now().toString(36),
      ar: ar.trim(),
      note: note.trim() || `${mods.length} أقسام مختارة`,
      mods,
    })
  }

  return (
    <Modal title="دور مخصّص"
      sub="اختار الأقسام اللي الدور ده يشوفها — والباقي هيختفي من قايمته"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>إضافة الدور</button>
        </>
      }>
      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">اسم الدور</span>
          <input className={`fld__i${touched && !ar.trim() ? ' is-bad' : ''}`} value={ar}
            placeholder="مسؤول تحصيل" onChange={(e) => setAr(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">وصف مختصر <em className="fld__opt">اختياري</em></span>
          <input className="fld__i" value={note} placeholder="بيتابع الفواتير المتأخرة"
            onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      <section className="fsub">
        <h3 className="fsub__t">
          الأقسام <em>{mods.length} من {modules.length} — دوس على القسم عشان تفتحه أو تقفله</em>
        </h3>
        <div className="rolegrid">
          {modules.map((mo) => {
            const has = mods.includes(mo.id)
            return (
              <button key={mo.id} className={`rolegrid__i rolegrid__i--btn${has ? ' is-on' : ''}`}
                aria-pressed={has} onClick={() => flip(mo.id)}>
                {has ? <Ico.check size={14} /> : <Ico.close size={14} />}
                {mo.ar}
              </button>
            )
          })}
        </div>
        {touched && mods.length === 0 && (
          <p className="fnote fnote--warn"><Ico.ban size={14} />اختار قسم واحد على الأقل.</p>
        )}
      </section>
    </Modal>
  )
}

/* ---------- دعوة عضو ---------- */
function InviteForm({ roles, modules, onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('sales')
  const [branch, setBranch] = useState('all')
  const [touched, setTouched] = useState(false)

  const r = roles.find((x) => x.id === role)
  const emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const send = () => {
    setTouched(true)
    if (emailBad) { toast.bad('الإيميل مش مظبوط'); return }
    /* API: POST /settings/team/invites → { email, role, branch } */
    const name = email.trim().split('@')[0]
    onDone({
      id: 'U' + Date.now().toString(36),
      ar: name, email: email.trim(), role,
      branch: branch === 'all'
        ? 'كل الفروع'
        : DATA.branches.find((b) => b.id === branch)?.ar || 'كل الفروع',
      last: null, status: 'invited',
    })
    toast.ok('الدعوة اتبعتت', { sub: `${email.trim()} — دور ${r?.ar}` })
  }

  return (
    <Modal title="دعوة عضو جديد"
      sub="بيوصله لينك، يسجّل، وبيدخل بالدور اللي اخترته"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={send}>إرسال الدعوة</button>
        </>
      }>
      <label className="fld">
        <span className="fld__l">الإيميل</span>
        <input className={`fld__i ltr${touched && emailBad ? ' is-bad' : ''}`} type="email"
          value={email} placeholder="name@company.sa" dir="ltr"
          onChange={(e) => setEmail(e.target.value)} />
        {touched && emailBad && <em className="fld__e">اكتب إيميل صحيح</em>}
      </label>

      <div className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">الدور</span>
        <div className="pick">
          {roles.filter((x) => !x.lock).map((x) => (
            <button key={x.id} className={`pick__o${role === x.id ? ' is-on' : ''}`}
              onClick={() => setRole(x.id)} aria-pressed={role === x.id}>
              <b>{x.ar}</b><em>{x.note}</em>
            </button>
          ))}
        </div>
      </div>

      <label className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">نطاق الفروع</span>
        <select className="fld__i" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="all">كل الفروع</option>
          {DATA.branches.map((b) => <option key={b.id} value={b.id}>{b.ar}</option>)}
        </select>
        <em className="fld__h">بيشوف مستندات الفروع دي بس</em>
      </label>

      {/* اللي هيشوفه — قدامه قبل ما يبعت */}
      <section className="fsub">
        <h3 className="fsub__t">
          {r?.ar} هيشوف إيه
          <em>الأقسام اللي هتبان في قايمته — والباقي هيختفي خالص</em>
        </h3>
        <div className="rolegrid">
          {modules.map((mo) => {
            const has = r?.mods.includes(mo.id)
            return (
              <span key={mo.id} className={`rolegrid__i${has ? ' is-on' : ''}`}>
                {has ? <Ico.check size={14} /> : <Ico.close size={14} />}
                {mo.ar}
              </span>
            )
          })}
        </div>
      </section>
    </Modal>
  )
}

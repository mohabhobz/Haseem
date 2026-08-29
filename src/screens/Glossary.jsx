import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import * as H from '../data/help.js'

/* ============================================================
   مسرد المصطلحات.

   المنتج ده مليان كلام محاسبي وضريبي — «ترحيل» و«ذمم دائنة»
   و«الاحتساب العكسي» — والمستخدم مش لازم يكون محاسب.

   المسرد هنا مش قايمة تعريفات أكاديمية: كل مصطلح متشرح
   **بالمعنى اللي شغّال بيه في السيستم ده**، ومعاه رقم الحساب
   لو ليه حساب، ولينك للمقال لو فيه واحد بيشرحه بالتفصيل.
   ============================================================ */

export default function Glossary() {
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const t = q.trim()
    if (!t) return H.glossary
    return H.glossary.filter((g) => g.t.includes(t) || g.d.includes(t))
  }, [q])

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="مسرد المصطلحات"
          sub="كل مصطلح بالمعنى اللي شغّال بيه في السيستم ده" />
        <div className="tophead__ctrl">
          <SearchField placeholder="دوّر على مصطلح…" width={260} value={q} onChange={setQ} />
          <Button label="مركز المساعدة" variant="ghost" onClick={() => nav('/help')} />
        </div>
      </div>

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">المصطلحات<span className="sect__n">{rows.length}</span></h2>
        </header>

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش مصطلح بالكلمة دي</b>
            <span>جرّب كلمة تانية، أو دوّر في مركز المساعدة.</span>
          </div>
        ) : (
          <dl className="gloss">
            {rows.map((g) => (
              <div key={g.t}>
                <dt>{g.t}</dt>
                <dd>
                  {g.d}
                  {g.go && (
                    <button className="linkish" onClick={() => nav(g.go)}>
                      الشرح بالتفصيل <Ico.back size={13} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </AppShell>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { fmtDate } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as H from '../data/help.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   مركز المساعدة.

   ★ القرار اللي الشاشة كلها مبنية عليه:

   **المساعدة بتفتح على حالتك، مش على مربع بحث.**

   مركز المساعدة العادي بيفترض إن المستخدم عارف اسم مشكلته
   فيدوّر عليها. واللي بيحصل فعلًا إنه شايف بادچ أحمر على فاتورة
   ومش عارف يعمل إيه.

   عشان كده أول حاجة في الشاشة هي **«محتاج مساعدة في إيه دلوقتي»**:
   بتقرا نفس دفتر اليومية اللي التقارير بتقرا منه، وبتقول
   «عندك فاتورة مرفوضة من الهيئة» وتديك المقال **والشاشة** مع بعض.

   لو مفيش أي حاجة محتاجة انتباه، القسم ده بيختفي — مش بيتحوّل
   لرسالة تهنئة فاضية.
   ============================================================ */

const CAT_ICON = {
  zatca: Ico.rejected, docs: Ico.invoice, acct: Ico.ledger,
  cash: Ico.bank, reports: Ico.reports,
}

export default function Help() {
  const nav = useNavigate()
  const [q, setQ] = useState('')

  const alerts = useMemo(() => R.helpAlerts(), [])
  const hits = useMemo(() => {
    const t = q.trim()
    if (!t) return null
    return H.articles.filter((a) =>
      [a.t, a.lead, a.body, ...(a.steps || [])].some((x) => String(x).includes(t)))
  }, [q])

  const open = H.tickets.filter((t) => t.status !== 'done').length

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="المساعدة"
          sub="شرح مبني على السيستم ده بالذات — مش كلام عام عن المحاسبة" />
        <div className="tophead__ctrl">
          <Button label="مسرد المصطلحات" variant="ghost" onClick={() => nav('/help/glossary')} />
          <Button label="تواصل مع الدعم" variant="primary" icon="＋"
            onClick={() => nav('/help/support')} />
        </div>
      </div>

      <div className="hsearch">
        <SearchField placeholder="اكتب سؤالك… مثال: فاتورة مرفوضة · قيد عكسي · الإقرار"
          width="100%" value={q} onChange={setQ} />
      </div>

      {/* ---------- نتيجة البحث ---------- */}
      {hits && (
        <section className="sect">
          <header className="sect__h">
            <h2 className="sect__t">نتيجة البحث<span className="sect__n">{hits.length}</span></h2>
          </header>
          {hits.length === 0 ? (
            <div className="sect__empty">
              <b>مفيش مقال بالكلمة دي</b>
              <span>
                جرّب كلمة أبسط، أو ابعت للدعم — التذكرة بتروح ومعاها حالة السيستم عندك.
              </span>
            </div>
          ) : (
            <ul className="alist">
              {hits.map((a) => <ArticleRow key={a.id} a={a} nav={nav} />)}
            </ul>
          )}
        </section>
      )}

      {!hits && (
        <>
          {/* ---------- الحالة دلوقتي ---------- */}
          {alerts.length > 0 && (
            <section className="sect" data-component="HelpAlerts">
              <header className="sect__h">
                <h2 className="sect__t">
                  محتاج مساعدة في إيه دلوقتي<span className="sect__n">{alerts.length}</span>
                </h2>
                <span className="sect__note">متقري من بياناتك، مش قايمة ثابتة</span>
              </header>

              <ul className="hnow">
                {alerts.map((x) => (
                  <li key={x.id} className={`hnow__i is-${x.tone}`}>
                    <span className="hnow__d" aria-hidden="true" />
                    <span className="hnow__b">
                      <b>{x.t}</b>
                      <em>{x.d}</em>
                    </span>
                    <span className="hnow__a">
                      <button className="gbtn2" onClick={() => nav(`/help/a/${x.id}`)}>
                        إزاي أحلّها
                      </button>
                      <button className="linkish" onClick={() => nav(x.go)}>{x.goT}</button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- الأقسام ---------- */}
          <section className="sect">
            <header className="sect__h">
              <h2 className="sect__t">المواضيع</h2>
            </header>
            <div className="hcats">
              {H.categories.map((c) => {
                const list = H.articles.filter((a) => a.cat === c.id)
                const Ic = CAT_ICON[c.id] || Ico.help
                return (
                  <article key={c.id} className="hcat">
                    <header className="hcat__h">
                      <span className="hcat__ic"><Ic size={17} /></span>
                      <span className="hcat__t">
                        <b>{c.ar}</b>
                        <em>{c.note}</em>
                      </span>
                    </header>
                    <ul className="hcat__l">
                      {list.map((a) => (
                        <li key={a.id}>
                          <button onClick={() => nav(`/help/a/${a.id}`)}>
                            <span>{a.t}</span>
                            <em>{a.mins} د</em>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </section>

          {/* ---------- الدعم ---------- */}
          <section className="sect">
            <header className="sect__h">
              <h2 className="sect__t">تذاكر الدعم<span className="sect__n">{open}</span></h2>
              <div className="sect__ctrl">
                <button className="gbtn2" onClick={() => nav('/help/support')}>
                  كل التذاكر
                </button>
              </div>
            </header>
            {H.tickets.slice(0, 3).map((t) => {
              const st = H.TICKET_STATUS[t.status]
              return (
                <button key={t.no} className="tkrow" onClick={() => nav('/help/support')}>
                  <span className="tkrow__n">
                    <b>{t.subject}</b>
                    <em className="num">{t.no} · {fmtDate(t.date)}{t.ref ? ` · ${t.ref}` : ''}</em>
                  </span>
                  <span className="tkrow__s">
                    <span className={`st st--${st.tone}`}>{st.ar}</span>
                    <em>{t.last}</em>
                  </span>
                </button>
              )
            })}
          </section>
        </>
      )}
    </AppShell>
  )
}

function ArticleRow({ a, nav }) {
  const c = H.categories.find((x) => x.id === a.cat)
  return (
    <li>
      <button className="alist__r" onClick={() => nav(`/help/a/${a.id}`)}>
        <span className="alist__n">
          <b>{a.t}</b>
          <em>{a.lead}</em>
        </span>
        <span className="alist__m">
          <span className="st st--neutral">{c?.ar}</span>
          <em>{a.mins} د</em>
        </span>
      </button>
    </li>
  )
}

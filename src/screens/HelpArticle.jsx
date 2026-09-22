import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { toast } from '../components/feedback.jsx'
import * as H from '../data/help.js'

/* ============================================================
   المقال.

   تلات قواعد في الكتابة هنا:

   ١) **الخلاصة فوق.** أول سطرين بيقولوا الإجابة. اللي مستعجل
      بياخدها ويمشي، واللي عايز يفهم بيكمل.
   ٢) **الخطوات مرقّمة وأفعال.** «افتح» · «دوس» · «صحّح» — مش
      «يمكن للمستخدم أن…».
   ٣) **التحذير جنب الخطوة اللي بتخصّه**، مش في آخر الصفحة.

   وفي الآخر سؤال واحد: **ساعدك ده؟** — لو لأ، بيفتح تذكرة دعم
   ومعاها اسم المقال، فالدعم بيعرف إنت كنت بتقرا إيه.
   ============================================================ */

export default function HelpArticle() {
  const { id } = useParams()
  const nav = useNavigate()
  const [vote, setVote] = useState(null)

  const a = H.findArticle(id)

  if (!a) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>المقال ده مش موجود</b>
          <span>ارجع لمركز المساعدة ودوّر من هناك.</span>
        </div>
      </AppShell>
    )
  }

  const c = H.categories.find((x) => x.id === a.cat)
  const related = (a.see || []).map(H.findArticle).filter(Boolean)

  const say = (ok) => {
    setVote(ok)
    if (ok) toast.ok('تمام — شكرًا')
    else toast.info('هنفتحلك تذكرة دعم', { sub: 'ومعاها اسم المقال ده' })
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/help')}>
          رجوع
        </button>
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no">{a.t}</h1>
            <span className="doc__tags">
              <span className="ldg__k">{c?.ar}</span>
              <span className="st st--neutral">قراءة {a.mins} دقايق</span>
            </span>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">
          <article className="fcard art">
            <p className="art__lead">{bold(a.lead)}</p>
            <p className="art__b">{bold(a.body)}</p>

            {a.steps?.length > 0 && (
              <>
                <h2 className="art__h">الخطوات</h2>
                <ol className="art__steps">
                  {a.steps.map((s, i) => (
                    <li key={i}><span className="art__n num">{i + 1}</span><p>{bold(s)}</p></li>
                  ))}
                </ol>
              </>
            )}

            {a.notes?.length > 0 && (
              <>
                <h2 className="art__h">خلّي بالك</h2>
                <ul className="art__notes">
                  {a.notes.map((n, i) => (
                    <li key={i}><Ico.check size={14} /><p>{bold(n)}</p></li>
                  ))}
                </ul>
              </>
            )}

            <div className="art__vote">
              {vote === null ? (
                <>
                  <b>ساعدك المقال ده؟</b>
                  <button className="gbtn2" onClick={() => say(true)}>أيوه</button>
                  <button className="gbtn2" onClick={() => say(false)}>لأ</button>
                </>
              ) : vote ? (
                <b>تمام — شكرًا على الرد.</b>
              ) : (
                <>
                  <b>آسفين. ابعتلنا تذكرة والدعم هيرد.</b>
                  <button className="gbtn2" onClick={() => nav('/help/support')}>
                    افتح تذكرة
                  </button>
                </>
              )}
            </div>
          </article>
        </div>

        <aside className="rail">
          {related.length > 0 && (
            <section className="rail__c">
              <span className="rail__lbl">اقرا كمان</span>
              <div className="rail__acts">
                {related.map((r) => (
                  <button key={r.id} className="ract" onClick={() => nav(`/help/a/${r.id}`)}>
                    <Ico.help size={16} /><span className="ract__t">{r.t}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="rail__c">
            <span className="rail__lbl">مواضيع القسم</span>
            <div className="rail__acts">
              {H.articles.filter((x) => x.cat === a.cat && x.id !== a.id).map((x) => (
                <button key={x.id} className="ract" onClick={() => nav(`/help/a/${x.id}`)}>
                  <Ico.invoice size={16} /><span className="ract__t">{x.t}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">لسه محتاج مساعدة</span>
            <div className="rail__acts">
              <button className="ract" onClick={() => nav('/help/support')}>
                <Ico.send size={16} /><span className="ract__t">تواصل مع الدعم</span>
              </button>
              <button className="ract" onClick={() => nav('/help/glossary')}>
                <Ico.reports size={16} /><span className="ract__t">مسرد المصطلحات</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

/* **كده** بتتحوّل لخط عريض — عشان الكاتب يقدر يبرز كلمة من غير HTML */
function bold(s) {
  const parts = String(s).split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))
}

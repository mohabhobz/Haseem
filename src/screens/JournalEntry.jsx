import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtDate, fmtMoney, STATUS } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   القيد اليدوي — المستند.

   القاعدة اللي الشاشة كلها مبنية عليها (من البورد بالحرف):
   **القيد المُرحَّل غير قابل للتعديل، والتصحيح بقيد عكسي.**

   عشان كده الشاشة بتفرّق بوضوح بين حالتين:
   • **مسودة** — كل حاجة قابلة للتعديل، ومكتوب إنها ما دخلتش الدفتر.
   • **مُرحَّل** — الأوامر بتتحوّل لأمر واحد: «عكس بقيد مضاد»،
     والشاشة بتشرح إن القيد العكسي **بيتكتب مش بيمسح**.
   ============================================================ */

export default function JournalEntry() {
  const { no } = useParams()
  const nav = useNavigate()
  const j = useDoc('journalEntries', no)

  if (!j) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>القيد ده مش موجود</b>
          <span>يمكن يكون قيد اتولّد من مستند — دوّر عليه في قائمة القيود.</span>
        </div>
      </AppShell>
    )
  }

  const dr = DATA.entryDr(j)
  const cr = DATA.entryCr(j)
  const balanced = DATA.entryBalanced(j)
  const draft = j.status === 'draft'
  const st = STATUS[j.status]

  const acts = [
    draft && { id: 'post', label: 'ترحيل القيد', Ic: Ico.check },
    draft && { id: 'del', label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit' },
    { id: 'print', label: 'طباعة القيد', Ic: Ico.print },
    !draft && { id: 'rev', label: 'عكس بقيد مضاد', Ic: Ico.retry, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'post':  return ACT.postJournal(j, fmtMoney(dr), balanced)
      case 'del':   return ACT.deleteJournal(j).then((ok) => ok && nav('/accounting/journal'))
      case 'print': return ACT.printDoc()
      case 'rev':   return ACT.reverseJournal(j)
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/accounting/journal')}>
          <Ico.back size={16} />قيود اليومية
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no num">{j.no}</h1>
            <span className="doc__tags">
              <span className="ldg__k">قيد يدوي</span>
              <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
              <span className={`chkb${balanced ? ' is-ok' : ' is-bad'}`}>
                {balanced ? <Ico.check size={13} /> : <Ico.close size={13} />}
                {balanced ? 'متوازن' : `فرق ${fmtMoney(Math.abs(dr - cr))}`}
              </span>
            </span>
            <span className="dochead__sub">{j.memo}</span>
          </div>
          <div className="dochead__act">
            {draft ? (
              <button className="btn btn--primary" onClick={() => run('post')}>
                <Ico.check size={16} />ترحيل القيد
              </button>
            ) : (
              <button className="btn btn--outline" onClick={() => run('print')}>
                <Ico.print size={16} />طباعة القيد
              </button>
            )}
          </div>
        </div>
      </div>

      {draft ? (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          مسودة — لسه ما دخلتش الدفتر، فمفيش رصيد اتغيّر. تقدر تعدّلها زي ما إنت عايز.
        </p>
      ) : (
        <p className="fnote fnote--quiet" style={{ marginBottom: 14 }}>
          القيد اترحّل يوم {fmtDate(j.date)} و<b>مينفعش يتعدّل</b>. لو فيه غلط،
          الطريقة الوحيدة قيد عكسي بيتكتب جنبه — الاتنين بيفضلوا في السجل.
        </p>
      )}

      <div className="docgrid">
        <div className="form">
          <section className="fcard">
            <h2 className="fcard__t">
              أطراف القيد <em>{(j.lines || []).length} أطراف</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}>#</th>
                    <th>الحساب</th>
                    <th style={{ width: '180px' }}>مركز التكلفة</th>
                    <th style={{ width: '138px' }} className="n">مدين</th>
                    <th style={{ width: '138px' }} className="n">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {(j.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td className="num">{i + 1}</td>
                      <td>
                        <button className="cell-doc cell-doc--link"
                          onClick={() => nav(`/accounting/ledger?acc=${l.acc}`)}>
                          {DATA.accName(l.acc)}
                        </button>
                        {l.note && <em className="hint" style={{ display: 'block' }}>{l.note}</em>}
                      </td>
                      <td>
                        {l.cc
                          ? <button className="cell-doc cell-doc--link"
                              onClick={() => nav('/accounting/cost-centers')}>
                              {DATA.ccOf(l.cc)?.ar}
                            </button>
                          : <em className="hint">—</em>}
                      </td>
                      <td className="n">{l.dr ? <SAR v={l.dr} dec /> : <em className="hint">—</em>}</td>
                      <td className="n">{l.cr ? <SAR v={l.cr} dec /> : <em className="hint">—</em>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><b>الإجمالي</b></td>
                    <td className="n"><b><SAR v={dr} dec /></b></td>
                    <td className="n"><b><SAR v={cr} dec /></b></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {!balanced && (
              <p className="fnote fnote--warn">
                <Ico.close size={14} />
                القيد مش متوازن — فرق <b>{fmtMoney(Math.abs(dr - cr))}</b> ر.س.
                الترحيل هيترفض لحد ما الطرفين يتساووا.
              </p>
            )}
          </section>

          <section className="fcard">
            <h2 className="fcard__t">الأثر <em>الحسابات اللي بتتغيّر</em></h2>
            <ul className="efflist">
              {(j.lines || []).map((l, i) => {
                const a = DATA.accountOf(l.acc)
                const up = (l.dr > 0) === ['asset', 'expense', 'cogs'].includes(a?.type)
                return (
                  <li key={i}>
                    <span className="efflist__k">{DATA.accName(l.acc)}</span>
                    <span className="efflist__v">
                      {up ? 'بيزيد' : 'بيقلّ'} بـ<b><SAR v={l.dr || l.cr} /></b>
                      {draft && <em className="hint"> — لسه ما اتقيّدش</em>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">قيمة القيد</span>
            <div className="rail__v"><SAR v={dr} dec /></div>
            <span className="rail__due">
              {draft ? 'مسودة — ما أثّرتش في الدفتر' : `اتقيّد ${fmtDate(j.date)}`}
            </span>
            <dl className="rail__sum">
              <div><dt>مجموع المدين</dt><dd><SAR v={dr} dec /></dd></div>
              <div><dt>مجموع الدائن</dt><dd><SAR v={cr} dec /></dd></div>
              <div><dt>الفرق</dt><dd><SAR v={+(dr - cr).toFixed(2)} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات القيد</span>
            <dl className="deflist">
              <div><dt>الرقم</dt><dd className="num">{j.no}</dd></div>
              <div><dt>التاريخ</dt><dd>{fmtDate(j.date)}</dd></div>
              <div><dt>المرجع</dt><dd>{j.ref || <em className="hint">—</em>}</dd></div>
              <div><dt>عدد الأطراف</dt><dd className="num">{(j.lines || []).length}</dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {acts.map((a) => (
                <button key={a.id} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  onClick={() => run(a.id)}>
                  <a.Ic size={16} /><span className="ract__t">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

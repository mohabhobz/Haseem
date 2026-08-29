import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow, FinRow, FinBlock } from '../components/reportshell.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, fmtDate, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الميزانية العمومية.

   عند العميل الشكل العام صح — «حتى تاريخ» بدل فترة، وبادچ
   «الميزانية متوازنة». اللي فيها:
   • **`CURRENT_EARNINGS`** — كود إنم خام معروض في خانة رقم الحساب
   • **مفيش تقسيم متداول / غير متداول**

   التقسيم عندنا بيتحدد من الحساب نفسه (`nc` في الشجرة). ولأن
   الشجرة الحالية كلها متداولة، الشاشة **بتقول كده صراحة** بدل
   ما تسيب المستخدم يفترض إن القسم التاني اتنسي.

   وزوّدنا حاجة مش موجودة عنده: **المعادلة نفسها معروضة**
   (أصول = التزامات + حقوق ملكية) عشان التوازن يبقى مفهوم مش
   مجرد بادچ أخضر.
   ============================================================ */

const iso = (d) => d.toISOString().slice(0, 10)

export default function RepBalanceSheet() {
  const nav = useNavigate()
  const [asOf, setAsOf] = useState(iso(TODAY))

  const bs = useMemo(() => R.balanceSheet(asOf), [asOf])
  const label = (a) => DATA.accLabel(a) || a.ar

  const goOf = (id) => `/reports/statement?acc=${id}&to=${asOf}`

  return (
    <ReportShell
      title="الميزانية العمومية"
      sub={`مركز المنشأة المالي في ${fmtDate(asOf)}`}
      asOf={asOf} onAsOf={setAsOf} pdf
      note="لقطة لحظية مش فترة — بتقول المنشأة عندها إيه وعليها إيه في التاريخ ده بالظبط."
    >
      <KpiRow items={[
        { id: 'a', lead: true, label: 'إجمالي الأصول', value: bs.totalAssets, dec: true,
          sub: bs.assetsNC.length
            ? `${bs.assetsCur.length} متداول · ${bs.assetsNC.length} غير متداول`
            : `${bs.assets.length} حساب — كلها متداولة` },
        { id: 'l', label: 'إجمالي الالتزامات', value: bs.totalLiabs, dec: true,
          sub: 'اللي على المنشأة' },
        { id: 'e', label: 'حقوق الملكية', value: bs.totalEquity, dec: true,
          sub: 'رأس المال + النتيجة' },
        { id: 'n', label: 'صافي الأصول', value: +(bs.totalAssets - bs.totalLiabs).toFixed(2),
          dec: true, sub: 'الأصول ناقص الالتزامات' },
      ]} />

      {/* ★ المعادلة معروضة — التوازن مفهوم مش بادچ بس */}
      <div className={`eqbar${bs.balanced ? ' is-ok' : ' is-bad'}`}>
        <span className="eqbar__p">
          <em>الأصول</em><b>{fmtMoney(bs.totalAssets)}</b>
        </span>
        <span className="eqbar__op">=</span>
        <span className="eqbar__p">
          <em>الالتزامات</em><b>{fmtMoney(bs.totalLiabs)}</b>
        </span>
        <span className="eqbar__op">+</span>
        <span className="eqbar__p">
          <em>حقوق الملكية</em><b>{fmtMoney(bs.totalEquity)}</b>
        </span>
        <span className={`chkb${bs.balanced ? ' is-ok' : ' is-bad'}`}>
          {bs.balanced ? <Ico.check size={14} /> : <Ico.close size={14} />}
          {bs.balanced ? 'متوازنة' : `فرق ${fmtMoney(bs.diff)}`}
        </span>
      </div>

      <div className="repcols">
        <section className="sect">
          <header className="sect__h"><h2 className="sect__t">الأصول</h2></header>
          <div className="finsheet">
            <FinBlock title="أصول متداولة" hint="نقد وأرصدة بتتحوّل نقد خلال سنة">
              {bs.assetsCur.map((a) => (
                <FinRow key={a.id} code={a.id} label={label(a)} value={a.amount}
                  level={1} go={goOf(a.id)} />
              ))}
              <FinRow label="إجمالي الأصول المتداولة" value={bs.totalAssetsCur} kind="sub" />
            </FinBlock>

            <FinBlock title="أصول غير متداولة" hint="أصول ثابتة وطويلة الأجل">
              {bs.assetsNC.length === 0
                ? <p className="fempty">
                    مفيش أصول غير متداولة في شجرة الحسابات الحالية — أول ما يتضاف
                    أصل ثابت (أثاث · سيارات · أجهزة) هيبان هنا بمجمّع إهلاكه.
                  </p>
                : bs.assetsNC.map((a) => (
                  <FinRow key={a.id} code={a.id} label={label(a)} value={a.amount}
                    level={1} go={goOf(a.id)} />
                ))}
              {bs.assetsNC.length > 0 && (
                <FinRow label="إجمالي الأصول غير المتداولة" value={bs.totalAssetsNC} kind="sub" />
              )}
            </FinBlock>

            <FinBlock>
              <FinRow label="إجمالي الأصول" value={bs.totalAssets} kind="total" />
            </FinBlock>
          </div>
        </section>

        <section className="sect">
          <header className="sect__h"><h2 className="sect__t">الالتزامات وحقوق الملكية</h2></header>
          <div className="finsheet">
            <FinBlock title="التزامات متداولة" hint="مستحقة خلال سنة">
              {bs.liabsCur.length === 0
                ? <p className="fempty">مفيش التزامات متداولة في التاريخ ده.</p>
                : bs.liabsCur.map((a) => (
                  <FinRow key={a.id} code={a.id} label={label(a)} value={a.amount}
                    level={1} go={goOf(a.id)} />
                ))}
              <FinRow label="إجمالي الالتزامات المتداولة" value={bs.totalLiabsCur} kind="sub" />
            </FinBlock>

            {bs.liabsNC.length > 0 && (
              <FinBlock title="التزامات غير متداولة" hint="مستحقة بعد أكتر من سنة">
                {bs.liabsNC.map((a) => (
                  <FinRow key={a.id} code={a.id} label={label(a)} value={a.amount}
                    level={1} go={goOf(a.id)} />
                ))}
                <FinRow label="إجمالي الالتزامات غير المتداولة" value={bs.totalLiabsNC} kind="sub" />
              </FinBlock>
            )}

            <FinBlock title="حقوق الملكية" hint="اللي للملاك بعد سداد كل الالتزامات">
              {bs.equity.map((a) => (
                <FinRow key={a.id} code={a.computed ? null : a.id}
                  label={a.computed ? a.ar : label(a)} value={a.amount} level={1}
                  note={a.computed ? 'محسوبة من قائمة الدخل — مش حساب في الشجرة' : null}
                  go={a.computed ? '/reports/income-statement' : goOf(a.id)} />
              ))}
              <FinRow label="إجمالي حقوق الملكية" value={bs.totalEquity} kind="sub" />
            </FinBlock>

            <FinBlock>
              <FinRow label="إجمالي الالتزامات وحقوق الملكية"
                value={+(bs.totalLiabs + bs.totalEquity).toFixed(2)} kind="total" />
            </FinBlock>
          </div>
        </section>
      </div>
    </ReportShell>
  )
}

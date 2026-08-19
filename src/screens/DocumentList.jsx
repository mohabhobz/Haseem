import { useState } from 'react'
import { AppShell, PageHeader, Tabs, FilterBar, Panel, SummaryStrip, StateSwitcher } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, EmptyState, SkeletonRows, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'

/* الهيكل المشترك لكل شاشات القوائم — نفس النمط بيتكرر في ~12 شاشة،
   فبيتبني مرة واحدة هنا وكل شاشة بتمرّر إعداداتها فقط. */
export default function DocumentList({
  title, sub, primaryAction, secondaryAction, summary, tabs, filters,
  searchPlaceholder, columns, rows, bulkActions, pagination, empty, note,
}) {
  const [state, setState] = useState('normal')
  const [tab, setTab] = useState(tabs?.[0]?.id)
  const { selected, toggle, selectAll, clear } = useSelection()
  const keys = rows.map((r, i) => r.key ?? i)

  let body
  if (state === 'loading') body = <SkeletonRows count={7} />
  else if (state === 'empty') body = <EmptyState {...empty} />
  else body = (
    <>
      <DataTable columns={columns} rows={rows} selected={selected}
        onSelect={toggle} onSelectAll={(on) => selectAll(on, keys)} />
      {pagination && <Pagination {...pagination} />}
    </>
  )

  return (
    <AppShell search={searchPlaceholder}>
      <PageHeader title={title} sub={sub}
        actions={<>{secondaryAction}{primaryAction}</>} />
      {note}
      {summary && <SummaryStrip {...summary} />}
      {tabs && <Tabs items={tabs} value={tab} onChange={setTab} />}
      <FilterBar filters={filters} extra={<SearchField placeholder={searchPlaceholder} width={250} />} />
      <Panel flush>{body}</Panel>
      <BulkActionBar count={selected.size} actions={bulkActions} onClear={clear} />
      <StateSwitcher value={state} onChange={setState} />
    </AppShell>
  )
}

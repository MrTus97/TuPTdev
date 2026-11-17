import clsx from 'clsx'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FileIcon } from './FileIcon'
import { getEntries, type ExplorerEntry } from './files'
import { PanelHeader } from './Explorer'
import { useWorkbench } from './Workbench'

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  let i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-vsc-match text-inherit">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  )
}

/** The match line under a result: a window of text around the first hit. */
function snippetAround(text: string, query: string, radius = 40) {
  let i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return null
  let start = Math.max(0, i - radius)
  return (start > 0 ? '…' : '') + text.slice(start, i + query.length + radius)
}

/** Search view (Ctrl+Shift+F): full-text over titles, summaries and tags of posts and snippets. */
export function SearchView() {
  let { locale } = useRouter()
  let { sideView, sidebarOpen, activePath, closeDrawer } = useWorkbench()
  let [query, setQuery] = useState('')
  let [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  let input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sideView === 'search' && sidebarOpen) input.current?.focus()
  }, [sideView, sidebarOpen])

  let results = useMemo(() => {
    let q = query.trim().toLowerCase()
    if (!q) return []
    let { blog, snippets } = getEntries(locale)
    let match = (section: string) => (e: ExplorerEntry) => {
      let haystack = [e.title, e.summary, e.fileName, ...e.tags].join(' ').toLowerCase()
      return haystack.includes(q) ? [{ section, entry: e }] : []
    }
    return [...blog.flatMap(match('blog')), ...snippets.flatMap(match('snippets'))]
  }, [query, locale])

  let q = query.trim()
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Search" />
      <div className="px-3 pb-2">
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search posts and snippets"
          className="h-[26px] w-full rounded-sm border border-vsc-input-border bg-vsc-input px-1.5 text-[13px] text-vsc-editor-fg placeholder:text-vsc-muted focus:border-vsc-focus focus:outline-none focus:ring-0"
        />
      </div>
      {q && (
        <p className="px-5 pb-1 text-[12px] text-vsc-muted">
          {results.length
            ? `${results.length} result${results.length > 1 ? 's' : ''} in ${results.length} file${results.length > 1 ? 's' : ''}`
            : 'No results found.'}
        </p>
      )}
      <ul className="vsc-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        {results.map(({ section, entry }) => {
          let path = `/${section}/${entry.slug}/`
          let key = path
          let open = !collapsed[key]
          let line =
            snippetAround(entry.title, q) ||
            snippetAround(entry.summary, q) ||
            snippetAround(entry.tags.join(', '), q) ||
            entry.title
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                className="flex h-[22px] w-full items-center gap-1 pl-2 pr-2 text-[13px] text-vsc-sidebar-fg hover:bg-vsc-hover"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className={clsx('shrink-0', open && 'rotate-90')}
                />
                <FileIcon kind={entry.fileName.endsWith('.md') ? 'md' : 'mdx'} />
                <span className="truncate">{entry.fileName}</span>
                <span className="ml-1 shrink-0 truncate text-[12px] text-vsc-muted">{section}</span>
              </button>
              {open && (
                <NextLink
                  href={path}
                  onClick={closeDrawer}
                  className={clsx(
                    'block truncate py-0.5 pl-11 pr-2 text-[13px] text-vsc-sidebar-fg hover:bg-vsc-hover',
                    activePath === path && 'bg-vsc-selected'
                  )}
                  title={entry.title}
                >
                  <Highlight text={line} query={q} />
                </NextLink>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

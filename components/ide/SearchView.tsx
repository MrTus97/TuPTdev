import clsx from 'clsx'
import { useRouter } from 'next/router'
import { CaseSensitive, ChevronRight, ListCollapse, Regex, WholeWord } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PanelHeader } from './Explorer'
import { FileIcon } from './FileIcon'
import {
  buildRegex,
  loadSearchIndex,
  MAX_RESULTS,
  revealWhenReady,
  searchDocuments,
  type LineMatch,
  type SearchDocument,
  type SearchOptions,
} from './search'
import { rememberZoom, restoreZoom } from './keyboard'
import { useWorkbench } from './Workbench'

// Kept across view switches (the view unmounts when another side bar view is shown)
let saved = {
  query: '',
  options: { matchCase: false, wholeWord: false, regex: false } as SearchOptions,
}

function Toggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'flex h-5 w-5 items-center justify-center rounded-sm border',
        active
          ? 'border-vsc-focus bg-vsc-selected text-vsc-tab-active-fg'
          : 'border-transparent text-vsc-sidebar-fg hover:bg-vsc-hover'
      )}
    >
      {children}
    </button>
  )
}

/** The match line, trimmed so the first match is visible, with every match highlighted. */
function MatchLine({ match }: { match: LineMatch }) {
  let lead = 26
  let offset = Math.max(0, match.ranges[0][0] - lead)
  let text = match.text
  let parts: ReactNode[] = []
  let cursor = offset
  for (let [s, e] of match.ranges) {
    if (e <= offset) continue
    let from = Math.max(s, offset)
    parts.push(text.slice(cursor, from))
    parts.push(
      <mark key={s} className="rounded-sm bg-vsc-match text-inherit">
        {text.slice(from, e)}
      </mark>
    )
    cursor = e
  }
  parts.push(text.slice(cursor, cursor + 300))
  return (
    <>
      {offset > 0 && '…'}
      {parts}
    </>
  )
}

/**
 * Search view (Ctrl+Shift+F): full-text search over every post, snippet and the resume, with
 * VS Code's options (match case, whole word, regex). Clicking a match opens the page and
 * scrolls to / highlights it.
 */
export function SearchView() {
  let router = useRouter()
  let locale = router.locale
  let { sideView, sidebarOpen, drawerOpen, activePath, closeDrawer } = useWorkbench()
  let [query, setQuery] = useState(saved.query)
  let [debounced, setDebounced] = useState(saved.query)
  let [options, setOptions] = useState(saved.options)
  let [docs, setDocs] = useState<SearchDocument[] | null>(null)
  let [loadError, setLoadError] = useState(false)
  let [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  let [selected, setSelected] = useState<string | null>(null)
  let input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sideView === 'search' && (sidebarOpen || drawerOpen)) input.current?.select()
  }, [sideView, sidebarOpen, drawerOpen])

  useEffect(() => {
    let cancelled = false
    setDocs(null)
    setLoadError(false)
    loadSearchIndex(locale)
      .then((d) => !cancelled && setDocs(d))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    saved = { query, options }
    let timer = setTimeout(() => setDebounced(query), 150)
    return () => clearTimeout(timer)
  }, [query, options])

  let regex = useMemo(() => {
    if (!debounced) return { re: null, error: null }
    try {
      return { re: buildRegex(debounced, options), error: null }
    } catch (e) {
      // "Invalid regular expression: /<our wrapped pattern>/giu: Unterminated group" → the reason
      let reason = (e as Error).message.replace(/^Invalid regular expression: \/.*\/[a-z]*: /, '')
      return { re: null, error: `Invalid regular expression: ${reason}` }
    }
  }, [debounced, options])

  let result = useMemo(
    () => (docs && regex.re ? searchDocuments(docs, regex.re) : null),
    [docs, regex.re]
  )

  let toggle = (key: keyof SearchOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }))

  async function open(doc: SearchDocument, match: LineMatch) {
    setSelected(`${doc.path}:${match.line}`)
    let [from, to] = match.ranges[0]
    let target = { re: regex.re, ordinal: match.ordinal, line: match.text, from, to }
    if (doc.path === activePath) {
      revealWhenReady(target) // retries if a folded code block has to be unfolded first
      closeDrawer()
      return
    }
    await router.push(doc.path)
    revealWhenReady(target)
  }

  let allCollapsed = result?.files.every((f) => collapsed[f.doc.path])

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Search">
        {result && result.files.length > 0 && (
          <button
            type="button"
            title={allCollapsed ? 'Expand All' : 'Collapse All'}
            aria-label={allCollapsed ? 'Expand all' : 'Collapse all'}
            onClick={() =>
              setCollapsed(
                allCollapsed ? {} : Object.fromEntries(result.files.map((f) => [f.doc.path, true]))
              )
            }
            className="rounded p-0.5 hover:bg-vsc-hover"
          >
            <ListCollapse size={16} strokeWidth={1.5} />
          </button>
        )}
      </PanelHeader>
      <div className="px-3 pb-2">
        <div
          className={clsx(
            'flex h-[26px] items-center rounded-sm border bg-vsc-input pr-0.5 focus-within:border-vsc-focus',
            regex.error ? 'border-red-500' : 'border-vsc-input-border'
          )}
        >
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={rememberZoom}
            onBlur={restoreZoom}
            enterKeyHint="search"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setDebounced(query)
                // Mobile "Search" key: hide the keyboard to show the results (blur zooms back out)
                if (window.matchMedia('(pointer: coarse)').matches) e.currentTarget.blur()
              }
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Search"
            aria-label="Search the content of posts, snippets and the resume"
            spellCheck={false}
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-1.5 text-base text-vsc-editor-fg placeholder:text-vsc-muted focus:outline-none focus:ring-0 md:text-[13px]"
          />
          <div className="flex items-center gap-0.5">
            <Toggle
              label="Match Case"
              active={options.matchCase}
              onClick={() => toggle('matchCase')}
            >
              <CaseSensitive size={16} strokeWidth={1.5} />
            </Toggle>
            <Toggle
              label="Match Whole Word"
              active={options.wholeWord}
              onClick={() => toggle('wholeWord')}
            >
              <WholeWord size={16} strokeWidth={1.5} />
            </Toggle>
            <Toggle
              label="Use Regular Expression"
              active={options.regex}
              onClick={() => toggle('regex')}
            >
              <Regex size={14} strokeWidth={1.75} />
            </Toggle>
          </div>
        </div>
        {regex.error && <p className="mt-1 text-[12px] text-red-500">{regex.error}</p>}
      </div>

      {debounced && !regex.error && (
        <p className="px-5 pb-1 text-[12px] text-vsc-muted" role="status">
          {loadError
            ? 'Could not load the search index.'
            : !result
              ? 'Searching…'
              : result.total === 0
                ? 'No results found.'
                : `${result.truncated ? `${MAX_RESULTS}+` : result.total} result${result.total > 1 ? 's' : ''} in ${result.files.length} file${result.files.length > 1 ? 's' : ''}`}
        </p>
      )}

      <ul className="vsc-scroll min-h-0 flex-1 overflow-y-auto pb-2 font-ui">
        {result?.files.map(({ doc, matches, count }) => {
          let open_ = !collapsed[doc.path]
          let dirs = doc.file.split('/').slice(0, -1).join('/')
          let name = doc.file.split('/').pop()
          return (
            <li key={doc.path}>
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [doc.path]: !c[doc.path] }))}
                aria-expanded={open_}
                title={doc.title}
                className="flex h-[22px] w-full items-center gap-1 pl-2 pr-2 text-[13px] text-vsc-sidebar-fg hover:bg-vsc-hover"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className={clsx('shrink-0', open_ && 'rotate-90')}
                />
                <FileIcon kind={name.endsWith('.mdx') ? 'mdx' : 'md'} />
                <span className="truncate">{name}</span>
                {dirs && (
                  <span className="shrink-0 truncate text-[12px] text-vsc-muted">{dirs}</span>
                )}
                <span className="ml-auto shrink-0 rounded-full bg-vsc-hover px-1.5 text-[11px] leading-4">
                  {count}
                </span>
              </button>
              {open_ && (
                <ul>
                  {matches.map((match) => {
                    let key = `${doc.path}:${match.line}`
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => open(doc, match)}
                          className={clsx(
                            'block w-full truncate py-0.5 pl-11 pr-2 text-left text-[13px] text-vsc-sidebar-fg hover:bg-vsc-hover',
                            selected === key && '!bg-vsc-selected text-vsc-tab-active-fg'
                          )}
                        >
                          <MatchLine match={match} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

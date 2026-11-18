import clsx from 'clsx'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useUiMode } from '~/components/UiMode'
import { useLocale } from '~/hooks/useLocale'
import { FileIcon } from './FileIcon'
import { buildTree, describePath, flattenFiles, type FileKind } from './files'
import { scrollEditorTo } from './scroll'
import { rememberZoom, restoreZoom } from './keyboard'
import { useWorkbench } from './Workbench'

interface Item {
  id: string
  label: string
  detail?: string
  kind?: FileKind
  keybinding?: string
  run: () => void
}

/** Rank: name prefix > name substring > title/tags/folder substring > subsequence of the name. */
function score(item: Item, q: string) {
  let name = item.label.toLowerCase()
  let rest = (item.detail || '').toLowerCase()
  if (!q) return 1
  if (name.startsWith(q)) return 4
  if (name.includes(q)) return 3
  if (rest.includes(q)) return 2
  let i = 0
  for (let ch of name) if (ch === q[i]) i++
  return i === q.length ? 1 : 0
}

export function QuickOpen() {
  let router = useRouter()
  let { quickOpen, setQuickOpen, tabs, closeTab, activePath, showView, toggleSidebar } =
    useWorkbench()
  let { resolvedTheme, setTheme } = useTheme()
  let { setMode } = useUiMode()
  let [, localeCodes, updateLocale] = useLocale()
  let [query, setQuery] = useState('')
  let [selected, setSelected] = useState(0)
  let input = useRef<HTMLInputElement>(null)
  let list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (quickOpen === null) return
    setQuery(quickOpen)
    setSelected(0)
    // Synchronously after mount: the focus moves from the keyboard proxy (./keyboard) to the
    // input, so the mobile keyboard that opened on the tap stays open
    input.current?.focus()
  }, [quickOpen])

  let close = () => {
    restoreZoom()
    setQuickOpen(null)
  }
  let commandMode = query.startsWith('>')

  let files = useMemo<Item[]>(() => {
    let all = flattenFiles(buildTree(router.locale))
    // Recently opened tabs first, like VS Code's "recently opened" section
    let recent = [...tabs].reverse().filter((p) => p !== activePath)
    let byPath = new Map(all.map((f) => [f.path, f]))
    let ordered = [
      ...recent.map((p) => byPath.get(p)).filter(Boolean),
      ...all.filter((f) => !recent.includes(f.path)),
    ]
    // Open tabs that aren't in the tree (tag pages, pagination) are still listed
    for (let p of recent) {
      if (!byPath.has(p)) {
        let info = describePath(p, router.locale)
        ordered.push({
          type: 'file',
          name: info.name,
          path: p,
          kind: info.kind,
          title: info.title,
          dir: info.crumbs.slice(0, -1).join('/'),
        })
      }
    }
    return ordered.map((f) => ({
      id: f.path,
      label: f.name,
      kind: f.kind,
      detail: [f.dir, f.title, ...(f.tags || [])].filter(Boolean).join(' · '),
      run: () => (f.external ? window.open(f.path, '_blank', 'noopener') : router.push(f.path)),
    }))
  }, [router, tabs, activePath])

  let commands = useMemo<Item[]>(() => {
    let isDark = resolvedTheme === 'dark'
    return [
      {
        id: 'ui-mode',
        label: 'View: Switch to the Classic (User) Interface',
        run: () => setMode('user'),
      },
      {
        id: 'theme',
        label: `Preferences: Color Theme → ${isDark ? 'Light+' : 'Dark+'}`,
        run: () => setTheme(isDark ? 'light' : 'dark'),
      },
      ...localeCodes
        .filter((code) => code !== router.locale)
        .map((code) => ({
          id: `lang-${code}`,
          label: `Configure Display Language → ${code.toUpperCase()}`,
          run: () => updateLocale(code),
        })),
      {
        id: 'sidebar',
        label: 'View: Toggle Primary Side Bar Visibility',
        keybinding: 'Ctrl+B',
        run: toggleSidebar,
      },
      {
        id: 'explorer',
        label: 'View: Show Explorer',
        keybinding: 'Ctrl+Shift+E',
        run: () => showView('explorer'),
      },
      {
        id: 'search',
        label: 'View: Show Search',
        keybinding: 'Ctrl+Shift+F',
        run: () => showView('search'),
      },
      {
        id: 'projects',
        label: 'View: Show Side Projects',
        run: () => showView('projects'),
      },
      {
        id: 'close',
        label: 'View: Close Editor',
        keybinding: 'Alt+W',
        run: () => closeTab(activePath),
      },
      { id: 'top', label: 'Go to Top', run: () => scrollEditorTo(0) },
      {
        id: 'rss',
        label: 'Open RSS Feed',
        run: () => window.open('/feed.xml', '_blank', 'noopener'),
      },
    ].map((c) => ({ ...c, detail: '' }))
  }, [
    setMode,
    resolvedTheme,
    setTheme,
    localeCodes,
    router.locale,
    updateLocale,
    toggleSidebar,
    showView,
    closeTab,
    activePath,
  ])

  let results = useMemo(() => {
    let q = (commandMode ? query.slice(1) : query).trim().toLowerCase()
    let source = commandMode ? commands : files
    return source
      .map((item, i) => ({ item, s: score(item, q), i }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .slice(0, 50)
      .map((r) => r.item)
  }, [query, commandMode, commands, files])

  useEffect(() => setSelected(0), [query])
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (quickOpen === null) return null

  let pick = (item: Item) => {
    close()
    item.run()
  }

  // Keyboard handling lives on the input (combobox pattern); mouse handlers are conveniences
  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
  return (
    <div className="fixed inset-0 z-[70]" onMouseDown={close}>
      <div
        role="dialog"
        aria-label={commandMode ? 'Command palette' : 'Go to file'}
        onMouseDown={(e) => e.stopPropagation()}
        className="mx-auto mt-[42px] w-[calc(100%-16px)] max-w-[600px] overflow-hidden rounded-md border border-vsc-border bg-vsc-widget font-ui text-[13px] text-vsc-sidebar-fg shadow-[0_0_8px_2px_rgba(0,0,0,0.36)]"
      >
        <div className="p-1.5">
          <input
            role="combobox"
            aria-expanded="true"
            aria-activedescendant={results[selected] ? `qo-${selected}` : undefined}
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={commandMode ? '' : 'Search files by name (append > for commands)'}
            aria-label="Quick open"
            aria-controls="quick-open-list"
            className="h-[26px] w-full rounded-sm border border-vsc-focus bg-vsc-input px-1.5 text-base text-vsc-editor-fg placeholder:text-vsc-muted focus:border-vsc-focus focus:outline-none focus:ring-0 md:text-[13px]"
            onFocus={rememberZoom}
            onBlur={restoreZoom}
            enterKeyHint="go"
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.min(results.length - 1, s + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(0, s - 1))
              } else if (e.key === 'Enter' && results[selected]) {
                e.preventDefault()
                pick(results[selected])
              }
            }}
          />
        </div>
        <ul
          id="quick-open-list"
          ref={list}
          role="listbox"
          className="vsc-scroll max-h-[min(60vh,440px)] overflow-y-auto pb-1"
        >
          {results.length === 0 && (
            <li className="px-3 py-1 text-vsc-muted">
              {commandMode ? 'No matching commands' : 'No matching results'}
            </li>
          )}
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`qo-${i}`}
              role="option"
              aria-selected={i === selected}
              onMouseMove={() => setSelected(i)}
              onClick={() => pick(item)}
              className={clsx(
                'mx-1 flex h-[22px] cursor-pointer items-center gap-1.5 rounded-sm px-2',
                i === selected && 'bg-vsc-focus text-white'
              )}
            >
              {item.kind && <FileIcon kind={item.kind} />}
              <span className="shrink-0">{item.label}</span>
              {item.detail && (
                <span
                  className={clsx(
                    'truncate text-[12px]',
                    i === selected ? 'text-white/70' : 'text-vsc-muted'
                  )}
                >
                  {item.detail}
                </span>
              )}
              {item.keybinding && (
                <kbd className="ml-auto shrink-0 rounded border border-vsc-border px-1 font-ui text-[11px] opacity-80">
                  {item.keybinding}
                </kbd>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
}

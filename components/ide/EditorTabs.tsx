import clsx from 'clsx'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FileIcon } from './FileIcon'
import { describePath } from './files'
import { useWorkbench } from './Workbench'

export function EditorTabs() {
  let { locale } = useRouter()
  let { tabs, focusedPath, pendingPath, openTab, closeTab, closeOthers } = useWorkbench()
  let strip = useRef<HTMLDivElement>(null)
  let [menu, setMenu] = useState<{ path: string; x: number; y: number } | null>(null)

  // Keep the active tab in view when the strip overflows
  useEffect(() => {
    let el = strip.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [focusedPath, tabs.length])

  useEffect(() => {
    if (!menu) return
    let close = () => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true) // capture: catches the editor's own scroll
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menu])

  // Tabs can share a file name (three README.md): show the folder like VS Code does
  let infos = tabs.map((path) => describePath(path, locale))
  let nameCount = infos.reduce<Record<string, number>>(
    (acc, i) => ({ ...acc, [i.name]: (acc[i.name] || 0) + 1 }),
    {}
  )

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label="Open editors"
      className="vsc-scroll flex h-[35px] overflow-x-auto overflow-y-hidden bg-vsc-tabs"
      onWheel={(e) => {
        // Vertical wheel scrolls the tab strip sideways, as in VS Code
        if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX))
          strip.current.scrollLeft += e.deltaY
      }}
    >
      {tabs.map((path, i) => {
        let info = infos[i]
        let active = path === focusedPath
        let dir = info.crumbs.length > 1 ? info.crumbs[info.crumbs.length - 2] : null
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            title={`${info.title} — ${info.crumbs.join('/')}`}
            onClick={() => openTab(path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openTab(path)
              }
            }}
            // Middle click closes. Its mousedown must be cancelled: on a scrollable strip the
            // browser otherwise starts autoscroll and never fires the click
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault()
            }}
            onMouseUp={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                closeTab(path)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ path, x: e.clientX, y: e.clientY })
            }}
            className={clsx(
              'group relative flex h-full min-w-fit shrink-0 cursor-pointer select-none items-center gap-1.5 border-r border-vsc-border pl-3 pr-1.5 font-ui text-[13px] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-vsc-focus',
              active ? 'bg-vsc-editor text-vsc-tab-active-fg' : 'bg-vsc-tab text-vsc-tab-fg'
            )}
          >
            {active && (
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-vsc-accent" />
            )}
            <FileIcon kind={info.kind} loading={path === pendingPath} />
            <span className="max-w-[16rem] truncate">{info.name}</span>
            {dir && nameCount[info.name] > 1 && (
              <span className="text-[12px] text-vsc-muted">{dir}</span>
            )}
            <button
              type="button"
              aria-label={`Close ${info.name}`}
              onClick={(e) => {
                e.stopPropagation()
                closeTab(path)
              }}
              className={clsx(
                'ml-1 rounded p-0.5 hover:bg-vsc-hover',
                active ? 'visible' : 'invisible group-hover:visible group-focus-visible:visible'
              )}
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        )
      })}
      <div className="flex-1 border-b border-vsc-border" />
      {menu && (
        <ul
          role="menu"
          className="fixed z-[60] min-w-[180px] rounded-md border border-vsc-border bg-vsc-widget py-1 font-ui text-[13px] text-vsc-sidebar-fg shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          {[
            { label: 'Close', shortcut: 'Alt+W', run: () => closeTab(menu.path) },
            { label: 'Close Others', run: () => closeOthers(menu.path) },
            {
              label: 'Copy Link',
              run: () =>
                navigator.clipboard?.writeText(
                  `${window.location.origin}${locale ? `/${locale}` : ''}${menu.path}`
                ),
            },
          ].map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                onClick={item.run}
                className="flex w-full items-center justify-between gap-6 px-3 py-1 text-left hover:bg-vsc-focus hover:text-white"
              >
                {item.label}
                {item.shortcut && <span className="text-[12px] opacity-70">{item.shortcut}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Breadcrumbs() {
  let { locale } = useRouter()
  let { focusedPath, pendingPath } = useWorkbench()
  let info = describePath(focusedPath, locale)
  let folders = info.crumbs.slice(0, -1)
  // Every folder crumb opens that folder's README (its route), the root opens the home page
  let crumbs = [
    { label: 'tupt.dev', href: '/' },
    ...folders.map((name, i) => ({ label: name, href: `/${folders.slice(0, i + 1).join('/')}/` })),
  ]
  let link = 'rounded-sm px-0.5 hover:bg-vsc-hover hover:text-vsc-editor-fg'
  return (
    <nav
      aria-label="Breadcrumb"
      className="vsc-no-scrollbar flex h-[22px] items-center overflow-x-auto whitespace-nowrap bg-vsc-editor px-3 font-ui text-[13px] text-vsc-muted"
    >
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center">
          <NextLink href={c.href} className={link}>
            {c.label}
          </NextLink>
          <ChevronRight size={14} strokeWidth={1.5} className="mx-0.5 shrink-0" />
        </span>
      ))}
      <span className="flex items-center text-vsc-editor-fg" aria-current="page">
        <FileIcon kind={info.kind} loading={focusedPath === pendingPath} className="mr-1" />
        {info.name}
      </span>
    </nav>
  )
}

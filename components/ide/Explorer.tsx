import clsx from 'clsx'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileIcon, FolderIcon } from './FileIcon'
import { buildTree, foldersOf, type TreeNode } from './files'
import { Outline } from './Outline'
import { useWorkbench } from './Workbench'

const INDENT = 8 // px per level, VS Code's default tree indent
const STORAGE_KEY = 'tupt.ide.folders'

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-[35px] shrink-0 items-center justify-between pl-5 pr-2 text-[11px] uppercase tracking-wide text-vsc-sidebar-header">
      <span>{title}</span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  )
}

export function Section({
  title,
  open,
  onToggle,
  children,
  className,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('flex min-h-0 flex-col', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[22px] w-full shrink-0 items-center gap-0.5 border-t border-vsc-border text-[11px] font-bold uppercase tracking-wide text-vsc-sidebar-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-vsc-focus"
        aria-expanded={open}
      >
        <ChevronRight
          size={16}
          strokeWidth={1.5}
          className={clsx('transition-transform duration-100', open && 'rotate-90')}
        />
        {title}
      </button>
      {open && <div className="vsc-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </section>
  )
}

export function Explorer() {
  let { locale } = useRouter()
  let { focusedPath } = useWorkbench()
  let tree = useMemo(() => buildTree(locale), [locale])
  let [expanded, setExpanded] = useState<Record<string, boolean>>({ blog: true, snippets: true })
  let [sections, setSections] = useState({ files: true, outline: true })

  useEffect(() => {
    try {
      let stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
      if (stored && typeof stored === 'object') setExpanded((e) => ({ ...e, ...stored }))
    } catch {
      // ignore unreadable storage
    }
  }, [])

  // Reveal the active file: expand its folder (VS Code's "explorer.autoReveal")
  useEffect(() => {
    let folders = foldersOf(focusedPath)
    if (folders.length)
      setExpanded((e) =>
        folders.every((f) => e[f])
          ? e
          : { ...e, ...Object.fromEntries(folders.map((f) => [f, true])) }
      )
  }, [focusedPath])

  let toggle = (id: string) =>
    setExpanded((e) => {
      let next = { ...e, [id]: !e[id] }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Explorer" />
      <Section
        title={tree.name}
        open={sections.files}
        onToggle={() => setSections((s) => ({ ...s, files: !s.files }))}
        className={sections.files ? 'flex-1' : ''}
      >
        <ul role="tree" aria-label="Files" className="pb-2">
          {tree.children.map((node) => (
            <TreeItem
              key={nodeKey(node)}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </ul>
      </Section>
      <Section
        title="Outline"
        open={sections.outline}
        onToggle={() => setSections((s) => ({ ...s, outline: !s.outline }))}
        className={sections.outline ? 'max-h-[40%]' : ''}
      >
        <Outline />
      </Section>
    </div>
  )
}

function nodeKey(node: TreeNode) {
  return node.type === 'folder' ? `d:${node.id}` : `f:${node.path}`
}

function TreeItem({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode
  depth: number
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  let { activePath, focusedPath, pendingPath, closeDrawer } = useWorkbench()
  let pad = { paddingLeft: depth * INDENT + (node.type === 'file' ? 22 : 4) }
  let row =
    'group relative flex h-[22px] w-full items-center gap-1.5 pr-2 text-[13px] leading-[22px] text-vsc-sidebar-fg hover:bg-vsc-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-vsc-focus'

  if (node.type === 'folder') {
    let open = !!expanded[node.id]
    return (
      <li role="treeitem" aria-expanded={open} aria-selected={false}>
        <button
          type="button"
          className={clsx(row, 'gap-1')}
          style={pad}
          onClick={() => onToggle(node.id)}
        >
          <FolderIcon open={open} />
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <ul role="group" className="relative">
            {/* indent guide */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 top-0 border-l border-vsc-border"
              style={{ left: depth * INDENT + 12 }}
            />
            {node.children.map((child) => (
              <TreeItem
                key={nodeKey(child)}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </li>
    )
  }

  let active = node.path === focusedPath
  let content = (
    <>
      <FileIcon kind={node.kind} loading={node.path === pendingPath} />
      <span className="truncate">{node.name}</span>
    </>
  )
  let className = clsx(row, active && '!bg-vsc-selected text-vsc-tab-active-fg')

  return (
    <li role="treeitem" aria-selected={active} title={node.title}>
      {node.external ? (
        // Side project showcases are static pages outside the Next.js app
        <a
          href={node.path}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          style={pad}
        >
          {content}
        </a>
      ) : (
        <NextLink
          href={node.path}
          className={className}
          style={pad}
          // On mobile the drawer stays open while the page loads (so the spinner is visible)
          // and closes when it's rendered; re-clicking the current file just closes it
          onClick={() => node.path === activePath && closeDrawer()}
          aria-current={active ? 'page' : undefined}
        >
          {content}
        </NextLink>
      )}
    </li>
  )
}

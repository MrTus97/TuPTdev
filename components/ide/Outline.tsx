import clsx from 'clsx'
import { Hash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getEditorScroller, onEditorScroll } from './scroll'
import { useWorkbench } from './Workbench'

export const EDITOR_ID = 'ide-editor'

interface Heading {
  id: string
  text: string
  level: number
}

function readHeadings(): Heading[] {
  let root = document.getElementById(EDITOR_ID)
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')).map(
    (el) => ({
      id: el.id,
      text: (el.textContent || '').trim(),
      level: Number(el.tagName[1]),
    })
  )
}

/** Headings of the open document (rehype-slug gives them ids), like VS Code's Outline view. */
export function Outline() {
  let { activePath, closeDrawer } = useWorkbench()
  let [headings, setHeadings] = useState<Heading[]>([])
  let [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    let root = document.getElementById(EDITOR_ID)
    if (!root) return
    let timer: ReturnType<typeof setTimeout>
    let update = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setHeadings(readHeadings()), 50)
    }
    update()
    let observer = new MutationObserver(update)
    observer.observe(root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [activePath])

  // Highlight the last heading scrolled past the top of the editor
  useEffect(() => {
    if (!headings.length) return
    let onScroll = () => {
      let scroller = getEditorScroller()
      if (!scroller) return
      let top = scroller.getBoundingClientRect().top + 40
      let current = headings[0]?.id ?? null
      for (let h of headings) {
        let el = document.getElementById(h.id)
        if (el && el.getBoundingClientRect().top <= top) current = h.id
      }
      setActiveId(current)
    }
    onScroll()
    return onEditorScroll(onScroll)
  }, [headings])

  if (!headings.length) {
    return <p className="px-5 py-2 text-[13px] text-vsc-muted">No symbols found in document.</p>
  }

  let minLevel = Math.min(...headings.map((h) => h.level))
  return (
    <ul className="pb-2">
      {headings.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
              closeDrawer()
            }}
            className={clsx(
              'flex h-[22px] items-center gap-1.5 pr-2 text-[13px] text-vsc-sidebar-fg hover:bg-vsc-hover',
              activeId === h.id && 'bg-vsc-selected text-vsc-tab-active-fg'
            )}
            style={{ paddingLeft: 20 + (h.level - minLevel) * 12 }}
            title={h.text}
          >
            <Hash size={13} className="shrink-0 text-[#b180d7]" />
            <span className="truncate">{h.text}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

import clsx from 'clsx'
import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { EDITOR_ID } from './Outline'
import { getEditorScroller, onEditorScroll, scrollEditorTo } from './scroll'
import { useWorkbench } from './Workbench'

const SCALE = 0.1 // document px → minimap px
const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,img,table,figure,iframe,video'

interface Block {
  top: number
  left: number
  width: number
  height: number
  kind: 'text' | 'heading' | 'code' | 'media'
}

/** Measure the editor's block elements relative to the editor. */
function measure(root: HTMLElement): Block[] {
  let rootRect = root.getBoundingClientRect()
  let blocks: Block[] = []
  for (let el of Array.from(root.querySelectorAll<HTMLElement>(BLOCKS))) {
    // A list item whose text lives in nested blocks would be drawn twice
    if (el.tagName === 'LI' && el.querySelector('p,pre,ul,ol')) continue
    if (el.closest('pre') && el.tagName !== 'PRE') continue
    let r = el.getBoundingClientRect()
    if (r.height < 2 || r.width < 2) continue
    let tag = el.tagName
    let kind: Block['kind'] = /^H\d$/.test(tag)
      ? 'heading'
      : tag === 'PRE'
        ? 'code'
        : ['IMG', 'FIGURE', 'IFRAME', 'VIDEO', 'TABLE'].includes(tag)
          ? 'media'
          : 'text'
    // Short single-line text doesn't span the full width: approximate its length
    let width = r.width
    if (kind === 'text' || kind === 'heading') {
      let style = getComputedStyle(el)
      let lineHeight = parseFloat(style.lineHeight) || 24
      if (Math.round(r.height / lineHeight) <= 1) {
        let charWidth = parseFloat(style.fontSize) * 0.5 || 8
        width = Math.min(r.width, (el.textContent || '').length * charWidth)
      }
    }
    blocks.push({
      top: r.top - rootRect.top,
      left: r.left - rootRect.left,
      width,
      height: r.height,
      kind,
    })
  }
  return blocks
}

const COLOR: Record<Block['kind'], string> = {
  text: 'var(--vsc-minimap-text)',
  heading: 'var(--vsc-minimap-heading)',
  code: 'var(--vsc-minimap-code)',
  media: 'var(--vsc-minimap-code)',
}

/** The scaled document; memoized so scrolling never re-renders it. */
const MinimapBlocks = memo(function MinimapBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        let lines = b.kind === 'text' || b.kind === 'heading'
        let bar = b.kind === 'heading' ? 3 : 2
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: b.top * SCALE,
              left: 4 + b.left * SCALE,
              width: Math.max(2, b.width * SCALE),
              height: Math.max(2, b.height * SCALE),
              background: lines
                ? `repeating-linear-gradient(to bottom, ${COLOR[b.kind]} 0 ${bar}px, transparent 0 ${bar + 1}px)`
                : COLOR[b.kind],
            }}
          />
        )
      })}
    </>
  )
})

/**
 * Geometry, matching VS Code: the minimap shows the editor at SCALE. When that's taller than
 * the minimap, the minimap content scrolls too, so the slider always travels linearly over
 * [0, min(contentH, mapH) - sliderH] for scroll progress [0, 1].
 */
function geometry(scroller: HTMLElement, mapH: number) {
  let viewH = scroller.clientHeight
  let docH = scroller.scrollHeight
  let maxScroll = Math.max(1, docH - viewH)
  let contentH = docH * SCALE
  let sliderH = Math.min(mapH, viewH * SCALE)
  let track = Math.max(1, Math.min(contentH, mapH) - sliderH)
  let progress = Math.min(1, Math.max(0, scroller.scrollTop / maxScroll))
  return {
    sliderH,
    sliderTop: progress * track,
    offset: contentH > mapH ? progress * (contentH - mapH) : 0,
    // inverse: slider top (minimap px) → editor scrollTop
    scrollFor: (sliderTop: number) => (Math.min(track, Math.max(0, sliderTop)) / track) * maxScroll,
  }
}

export function Minimap() {
  let { activePath } = useWorkbench()
  let [blocks, setBlocks] = useState<Block[]>([])
  let [dragging, setDragging] = useState(false)
  let mapRef = useRef<HTMLDivElement>(null)
  let contentRef = useRef<HTMLDivElement>(null)
  let sliderRef = useRef<HTMLDivElement>(null)
  let grab = useRef<number | null>(null) // pointer y inside the slider while dragging

  // Position slider + content straight on the DOM, once per frame (no React render on scroll)
  let paint = useRef(() => {})
  paint.current = () => {
    let scroller = getEditorScroller()
    let map = mapRef.current
    if (!scroller || !map || !sliderRef.current || !contentRef.current) return
    let g = geometry(scroller, map.clientHeight)
    contentRef.current.style.transform = `translate3d(0, ${-g.offset}px, 0)`
    sliderRef.current.style.transform = `translate3d(0, ${g.sliderTop}px, 0)`
    sliderRef.current.style.height = `${Math.max(12, g.sliderH)}px`
  }

  useEffect(() => {
    let root = document.getElementById(EDITOR_ID)
    if (!root) return
    let frame = 0
    let schedulePaint = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => paint.current())
    }
    let measureFrame = 0
    let remeasure = () => {
      cancelAnimationFrame(measureFrame)
      measureFrame = requestAnimationFrame(() => {
        setBlocks(measure(root))
        paint.current()
      })
    }
    remeasure()
    let resize = new ResizeObserver(remeasure)
    resize.observe(root)
    let unsubscribe = onEditorScroll(schedulePaint)
    window.addEventListener('resize', remeasure)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(measureFrame)
      resize.disconnect()
      unsubscribe()
      window.removeEventListener('resize', remeasure)
    }
  }, [activePath])

  function pointerY(e: ReactPointerEvent) {
    return e.clientY - mapRef.current.getBoundingClientRect().top
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    let scroller = getEditorScroller()
    if (!scroller) return
    e.preventDefault()
    let g = geometry(scroller, mapRef.current.clientHeight)
    let y = pointerY(e)
    let sliderH = Math.max(12, g.sliderH)
    if (y >= g.sliderTop && y <= g.sliderTop + sliderH) {
      grab.current = y - g.sliderTop // keep the grabbed point under the pointer
    } else {
      // Click outside the slider: jump so the slider centers on the pointer, then keep dragging
      grab.current = sliderH / 2
      // Instant, not the editor's smooth scrolling: the content must follow the pointer
      scrollEditorTo(g.scrollFor(y - grab.current), 'instant')
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (grab.current === null) return
    let scroller = getEditorScroller()
    if (!scroller) return
    let g = geometry(scroller, mapRef.current.clientHeight)
    scrollEditorTo(g.scrollFor(pointerY(e) - grab.current), 'instant')
  }

  function endDrag() {
    grab.current = null
    setDragging(false)
  }

  return (
    <div
      ref={mapRef}
      aria-hidden="true"
      className="group relative h-full cursor-default touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      <div ref={contentRef} className="absolute inset-x-0 top-0 will-change-transform">
        <MinimapBlocks blocks={blocks} />
      </div>
      <div
        ref={sliderRef}
        className={clsx(
          'absolute inset-x-0 top-0 will-change-transform transition-opacity duration-100',
          dragging
            ? 'bg-[var(--vsc-minimap-slider-hover)] opacity-100'
            : 'bg-[var(--vsc-minimap-slider)] opacity-0 group-hover:opacity-100'
        )}
      />
    </div>
  )
}

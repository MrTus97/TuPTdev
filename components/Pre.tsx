import clsx from 'clsx'
import { useTranslation } from 'next-i18next'
import { ChevronDown, ChevronUp, ClipboardCheck, Copy, WrapText } from 'lucide-react'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { setCodeWrap, useCodeWrap } from '~/hooks/useCodeWrap'
import { useUiMode } from './UiMode'

const VISIBLE_LINES = 15
// Don't fold a block that would only hide a couple of lines
const MIN_HIDDEN_LINES = 3

// useLayoutEffect warns during SSR; the measurement only matters in the browser
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Code block: copy button, a site-wide "wrap lines" toggle, and long blocks folded to
 * VISIBLE_LINES lines with a "show more" button.
 */
export function Pre({ children }: { children: React.ReactNode }) {
  let { t } = useTranslation('common')
  let wrap = useCodeWrap()
  let { mode } = useUiMode()
  let root = useRef<HTMLDivElement>(null)
  let pre = useRef<HTMLPreElement>(null)
  let [copied, setCopied] = useState(false)
  let [expanded, setExpanded] = useState(false)
  // Height of VISIBLE_LINES lines when the block is longer than that, otherwise null
  let [foldHeight, setFoldHeight] = useState<number | null>(null)
  let [lineCount, setLineCount] = useState(0)

  // Measured from the rendered block, so wrapped lines and font sizes are accounted for
  useIsomorphicLayoutEffect(() => {
    let el = pre.current
    if (!el) return
    let measure = () => {
      let style = getComputedStyle(el.querySelector('code') || el)
      let lineHeight = parseFloat(style.lineHeight) || 24
      let padTop = parseFloat(getComputedStyle(el).paddingTop) || 0
      let height = padTop + VISIBLE_LINES * lineHeight
      let full = el.scrollHeight
      setFoldHeight(full > height + MIN_HIDDEN_LINES * lineHeight ? Math.round(height) : null)
      setLineCount((el.textContent || '').replace(/\n$/, '').split('\n').length)
    }
    measure()
    let observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [wrap])

  let folded = foldHeight !== null && !expanded

  let onCopy = () => {
    setCopied(true)
    let text = (pre.current?.innerText || '').replace(/(\$ |copy)/g, ' ')
    navigator.clipboard.writeText(text)
    setTimeout(() => setCopied(false), 2000)
  }

  let collapse = () => {
    setExpanded(false)
    // Keep the reader at the block instead of far below it
    requestAnimationFrame(() => root.current?.scrollIntoView({ block: 'nearest' }))
  }

  let toolButton =
    'inline-flex h-8 w-8 items-center justify-center rounded border bg-gray-700 p-1 dark:bg-gray-800'

  return (
    // The block's vertical margins live on the wrapper (the pre has none) so the sticky toolbar
    // below can overlap the pre's first line without shifting it
    <div
      ref={root}
      className="code-block group relative mb-[1.7em] mt-[1em]"
      data-code-folded={folded || undefined}
    >
      <div className="relative">
        {/* Toolbar: sticks to the top of the editor while the block scrolls by, so copy / wrap
            stay reachable anywhere in a long block. It keeps its full height (the pre is pulled
            up under it instead) so sticky positioning stops it at the block's end */}
        <div
          className={clsx(
            'pointer-events-none sticky z-10 flex h-12 justify-end p-2',
            mode === 'dev' ? 'top-2' : 'top-[77px]' // user interface: below the 69px header
          )}
        >
          <div
            className={clsx(
              'pointer-events-auto flex items-center gap-1.5 transition-opacity',
              // Visible on hover/focus; always on touch screens (no hover)
              'opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'
            )}
          >
            {copied && (
              <span className="rounded-md bg-gray-300 px-1.5 py-0.5 text-sm text-gray-800">
                {t('code.copied', { defaultValue: 'Copied' })}
              </span>
            )}
            <button
              type="button"
              aria-pressed={wrap}
              aria-label={t('code.wrap', { defaultValue: 'Wrap lines' })}
              title={t('code.wrap', { defaultValue: 'Wrap lines' })}
              onClick={() => setCodeWrap(!wrap)}
              className={clsx(
                toolButton,
                wrap ? 'border-primary-400 text-primary-300' : 'border-gray-300 text-gray-300'
              )}
            >
              <WrapText strokeWidth={1.5} size={20} />
            </button>
            <button
              type="button"
              aria-label={t('code.copy', { defaultValue: 'Copy code' })}
              title={t('code.copy', { defaultValue: 'Copy code' })}
              onClick={onCopy}
              className={clsx(
                toolButton,
                copied
                  ? 'border-green-400 text-green-400 focus:border-green-400 focus:outline-none'
                  : 'border-gray-300 text-gray-300'
              )}
            >
              {copied ? (
                <ClipboardCheck strokeWidth={1.5} size={20} />
              ) : (
                <Copy strokeWidth={1.5} size={20} />
              )}
            </button>
          </div>
        </div>
        <pre
          ref={pre}
          className="!-mt-12 !mb-0"
          style={folded ? { maxHeight: foldHeight, overflowY: 'hidden' } : undefined}
        >
          {children}
        </pre>
        {folded && (
          <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center rounded-b-md bg-gradient-to-b from-transparent to-[#222] pb-3">
            <button
              type="button"
              data-code-expand
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-500 bg-gray-800 px-3 py-1 font-ui text-sm text-gray-200 hover:border-gray-300 hover:text-white"
            >
              <ChevronDown size={16} />
              {t('code.show_more', {
                count: Math.max(0, lineCount - VISIBLE_LINES),
                defaultValue: 'Show {{count}} more lines',
              })}
            </button>
          </div>
        )}
      </div>
      {foldHeight !== null && expanded && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={collapse}
            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 font-ui text-sm text-gray-600 hover:border-gray-500 hover:text-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:text-white"
          >
            <ChevronUp size={16} />
            {t('code.show_less', { defaultValue: 'Show less' })}
          </button>
        </div>
      )}
    </div>
  )
}

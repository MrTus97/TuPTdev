import { EDITOR_ID } from './Outline'
import { getEditorScroller } from './scroll'

/** One page of the full-text index (public/search-index/<locale>.json, see scripts/generate-explorer.ts). */
export interface SearchDocument {
  path: string
  file: string // workspace path, e.g. blog/my-post.mdx
  title: string
  lines: string[]
}

export interface SearchOptions {
  matchCase: boolean
  wholeWord: boolean
  regex: boolean
}

export interface LineMatch {
  line: number
  text: string
  ranges: [number, number][]
  ordinal: number // index of this line's first match among all matches in the document
}

export interface FileMatches {
  doc: SearchDocument
  matches: LineMatch[]
  count: number
}

let indexes = new Map<string, Promise<SearchDocument[]>>()

/** The full-text index of a locale, fetched once (only when the Search view is used). */
export function loadSearchIndex(locale: string) {
  if (!indexes.has(locale)) {
    let request = fetch(`/search-index/${locale}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .catch((error) => {
        indexes.delete(locale) // allow a retry
        throw error
      })
    indexes.set(locale, request)
  }
  return indexes.get(locale)
}

/** VS Code's search semantics: literal or regex, optional case and whole-word matching. */
export function buildRegex(query: string, options: SearchOptions): RegExp {
  let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // \b only knows ASCII; Vietnamese words need Unicode letter boundaries
  if (options.wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`
  return new RegExp(source, options.matchCase ? 'gu' : 'giu') // throws on an invalid regex
}

function matchRanges(text: string, re: RegExp): [number, number][] {
  let ranges: [number, number][] = []
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m[0].length === 0) {
      re.lastIndex++ // an empty match (e.g. regex "a*") would loop forever
      continue
    }
    ranges.push([m.index, m.index + m[0].length])
  }
  return ranges
}

export const MAX_RESULTS = 2000

export function searchDocuments(docs: SearchDocument[], re: RegExp) {
  let files: FileMatches[] = []
  let total = 0
  for (let doc of docs) {
    let matches: LineMatch[] = []
    let ordinal = 0
    doc.lines.forEach((text, line) => {
      if (total >= MAX_RESULTS) return
      let ranges = matchRanges(text, re)
      if (!ranges.length) return
      matches.push({ line, text, ranges, ordinal })
      ordinal += ranges.length
      total += ranges.length
    })
    if (matches.length) files.push({ doc, matches, count: ordinal })
  }
  return { files, total, truncated: total >= MAX_RESULTS }
}

// --- Revealing a match in the rendered page ------------------------------------------------

const HIGHLIGHT = 'search-match'

// CSS Custom Highlight API (Chrome 105+, Safari 17.2+, Firefox 140+); not in this TS lib version
function highlightRegistry(): { set: Function; delete: Function } | null {
  return (typeof CSS !== 'undefined' && (CSS as any).highlights) || null
}

function clearHighlight() {
  highlightRegistry()?.delete(HIGHLIGHT)
}

export interface MatchTarget {
  re: RegExp
  ordinal: number // n-th match in the document (fallback)
  line: string // the indexed line and the match inside it (to find it by its context)
  from: number
  to: number
}

const CONTEXT = 40 // characters of the line kept on each side of the match to locate it

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Scroll a match of the Search view to the middle of the editor and highlight it.
 *
 * The index is built from the MDX source, which isn't exactly the rendered text (the page adds
 * tags and dates, drops the summary...), so the match is located by the text around it in its
 * line first, and only falls back to "the n-th match on the page".
 * Returns false when the page isn't rendered yet (the caller retries).
 */
export function revealMatch(target: MatchTarget): boolean {
  let { re, ordinal, line, from: lineFrom, to: lineTo } = target
  let editor = document.getElementById(EDITOR_ID)
  let scroller = getEditorScroller()
  if (!editor || !scroller) return false

  let walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('script, style, noscript')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  let nodes: Text[] = []
  let starts: number[] = []
  let text = ''
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text)
    starts.push(text.length)
    text += node.nodeValue
  }
  let ranges = matchRanges(text, re)
  if (!ranges.length) return false

  let start = Math.max(0, lineFrom - CONTEXT)
  let context = line.slice(start, Math.min(line.length, lineTo + CONTEXT)).trim()
  let lead = line.slice(start, lineFrom).trimStart().length // context chars before the match
  // Whitespace may differ between the source line and the rendered text (wrapping, code indent)
  let anchor = new RegExp(escapeRegex(context).replace(/\s+/g, '\\s+'), 'u').exec(text)
  let chosen = anchor
    ? // the first match at or after where the context places it
      ranges.find(([s]) => s >= anchor.index + lead - 2) || ranges[ranges.length - 1]
    : ranges[Math.min(ordinal, ranges.length - 1)]
  let [from, to] = chosen

  let locate = (offset: number, end: boolean) => {
    // the text node containing `offset` (for the end, the node containing offset - 1)
    let i = starts.length - 1
    while (i > 0 && (end ? starts[i] >= offset : starts[i] > offset)) i--
    return { node: nodes[i], offset: offset - starts[i] }
  }
  let a = locate(from, false)
  let b = locate(to, true)
  let range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)

  let rect = range.getBoundingClientRect()
  let box = scroller.getBoundingClientRect()
  scroller.scrollTo({
    top: scroller.scrollTop + rect.top - box.top - scroller.clientHeight / 2 + rect.height / 2,
    behavior: 'instant',
  })

  clearHighlight()
  let registry = highlightRegistry()
  let HighlightCtor = (window as any).Highlight
  if (registry && HighlightCtor) {
    registry.set(HIGHLIGHT, new HighlightCtor(range))
  } else {
    // Older browsers: select the text instead
    let selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }
  return true
}

/** Retry revealMatch for a few frames while a freshly opened page renders. */
export function revealWhenReady(target: MatchTarget, attempts = 30) {
  let tries = 0
  let step = () => {
    if (revealMatch(target) || ++tries >= attempts) return
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export { clearHighlight as clearSearchHighlight }

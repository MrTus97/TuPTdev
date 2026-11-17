/**
 * Build the indexes that power the VS Code-style workbench:
 *
 * - `data/explorer.json`: frontmatter of every post/snippet, for the explorer tree and quick open.
 *   Every page needs it, but each page only gets its own getStaticProps data, so it's imported
 *   by the client bundle (small: no post bodies).
 * - `public/search-index/<locale>.json`: the plain text of every post/snippet (and the resume),
 *   line by line, for the full-text Search view. Fetched only when the Search view is used.
 *
 * Runs before `next dev` and `next build`; posts saved from the admin CMS become a commit, which
 * triggers a rebuild, which regenerates both.
 */
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

let ROOT = process.cwd()
let DATA_DIR = path.join(ROOT, 'data')
let OUT_FILE = path.join(DATA_DIR, 'explorer.json')
let SEARCH_DIR = path.join(ROOT, 'public', 'search-index')
let SECTIONS = ['blog', 'snippets'] as const

interface ExplorerEntry {
  slug: string
  fileName: string
  title: string
  date: string
  summary: string
  tags: string[]
}

interface SearchDocument {
  path: string // route, e.g. /blog/my-post/
  file: string // workspace path shown in results, e.g. blog/my-post.mdx
  title: string
  lines: string[]
}

/**
 * MDX source → the lines a reader sees: frontmatter, imports, JSX components, markdown syntax,
 * image/link targets and table pipes are dropped; code blocks are kept (they're searchable in
 * VS Code too).
 */
export function toPlainLines(content: string): string[] {
  let lines: string[] = []
  let inFence = false
  let inJsx = false
  for (let raw of content.split(/\r?\n/)) {
    let line = raw
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (!inFence) {
      // A multi-line JSX element: <Component\n  prop="..."\n/>
      if (inJsx) {
        if (/\/?>\s*$/.test(line)) inJsx = false
        continue
      }
      if (/^\s*<[A-Z]/.test(line) && !/>\s*$/.test(line)) {
        inJsx = true
        continue
      }
      if (/^\s*(import|export)\s/.test(line)) continue
      if (/^\s*\|?\s*:?-{3,}/.test(line)) continue // table separator row
      let heading = /^\s{0,3}#{1,6}\s/.test(line)
      line = line
        .replace(/\{\/\*.*?\*\/\}/g, '') // MDX comments
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
        .replace(/<\/?[A-Za-z][^>]*>/g, '') // HTML / JSX tags
        .replace(/^\s{0,3}(#{1,6}|>)\s*/, '') // heading / quote markers
        // list markers (not on headings: "## 1. Intro" keeps its number)
        .replace(heading ? /$^/ : /^\s*([-*+]|\d+\.)\s+/, '')
        .replace(/\*\*|__|~~|`/g, '') // emphasis / inline code markers
        .replace(/\s*\|\s*/g, ' ') // table pipes
    }
    line = line.trim()
    if (line) lines.push(line)
  }
  return lines
}

function readSection(locale: string, section: string) {
  let dir = path.join(DATA_DIR, locale, section)
  if (!fs.existsSync(dir)) return { entries: [], docs: [] }
  let entries: ExplorerEntry[] = []
  let docs: SearchDocument[] = []
  for (let fileName of fs.readdirSync(dir)) {
    if (!/\.mdx?$/.test(fileName)) continue
    let { data, content } = matter(fs.readFileSync(path.join(dir, fileName), 'utf8'))
    if (data.draft === true) continue
    let slug = fileName.replace(/\.mdx?$/, '')
    let title = String(data.title ?? fileName)
    let summary = String(data.summary ?? '')
    entries.push({
      slug,
      fileName,
      title,
      date: data.date ? String(data.date) : '',
      summary,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    })
    docs.push({
      path: `/${section}/${slug}/`,
      file: `${section}/${fileName}`,
      title,
      // The title and summary are shown on the page too, so they're searchable lines
      lines: [title, summary, ...toPlainLines(content)].filter(Boolean),
    })
  }
  // Same order as VS Code's explorer: case-insensitive by file name
  let byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' })
  entries.sort((a, b) => byName(a.fileName, b.fileName))
  docs.sort((a, b) => byName(a.file, b.file))
  return { entries, docs }
}

function readResume(locale: string): SearchDocument[] {
  let file = path.join(DATA_DIR, locale, 'authors', 'resume.mdx')
  if (!fs.existsSync(file)) return []
  let { data, content } = matter(fs.readFileSync(file, 'utf8'))
  let title = String(data.title ?? 'Resume')
  return [{ path: '/resume/', file: 'resume.md', title, lines: [title, ...toPlainLines(content)] }]
}

function writeIfChanged(file: string, text: string) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text)
}

let locales: Record<string, Record<string, ExplorerEntry[]>> = {}
fs.mkdirSync(SEARCH_DIR, { recursive: true })
for (let locale of fs.readdirSync(DATA_DIR)) {
  if (!fs.statSync(path.join(DATA_DIR, locale)).isDirectory()) continue
  if (!SECTIONS.some((s) => fs.existsSync(path.join(DATA_DIR, locale, s)))) continue
  let sections = SECTIONS.map((s) => [s, readSection(locale, s)] as const)
  locales[locale] = Object.fromEntries(sections.map(([s, r]) => [s, r.entries]))
  let docs = [...sections.flatMap(([, r]) => r.docs), ...readResume(locale)]
  writeIfChanged(path.join(SEARCH_DIR, `${locale}.json`), JSON.stringify(docs))
}

writeIfChanged(OUT_FILE, JSON.stringify(locales, null, 2) + '\n')
console.log(
  `Explorer and search indexes generated for ${Object.keys(locales).join(', ')} ` +
    '(`data/explorer.json`, `public/search-index/`).'
)

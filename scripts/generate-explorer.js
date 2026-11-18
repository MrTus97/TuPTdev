/**
 * Build the indexes that power the VS Code-style ("dev") interface:
 *
 * - `data/explorer.json`: frontmatter of every post/snippet, for the explorer tree and quick open.
 *   Every page needs it, but each page only gets its own getStaticProps data, so it's imported
 *   by the client bundle (small: no post bodies). Committed.
 * - `public/search-index/<locale>.json`: the plain text of every post/snippet (and the resume),
 *   line by line, for the full-text Search view. Fetched only when the Search view is used.
 *   Generated, not committed.
 *
 * Plain CommonJS so next.config.js can run it at the start of every `next build` / `next dev`,
 * whatever build command the host uses (posts saved from the admin CMS become a commit, which
 * triggers a rebuild, which regenerates both). Also runnable on its own: `npm run explorer`.
 */
const fs = require('fs')
const matter = require('gray-matter')
const path = require('path')

const SECTIONS = ['blog', 'snippets']

/**
 * MDX source → the lines a reader sees: frontmatter, imports, JSX components, markdown syntax,
 * image/link targets and table pipes are dropped; code blocks are kept (they're searchable in
 * VS Code too).
 */
function toPlainLines(content) {
  let lines = []
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

function readSection(dataDir, locale, section) {
  let dir = path.join(dataDir, locale, section)
  if (!fs.existsSync(dir)) return { entries: [], docs: [] }
  let entries = []
  let docs = []
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
  let byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })
  entries.sort((a, b) => byName(a.fileName, b.fileName))
  docs.sort((a, b) => byName(a.file, b.file))
  return { entries, docs }
}

function readResume(dataDir, locale) {
  let file = path.join(dataDir, locale, 'authors', 'resume.mdx')
  if (!fs.existsSync(file)) return []
  let { data, content } = matter(fs.readFileSync(file, 'utf8'))
  let title = String(data.title ?? 'Resume')
  return [{ path: '/resume/', file: 'resume.md', title, lines: [title, ...toPlainLines(content)] }]
}

function writeIfChanged(file, text) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text)
}

function generateExplorerIndexes(root = process.cwd()) {
  let dataDir = path.join(root, 'data')
  let searchDir = path.join(root, 'public', 'search-index')
  let locales = {}
  fs.mkdirSync(searchDir, { recursive: true })
  for (let locale of fs.readdirSync(dataDir)) {
    if (!fs.statSync(path.join(dataDir, locale)).isDirectory()) continue
    if (!SECTIONS.some((s) => fs.existsSync(path.join(dataDir, locale, s)))) continue
    let sections = SECTIONS.map((s) => [s, readSection(dataDir, locale, s)])
    locales[locale] = Object.fromEntries(sections.map(([s, r]) => [s, r.entries]))
    let docs = [...sections.flatMap(([, r]) => r.docs), ...readResume(dataDir, locale)]
    writeIfChanged(path.join(searchDir, `${locale}.json`), JSON.stringify(docs))
  }
  writeIfChanged(path.join(dataDir, 'explorer.json'), JSON.stringify(locales, null, 2) + '\n')
  return Object.keys(locales)
}

module.exports = { generateExplorerIndexes, toPlainLines }

if (require.main === module) {
  let locales = generateExplorerIndexes()
  console.log(
    `Explorer and search indexes generated for ${locales.join(', ')} ` +
      '(`data/explorer.json`, `public/search-index/`).'
  )
}

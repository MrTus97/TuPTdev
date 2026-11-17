/**
 * Build the file index that powers the VS Code-style explorer, search view and quick open.
 *
 * Every page needs the full list of posts/snippets for the sidebar tree, but each page only
 * gets its own getStaticProps data, so we snapshot the frontmatter into `data/explorer.json`
 * (imported by the client bundle). Runs before `next dev` and `next build`; posts saved from the
 * admin CMS become a commit, which triggers a rebuild, which regenerates this file.
 */
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

let ROOT = process.cwd()
let DATA_DIR = path.join(ROOT, 'data')
let OUT_FILE = path.join(DATA_DIR, 'explorer.json')
let SECTIONS = ['blog', 'snippets'] as const

interface ExplorerEntry {
  slug: string
  fileName: string
  title: string
  date: string
  summary: string
  tags: string[]
}

function readSection(locale: string, section: string): ExplorerEntry[] {
  let dir = path.join(DATA_DIR, locale, section)
  if (!fs.existsSync(dir)) return []
  let entries: ExplorerEntry[] = []
  for (let fileName of fs.readdirSync(dir)) {
    if (!/\.mdx?$/.test(fileName)) continue
    let { data } = matter(fs.readFileSync(path.join(dir, fileName), 'utf8'))
    if (data.draft === true) continue
    entries.push({
      slug: fileName.replace(/\.mdx?$/, ''),
      fileName,
      title: String(data.title ?? fileName),
      date: data.date ? String(data.date) : '',
      summary: String(data.summary ?? ''),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    })
  }
  // Same order as VS Code's explorer: case-insensitive by file name
  return entries.sort((a, b) => a.fileName.localeCompare(b.fileName, 'en', { sensitivity: 'base' }))
}

let locales: Record<string, Record<string, ExplorerEntry[]>> = {}
for (let locale of fs.readdirSync(DATA_DIR)) {
  if (!fs.statSync(path.join(DATA_DIR, locale)).isDirectory()) continue
  if (!SECTIONS.some((s) => fs.existsSync(path.join(DATA_DIR, locale, s)))) continue
  locales[locale] = Object.fromEntries(SECTIONS.map((s) => [s, readSection(locale, s)]))
}

let json = JSON.stringify(locales, null, 2) + '\n'
if (!fs.existsSync(OUT_FILE) || fs.readFileSync(OUT_FILE, 'utf8') !== json) {
  fs.writeFileSync(OUT_FILE, json)
}
console.log(
  `Explorer index generated in \`data/explorer.json\` (${Object.keys(locales).join(', ')}).`
)

import explorerIndex from '~/data/explorer.json'
import { sideProjectHref, sideProjects } from '~/data/sideProjectsData'

/**
 * The site seen as a workspace: every route is a "file" in the explorer tree, opens as a tab,
 * and has a breadcrumb. Paths are router paths without locale, query or hash, with a trailing
 * slash (next.config `trailingSlash: true`).
 */

export type FileKind = 'md' | 'mdx' | 'json' | 'tsx' | 'html' | 'link'

export interface ExplorerEntry {
  slug: string
  fileName: string
  title: string
  date: string
  summary: string
  tags: string[]
}

export interface FileNode {
  type: 'file'
  name: string
  path: string // route, or an absolute URL for kind 'link'
  kind: FileKind
  title?: string // the human title shown on hover / in quick open
  tags?: string[]
  summary?: string
  external?: boolean
}

export interface FolderNode {
  type: 'folder'
  name: string
  id: string
  children: TreeNode[]
}

export type TreeNode = FileNode | FolderNode

export interface FileInfo {
  name: string
  kind: FileKind
  title: string
  crumbs: string[]
  language: string
}

type Index = Record<string, { blog: ExplorerEntry[]; snippets: ExplorerEntry[] }>

export function getEntries(locale: string) {
  let index = explorerIndex as Index
  return index[locale] || index.en || { blog: [], snippets: [] }
}

export function normalizePath(asPath: string) {
  let path = asPath.split(/[?#]/)[0] || '/'
  return path.endsWith('/') ? path : `${path}/`
}

function kindOf(fileName: string): FileKind {
  return fileName.endsWith('.md') ? 'md' : 'mdx'
}

export function buildTree(locale: string): FolderNode {
  let { blog, snippets } = getEntries(locale)
  let posts = (section: 'blog' | 'snippets', entries: ExplorerEntry[]): FileNode[] =>
    entries.map((e) => ({
      type: 'file',
      name: e.fileName,
      path: `/${section}/${e.slug}/`,
      kind: kindOf(e.fileName),
      title: e.title,
      tags: e.tags,
      summary: e.summary,
    }))

  // VS Code order: folders first, then files, each alphabetically
  return {
    type: 'folder',
    name: 'tupt.dev',
    id: 'root',
    children: [
      {
        type: 'folder',
        name: 'blog',
        id: 'blog',
        children: [
          { type: 'file', name: 'README.md', path: '/blog/', kind: 'md', title: 'All posts' },
          ...posts('blog', blog),
        ],
      },
      {
        type: 'folder',
        name: 'side-projects',
        id: 'side-projects',
        children: [
          {
            type: 'file',
            name: 'README.md',
            path: '/side-projects/',
            kind: 'md',
            title: 'Side projects',
          },
          ...sideProjects.map<FileNode>((p) => ({
            type: 'file',
            name: `${p.slug}.html`,
            path: sideProjectHref(p.slug),
            kind: 'html',
            title: p.title,
          })),
        ],
      },
      {
        type: 'folder',
        name: 'snippets',
        id: 'snippets',
        children: [
          { type: 'file', name: 'README.md', path: '/snippets/', kind: 'md', title: 'Snippets' },
          ...posts('snippets', snippets),
        ],
      },
      { type: 'file', name: 'README.md', path: '/', kind: 'md', title: 'Home' },
      { type: 'file', name: 'resume.md', path: '/resume/', kind: 'md', title: 'Resume' },
      { type: 'file', name: 'tags.json', path: '/tags/', kind: 'json', title: 'Tags' },
    ],
  }
}

/** Every openable file of the tree, for quick open (Ctrl+P). */
export function flattenFiles(node: TreeNode, dir: string[] = []): (FileNode & { dir: string })[] {
  if (node.type === 'file') return [{ ...node, dir: dir.join('/') }]
  let next = node.id === 'root' ? dir : [...dir, node.name]
  return node.children.flatMap((child) => flattenFiles(child, next))
}

const LANGUAGE: Record<FileKind, string> = {
  md: 'Markdown',
  mdx: 'MDX',
  json: 'JSON',
  tsx: 'TypeScript JSX',
  html: 'HTML',
  link: 'Plain Text',
}

/** Name, icon, breadcrumbs and title for a route, used by tabs, breadcrumbs and status bar. */
export function describePath(path: string, locale: string): FileInfo {
  let { blog, snippets } = getEntries(locale)
  let parts = path.split('/').filter(Boolean)
  let info = (name: string, kind: FileKind, title: string, dirs: string[] = []): FileInfo => ({
    name,
    kind,
    title,
    crumbs: [...dirs, name],
    language: LANGUAGE[kind],
  })

  if (parts.length === 0) return info('README.md', 'md', 'Home')

  let [section, ...rest] = parts
  if (section === 'blog' || section === 'snippets') {
    if (rest.length === 0) return info('README.md', 'md', section, [section])
    if (section === 'blog' && rest[0] === 'page' && rest[1]) {
      return info(`page-${rest[1]}.md`, 'md', `Blog · page ${rest[1]}`, ['blog'])
    }
    let slug = rest.join('/')
    let entry = (section === 'blog' ? blog : snippets).find((e) => e.slug === slug)
    let fileName = entry?.fileName || `${slug}.mdx`
    return info(fileName, kindOf(fileName), entry?.title || slug, [section])
  }
  if (section === 'tags') {
    if (rest.length === 0) return info('tags.json', 'json', 'Tags')
    return info(`${rest.join('/')}.json`, 'json', `#${rest.join('/')}`, ['tags'])
  }
  if (section === 'resume') return info('resume.md', 'md', 'Resume')
  if (section === 'projects') return info('projects.json', 'json', 'Projects')
  if (section === 'side-projects') {
    if (rest.length === 0) return info('README.md', 'md', 'Side projects', ['side-projects'])
    let project = sideProjects.find((p) => p.slug === rest[0])
    return info(`${rest[0]}.html`, 'html', project?.title || rest[0], ['side-projects'])
  }
  let last = parts[parts.length - 1]
  return info(`${last}.tsx`, 'tsx', last, parts.slice(0, -1))
}

/** Folder ids along a route, so the explorer can reveal the active file. */
export function foldersOf(path: string) {
  let section = path.split('/').filter(Boolean)[0]
  return ['blog', 'snippets', 'side-projects'].includes(section) ? [section] : []
}

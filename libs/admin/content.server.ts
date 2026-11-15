import matter from 'gray-matter'
import type { AdminPostSource, AdminPostSummary, ContentKind } from './types'

/** Shared by the GitHub and local content stores. */

export const BLOG_LOCALES = ['vi', 'en'] as const
export type BlogLocale = (typeof BLOG_LOCALES)[number]

export type CommitFile =
  | { path: string; content: string } // utf-8 text
  | { path: string; blobSha: string } // previously uploaded image

export function postPath(locale: BlogLocale, slug: string, kind: ContentKind = 'blog') {
  return `data/${locale}/${kind}/${slug}.mdx`
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(slug)
}

export function parsePost(locale: BlogLocale, slug: string, raw: string): AdminPostSource {
  let { data, content } = matter(raw)
  // gray-matter turns unquoted dates into Date objects; keep them as YYYY-MM-DD
  for (let [key, value] of Object.entries(data)) {
    if (value instanceof Date) data[key] = value.toISOString().slice(0, 10)
  }
  return { locale, slug, frontmatter: data, body: content.replace(/^\n+/, '') }
}

/** Merge raw files of every locale into one summary per slug, newest first. */
export function summarizePosts(files: { locale: BlogLocale; name: string; text: string }[]) {
  let bySlug = new Map<string, AdminPostSummary>()
  for (let locale of BLOG_LOCALES) {
    for (let file of files.filter((f) => f.locale === locale)) {
      if (!/\.mdx?$/.test(file.name)) continue
      let slug = file.name.replace(/\.mdx?$/, '')
      let fm = matter(file.text).data
      let post = bySlug.get(slug) ?? { slug, title: '', date: '', draft: false, locales: [] }
      post.locales.push(locale)
      if (locale === 'vi' || !post.title) {
        post.title = String(fm.title ?? slug)
        post.date = fm.date
          ? (fm.date instanceof Date ? fm.date.toISOString() : String(fm.date)).slice(0, 10)
          : ''
        post.draft = fm.draft === true
      }
      bySlug.set(slug, post)
    }
  }
  return [...bySlug.values()].sort((a, b) => b.date.localeCompare(a.date))
}

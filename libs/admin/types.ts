export type Frontmatter = Record<string, unknown>

export type AdminPostSummary = {
  slug: string
  title: string
  date: string
  draft: boolean
  locales: string[]
}

export type AdminPostSource = {
  locale: string
  slug: string
  frontmatter: Frontmatter
  body: string
}

export const CONTENT_KINDS = ['blog', 'snippets'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]

export function toContentKind(value: unknown): ContentKind {
  return value === 'snippets' ? 'snippets' : 'blog'
}

export const CONTENT_LABELS: Record<ContentKind, { plural: string; single: string }> = {
  blog: { plural: 'Bài viết', single: 'bài viết' },
  snippets: { plural: 'Snippets', single: 'snippet' },
}

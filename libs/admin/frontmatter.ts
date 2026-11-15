import type { Frontmatter } from './types'

/**
 * Tiny YAML frontmatter serializer for the admin editor (client-safe, no js-yaml).
 * Supports the value types this blog uses: strings, numbers, booleans, string arrays.
 */

const KEY_ORDER = [
  'heading',
  'title',
  'date',
  'type',
  'tags',
  'draft',
  'summary',
  'images',
  'authors',
  'layout',
]

function quote(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function serializeValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => quote(String(v))).join(', ')}]`
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return quote(String(value ?? ''))
}

export function serializeMdx(frontmatter: Frontmatter, body: string) {
  let keys = [
    ...KEY_ORDER.filter((k) => k in frontmatter),
    ...Object.keys(frontmatter).filter((k) => !KEY_ORDER.includes(k)),
  ]
  let lines = keys
    .filter((k) => frontmatter[k] !== undefined && frontmatter[k] !== null)
    .map((k) => `${k}: ${serializeValue(frontmatter[k])}`)
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '').replace(/\s*$/, '')}\n`
}

/** Turn a title into a URL slug (handles Vietnamese diacritics). */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

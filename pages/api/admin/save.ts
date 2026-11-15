import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminApi } from '~/libs/admin/auth.server'
import {
  BLOG_LOCALES,
  commitFiles,
  isValidSlug,
  postPath,
  type BlogLocale,
  type CommitFile,
} from '~/libs/admin/github.server'
import { toContentKind } from '~/libs/admin/types'

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

type SaveBody = {
  kind: 'blog' | 'snippets'
  slug: string
  isNew: boolean
  files: Partial<Record<BlogLocale, string>> // full MDX source per locale
  images: { path: string; sha: string }[]
}

/** POST SaveBody -> commits every locale and the new images in a single commit */
export default async function save(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdminApi(req, res)) return

  let { slug, isNew, files = {}, images = [] } = (req.body ?? {}) as SaveBody
  let kind = toContentKind(req.body?.kind)
  if (typeof slug !== 'string' || !isValidSlug(slug)) {
    return res.status(400).json({ message: 'Slug không hợp lệ.' })
  }

  let commit: CommitFile[] = []
  for (let locale of BLOG_LOCALES) {
    let content = files[locale]
    if (typeof content === 'string' && content.trim()) {
      commit.push({ path: postPath(locale, slug, kind), content })
    }
  }
  for (let image of images) {
    if (!/^public\/static\/images\/blogs\/[a-z0-9._-]+$/i.test(image.path) || !image.sha) {
      return res.status(400).json({ message: `Đường dẫn ảnh không hợp lệ: ${image.path}` })
    }
    commit.push({ path: image.path, blobSha: image.sha })
  }
  if (!commit.length) return res.status(400).json({ message: 'Không có gì để lưu.' })

  try {
    let result = await commitFiles(
      commit,
      `${isNew ? 'feat: add' : 'chore: update'} ${kind === 'blog' ? 'blog' : 'snippet'} ${slug}`
    )
    return res.json({ sha: result.sha, url: result.html_url })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: (err as Error).message })
  }
}

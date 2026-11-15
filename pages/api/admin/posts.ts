import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminApi } from '~/libs/admin/auth.server'
import { BLOG_LOCALES, getPost, isValidSlug, listPosts } from '~/libs/admin/github.server'
import { toContentKind } from '~/libs/admin/types'

/**
 * GET /api/admin/posts/?kind=blog|snippets          -> list
 * GET /api/admin/posts/?kind=blog|snippets&slug=x   -> { vi, en } sources (null when missing)
 */
export default async function posts(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdminApi(req, res)) return
  let kind = toContentKind(req.query.kind)
  try {
    let slug = req.query.slug
    if (typeof slug === 'string') {
      if (!isValidSlug(slug)) return res.status(400).json({ message: 'Invalid slug' })
      let entries = await Promise.all(
        BLOG_LOCALES.map(async (locale) => [locale, await getPost(locale, slug as string, kind)])
      )
      return res.json(Object.fromEntries(entries))
    }
    return res.json(await listPosts(kind))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: (err as Error).message })
  }
}

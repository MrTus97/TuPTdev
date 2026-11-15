import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminApi } from '~/libs/admin/auth.server'
import { bundleMdxSource } from '~/libs/mdx.server'

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

/** POST { source } -> { code }, bundled with the same pipeline as published posts */
export default async function preview(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdminApi(req, res)) return
  try {
    let { code } = await bundleMdxSource(String(req.body?.source ?? ''))
    return res.json({ code })
  } catch (err) {
    // MDX syntax errors are expected while typing; return the message to show in the preview
    return res.status(422).json({ message: (err as Error).message })
  }
}

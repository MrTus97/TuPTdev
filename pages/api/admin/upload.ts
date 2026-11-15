import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminApi } from '~/libs/admin/auth.server'
import { uploadBlob } from '~/libs/admin/github.server'

// Images are resized in the browser first; Vercel caps request bodies at 4.5MB
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } }

/** POST { base64 } -> { sha }: stores the image as a git blob, committed later with the post */
export default async function upload(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdminApi(req, res)) return
  let base64 = String(req.body?.base64 ?? '')
  if (!base64) return res.status(400).json({ message: 'Missing image data' })
  try {
    return res.json({ sha: await uploadBlob(base64) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: (err as Error).message })
  }
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminApi } from '~/libs/admin/auth.server'
import { TranslationError, translateToEnglish } from '~/libs/admin/translate.server'

// Long posts can take a few minutes to translate
export const config = { api: { bodyParser: { sizeLimit: '2mb' } }, maxDuration: 300 }

/** POST { title, heading, summary, body } in Vietnamese -> the same shape in English */
export default async function translate(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!requireAdminApi(req, res)) return
  let { title = '', heading = '', summary = '', body = '' } = req.body ?? {}
  if (!String(body).trim()) return res.status(400).json({ message: 'Bài viết đang trống.' })
  try {
    let result = await translateToEnglish({
      title: String(title),
      heading: String(heading),
      summary: String(summary),
      body: String(body),
    })
    return res.json(result)
  } catch (err) {
    if (err instanceof TranslationError) return res.status(422).json({ message: err.message })
    console.error(err)
    return res.status(500).json({ message: 'Dịch thất bại: ' + (err as Error).message })
  }
}

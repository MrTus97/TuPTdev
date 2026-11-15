import type { NextApiRequest, NextApiResponse } from 'next'
import { SESSION_COOKIE, cookie } from '~/libs/admin/auth.server'

export default function logout(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', 0))
  res.redirect(302, '/admin/')
}

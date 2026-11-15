import crypto from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { STATE_COOKIE, cookie, getBaseUrl } from '~/libs/admin/auth.server'

export default function login(req: NextApiRequest, res: NextApiResponse) {
  let clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ message: 'Missing `GITHUB_OAUTH_CLIENT_ID` env variable' })
  }
  let state = crypto.randomBytes(16).toString('hex')
  let params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${getBaseUrl(req)}/api/admin/callback/`,
    state,
    allow_signup: 'false',
  })
  res.setHeader('Set-Cookie', cookie(STATE_COOKIE, state, 600))
  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`)
}

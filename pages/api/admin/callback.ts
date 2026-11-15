import type { NextApiRequest, NextApiResponse } from 'next'
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  cookie,
  createSessionToken,
  getBaseUrl,
  isAllowedLogin,
} from '~/libs/admin/auth.server'

export default async function callback(req: NextApiRequest, res: NextApiResponse) {
  let { code, state } = req.query
  if (
    typeof code !== 'string' ||
    typeof state !== 'string' ||
    state !== req.cookies[STATE_COOKIE]
  ) {
    return res.status(400).send('Invalid OAuth state, please try logging in again.')
  }

  let tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: `${getBaseUrl(req)}/api/admin/callback/`,
    }),
  })
  let { access_token } = await tokenRes.json()
  if (!access_token) {
    return res.status(401).send('GitHub login failed.')
  }

  let userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/vnd.github+json' },
  })
  let user = await userRes.json()
  if (!user?.login || !isAllowedLogin(user.login)) {
    res.setHeader('Set-Cookie', cookie(STATE_COOKIE, '', 0))
    return res.status(403).send('This GitHub account is not allowed to access the admin.')
  }

  res.setHeader('Set-Cookie', [
    cookie(STATE_COOKIE, '', 0),
    cookie(SESSION_COOKIE, createSessionToken(user.login), 60 * 60 * 24 * 7),
  ])
  res.redirect(302, '/admin/')
}

import crypto from 'crypto'
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'

/**
 * Admin auth: GitHub OAuth login, restricted to a single GitHub account
 * (ADMIN_GITHUB_USERNAME). The session is an HMAC-signed cookie, so no database is needed.
 */

export const SESSION_COOKIE = 'admin_session'
export const STATE_COOKIE = 'admin_oauth_state'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

type Session = { login: string; exp: number }
type RequestLike = Pick<NextApiRequest, 'headers' | 'cookies'>

function getSecret() {
  let secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be set (at least 32 characters)')
  }
  return secret
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

export function createSessionToken(login: string) {
  let payload: Session = { login, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
  let encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

/**
 * Local mode for trying the admin under `yarn dev` without GitHub: auto login, and posts are
 * read from / written to the local data/ folder. Never active in a production build.
 */
export function isLocalMode() {
  return process.env.NODE_ENV === 'development' && process.env.ADMIN_LOCAL_MODE === 'true'
}

export function readSession(req: RequestLike): Session | null {
  if (isLocalMode()) {
    return { login: 'local', exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }
  }
  let token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null
  let [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  let expected = Buffer.from(sign(encoded))
  let actual = Buffer.from(signature)
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null
  }

  try {
    let session = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Session
    if (session.exp < Math.floor(Date.now() / 1000)) return null
    if (!isAllowedLogin(session.login)) return null
    return session
  } catch {
    return null
  }
}

export function isAllowedLogin(login: string) {
  let allowed = process.env.ADMIN_GITHUB_USERNAME
  return Boolean(allowed) && login.toLowerCase() === allowed.toLowerCase()
}

export function cookie(name: string, value: string, maxAge: number) {
  let parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

export function getBaseUrl(req: RequestLike) {
  let proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || 'http'
  let host = (req.headers['x-forwarded-host'] as string) || req.headers.host
  return `${proto}://${host}`
}

/** Guard for API routes. Returns the session, or sends 401 and returns null. */
export function requireAdminApi(req: NextApiRequest, res: NextApiResponse) {
  let session = readSession(req)
  if (!session) {
    res.status(401).json({ message: 'Unauthorized' })
    return null
  }
  return session
}

/** Guard for admin pages. Returns the session, or null when the visitor must log in. */
export function getAdminSession(ctx: GetServerSidePropsContext) {
  return readSession(ctx.req as unknown as RequestLike)
}

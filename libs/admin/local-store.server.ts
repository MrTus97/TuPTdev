import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  BLOG_LOCALES,
  parsePost,
  postPath,
  summarizePosts,
  type BlogLocale,
  type CommitFile,
} from './content.server'
import type { ContentKind } from './types'

/**
 * Local content store for trying the admin with `yarn dev` (ADMIN_LOCAL_MODE=true):
 * reads and writes posts in this checkout's data/ folder instead of GitHub.
 */

const root = process.cwd()
const blobDir = path.join(os.tmpdir(), 'tupt-admin-blobs')

export async function listPosts(kind: ContentKind) {
  let files = BLOG_LOCALES.flatMap((locale) => {
    let dir = path.join(root, 'data', locale, kind)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).map((name) => ({
      locale,
      name,
      text: fs.readFileSync(path.join(dir, name), 'utf8'),
    }))
  })
  return summarizePosts(files)
}

export async function getPost(locale: BlogLocale, slug: string, kind: ContentKind) {
  let file = path.join(root, postPath(locale, slug, kind))
  return fs.existsSync(file) ? parsePost(locale, slug, fs.readFileSync(file, 'utf8')) : null
}

/** Keep uploaded images in a temp folder until the post is saved, like git blobs. */
export async function uploadBlob(base64: string) {
  let data = Buffer.from(base64, 'base64')
  let sha = crypto.createHash('sha1').update(data).digest('hex')
  fs.mkdirSync(blobDir, { recursive: true })
  fs.writeFileSync(path.join(blobDir, sha), data)
  return sha
}

export async function commitFiles(files: CommitFile[]) {
  for (let file of files) {
    let target = path.join(root, file.path)
    if (!target.startsWith(root + path.sep)) throw new Error(`Invalid path: ${file.path}`)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    if ('content' in file) {
      fs.writeFileSync(target, file.content, 'utf8')
    } else {
      if (!/^[a-f0-9]{40}$/.test(file.blobSha)) throw new Error('Invalid image id')
      fs.copyFileSync(path.join(blobDir, file.blobSha), target)
    }
  }
  return { sha: 'local', html_url: null as string | null }
}

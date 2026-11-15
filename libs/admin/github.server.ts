import { isLocalMode } from './auth.server'
import {
  BLOG_LOCALES,
  parsePost,
  postPath,
  summarizePosts,
  type BlogLocale,
  type CommitFile,
} from './content.server'
import * as local from './local-store.server'
import type { AdminPostSource, AdminPostSummary, ContentKind } from './types'

export { BLOG_LOCALES, isValidSlug, postPath } from './content.server'
export type { BlogLocale, CommitFile } from './content.server'

/**
 * Reads and writes blog content in the GitHub repo. Saving creates one commit on the
 * configured branch, which triggers a normal Vercel deploy.
 *
 * Env: GITHUB_CONTENT_TOKEN (fine-grained token, Contents: read & write on the repo),
 *      GITHUB_CONTENT_REPO ("owner/name"), GITHUB_CONTENT_BRANCH (default "main").
 * With ADMIN_LOCAL_MODE=true under `yarn dev`, every call goes to the local data/ folder instead.
 */

const API = 'https://api.github.com'

function config() {
  let token = process.env.GITHUB_CONTENT_TOKEN
  let repo = process.env.GITHUB_CONTENT_REPO
  if (!token || !repo) {
    throw new Error('GITHUB_CONTENT_TOKEN and GITHUB_CONTENT_REPO must be set')
  }
  return { token, repo, branch: process.env.GITHUB_CONTENT_BRANCH || 'main' }
}

async function gh<T>(path: string, init: Parameters<typeof fetch>[1] = {}): Promise<T> {
  let { token } = config()
  let res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    throw new Error(
      `GitHub ${init.method || 'GET'} ${path} failed: ${res.status} ${await res.text()}`
    )
  }
  return res.json() as Promise<T>
}

/** List posts of every locale, read straight from GitHub so unpublished commits show up too. */
export async function listPosts(kind: ContentKind = 'blog'): Promise<AdminPostSummary[]> {
  if (isLocalMode()) return local.listPosts(kind)

  let { repo, branch } = config()
  let [owner, name] = repo.split('/')
  let query = `
    query($owner: String!, $name: String!, ${BLOG_LOCALES.map((l) => `$${l}: String!`).join(', ')}) {
      repository(owner: $owner, name: $name) {
        ${BLOG_LOCALES.map(
          (l) => `${l}: object(expression: $${l}) {
            ... on Tree { entries { name object { ... on Blob { text } } } }
          }`
        ).join('\n')}
      }
    }`
  let variables: Record<string, string> = { owner, name }
  for (let l of BLOG_LOCALES) variables[l] = `${branch}:data/${l}/${kind}`

  let { data, errors } = await gh<{ data: any; errors?: unknown }>('/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  })
  if (errors) throw new Error(`GitHub GraphQL error: ${JSON.stringify(errors)}`)

  return summarizePosts(
    BLOG_LOCALES.flatMap((locale) =>
      (data.repository[locale]?.entries ?? [])
        .filter((entry) => typeof entry.object?.text === 'string')
        .map((entry) => ({ locale, name: entry.name as string, text: entry.object.text as string }))
    )
  )
}

/** Read one post in one locale. Returns null when that locale doesn't exist yet. */
export async function getPost(
  locale: BlogLocale,
  slug: string,
  kind: ContentKind = 'blog'
): Promise<AdminPostSource | null> {
  if (isLocalMode()) return local.getPost(locale, slug, kind)

  let { token, repo, branch } = config()
  let res = await fetch(
    `${API}/repos/${repo}/contents/${postPath(locale, slug, kind)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Accept: 'application/vnd.github.raw+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status} ${await res.text()}`)
  return parsePost(locale, slug, await res.text())
}

/**
 * Upload an image as a git blob. Blobs don't create commits (so no deploy);
 * the returned sha is referenced by the tree when the post is saved.
 */
export async function uploadBlob(base64: string) {
  if (isLocalMode()) return local.uploadBlob(base64)

  let { repo } = config()
  let blob = await gh<{ sha: string }>(`/repos/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: base64, encoding: 'base64' }),
  })
  return blob.sha
}

/** Create a single commit with all files on the configured branch. */
export async function commitFiles(
  files: CommitFile[],
  message: string
): Promise<{ sha: string; html_url: string | null }> {
  if (isLocalMode()) return local.commitFiles(files)

  let { repo, branch } = config()
  let ref = await gh<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${branch}`)
  let parentSha = ref.object.sha
  let parent = await gh<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${parentSha}`)

  let tree = await gh<{ sha: string }>(`/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: files.map((f) =>
        'content' in f
          ? { path: f.path, mode: '100644', type: 'blob', content: f.content }
          : { path: f.path, mode: '100644', type: 'blob', sha: f.blobSha }
      ),
    }),
  })

  let commit = await gh<{ sha: string; html_url: string }>(`/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  })

  // Not forced: fails if the branch moved meanwhile, instead of overwriting someone's push
  await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })
  return commit
}

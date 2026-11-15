import type { GetServerSideProps } from 'next'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { AdminShell, LoginScreen } from '~/components/admin/AdminShell'
import { getAdminPageProps, type AdminPageProps } from '~/libs/admin/page.server'
import {
  CONTENT_KINDS,
  CONTENT_LABELS,
  toContentKind,
  type AdminPostSummary,
} from '~/libs/admin/types'

export const getServerSideProps: GetServerSideProps = getAdminPageProps

export default function AdminPosts({ login, localMode }: AdminPageProps) {
  let router = useRouter()
  let kind = toContentKind(router.query.kind)
  let label = CONTENT_LABELS[kind]
  let [posts, setPosts] = useState<AdminPostSummary[] | null>(null)
  let [error, setError] = useState('')

  useEffect(() => {
    if (!login) return
    setPosts(null)
    setError('')
    fetch(`/api/admin/posts/?kind=${kind}`)
      .then(async (res) => {
        let data = await res.json()
        if (!res.ok) throw new Error(data.message)
        setPosts(data)
      })
      .catch((err) => setError(err.message))
  }, [login, kind])

  if (!login) {
    return (
      <AdminShell title="Đăng nhập" login={null}>
        <LoginScreen />
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title={label.plural}
      login={login}
      localMode={localMode}
      actions={
        <NextLink
          href={`/admin/editor/?kind=${kind}`}
          className="rounded-lg bg-[#251097] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1c0c75] dark:bg-[#8B7CFF] dark:text-gray-900"
        >
          + Viết {label.single} mới
        </NextLink>
      }
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {CONTENT_KINDS.map((k) => (
            <NextLink
              key={k}
              href={k === 'blog' ? '/admin/' : `/admin/?kind=${k}`}
              className={`-mb-px border-b-2 px-4 py-2 text-lg font-semibold ${
                k === kind
                  ? 'border-[#251097] text-gray-900 dark:border-[#8B7CFF] dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {CONTENT_LABELS[k].plural}
            </NextLink>
          ))}
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {!posts && !error && <p className="text-gray-500">Đang tải danh sách…</p>}
        {posts && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="hidden px-4 py-3 md:table-cell">Ngày</th>
                  <th className="px-4 py-3">Ngôn ngữ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {posts.map((post) => (
                  <tr key={post.slug} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <NextLink
                        href={`/admin/editor/?kind=${kind}&slug=${post.slug}`}
                        className="font-medium hover:underline"
                      >
                        {post.title}
                      </NextLink>
                      <div className="font-mono text-xs text-gray-400">{post.slug}</div>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-gray-500 md:table-cell">
                      {post.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {['vi', 'en'].map((l) => (
                          <span
                            key={l}
                            className={
                              post.locales.includes(l)
                                ? 'rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase dark:bg-gray-700'
                                : 'rounded border border-dashed border-amber-400 px-1.5 py-0.5 text-xs uppercase text-amber-600'
                            }
                            title={post.locales.includes(l) ? undefined : 'Chưa có bản này'}
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {post.draft ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Nháp
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                          Đã đăng
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

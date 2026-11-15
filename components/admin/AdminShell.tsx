import Head from 'next/head'
import NextLink from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ThemeSwitcher } from '~/components/ThemeSwitcher'

export function AdminShell({
  title,
  login,
  localMode = false,
  actions,
  children,
}: {
  title: string
  login: string | null
  localMode?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <Head>
        <title>{`${title} · Admin`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark dark:text-gray-100">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-dark/90">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
            <NextLink href="/admin/" className="flex items-center gap-2 font-semibold">
              <img src="/static/images/tus-logo.svg" alt="" className="h-7 w-auto dark:hidden" />
              <img
                src="/static/images/tus-logo-dark.svg"
                alt=""
                className="hidden h-7 w-auto dark:block"
              />
              <span>Admin</span>
            </NextLink>
            {localMode && (
              <span
                className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                title="ADMIN_LOCAL_MODE=true: đọc/ghi bài trong thư mục data/ trên máy, không dùng GitHub"
              >
                Chế độ local
              </span>
            )}
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <NextLink
                href="/admin/"
                className="rounded px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Bài viết
              </NextLink>
              <NextLink
                href="/"
                className="rounded px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Xem site
              </NextLink>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {actions}
              <ThemeSwitcher />
              {login && !localMode && (
                // API route: needs a full page navigation, not client-side routing
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a
                  href="/api/admin/logout/"
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  title={`Đăng xuất @${login}`}
                >
                  Đăng xuất
                </a>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
      </div>
    </>
  )
}

export function LoginScreen() {
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Đăng nhập trang quản trị</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Chỉ tài khoản GitHub của chủ blog mới vào được.
      </p>
      {/* API route: needs a full page navigation, not client-side routing */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/api/admin/login/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
      >
        Đăng nhập bằng GitHub
      </a>
    </div>
  )
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  let styles =
    variant === 'primary'
      ? 'bg-[#251097] text-white hover:bg-[#1c0c75] dark:bg-[#8B7CFF] dark:text-gray-900 dark:hover:bg-[#a497ff]'
      : 'border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

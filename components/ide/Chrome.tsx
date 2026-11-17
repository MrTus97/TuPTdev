import clsx from 'clsx'
import { useTheme } from 'next-themes'
import NextImage from 'next/image'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import {
  AreaChart,
  Bell,
  Blocks,
  CircleUser,
  Files,
  GitBranch,
  Github,
  Menu,
  MoonStar,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  CircleX,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { siteMetadata } from '~/data/siteMetadata'
import { useLocale } from '~/hooks/useLocale'
import { describePath } from './files'
import { getEditorScroller, onEditorScroll, scrollEditorTo } from './scroll'
import { useWorkbench, type SideView } from './Workbench'

export function TitleBar() {
  let { locale } = useRouter()
  let { setQuickOpen, toggleSidebar, activePath } = useWorkbench()
  let info = describePath(activePath, locale)

  return (
    <header className="relative z-50 flex h-[35px] shrink-0 items-center gap-2 border-b border-vsc-border bg-vsc-title px-2 font-ui text-[13px] text-vsc-title-fg">
      <button
        type="button"
        aria-label="Toggle side bar"
        onClick={toggleSidebar}
        className="rounded p-1 hover:bg-vsc-hover md:hidden"
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>
      <NextLink
        href="/"
        aria-label="tupt.dev home"
        className="flex shrink-0 items-center"
        data-umami-event="logo"
      >
        <NextImage
          src="/static/images/tus-logo.svg"
          alt="TuPT logo"
          width={18}
          height={20}
          className="block dark:hidden"
          priority
        />
        <NextImage
          src="/static/images/tus-logo-dark.svg"
          alt="TuPT logo"
          width={18}
          height={20}
          className="hidden dark:block"
          priority
        />
      </NextLink>
      <nav className="hidden items-center lg:flex" aria-label="Menu">
        {[
          { label: 'File', run: () => setQuickOpen('') },
          { label: 'Edit', run: () => setQuickOpen('>') },
          { label: 'View', run: () => setQuickOpen('>View') },
          { label: 'Go', run: () => setQuickOpen('') },
          { label: 'Help', href: siteMetadata.siteRepo },
        ].map((m) =>
          m.href ? (
            <a
              key={m.label}
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded px-2 py-0.5 hover:bg-vsc-hover"
            >
              {m.label}
            </a>
          ) : (
            <button
              key={m.label}
              type="button"
              onClick={m.run}
              className="rounded px-2 py-0.5 hover:bg-vsc-hover"
            >
              {m.label}
            </button>
          )
        )}
      </nav>
      {/* Command center */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          onClick={() => setQuickOpen('')}
          className="flex h-[24px] w-full max-w-[38rem] items-center justify-center gap-1.5 rounded-md border border-vsc-border bg-vsc-input px-2 text-[12px] text-vsc-muted hover:bg-vsc-hover"
          aria-label="Search files (Ctrl+P)"
        >
          <Search size={14} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline">{info.name} — </span>tupt.dev
          </span>
          <kbd className="ml-2 hidden font-ui text-[11px] opacity-70 sm:inline">Ctrl+P</kbd>
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <ThemeToggle className="rounded p-1 hover:bg-vsc-hover" size={16} />
        <LocaleToggle className="rounded px-1.5 py-0.5 text-[12px] font-semibold hover:bg-vsc-hover" />
      </div>
    </header>
  )
}

function ActivityButton({
  label,
  active,
  onClick,
  href,
  children,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
  children: ReactNode
}) {
  let className = clsx(
    'relative flex h-12 w-12 items-center justify-center hover:text-vsc-activity-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-vsc-focus',
    active ? 'text-vsc-activity-fg' : 'text-vsc-activity-muted'
  )
  let inner = (
    <>
      {active && (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-vsc-activity-fg" />
      )}
      {children}
    </>
  )
  if (href) {
    let external = !href.startsWith('/')
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={className}
      >
        {inner}
      </a>
    ) : (
      <NextLink href={href} aria-label={label} title={label} className={className}>
        {inner}
      </NextLink>
    )
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={className}
    >
      {inner}
    </button>
  )
}

export function ActivityBar() {
  let { sideView, sidebarOpen, drawerOpen, showView, setQuickOpen } = useWorkbench()
  let views: { view: SideView; label: string; icon: ReactNode }[] = [
    {
      view: 'explorer',
      label: 'Explorer (Ctrl+Shift+E)',
      icon: <Files size={24} strokeWidth={1.25} />,
    },
    {
      view: 'search',
      label: 'Search (Ctrl+Shift+F)',
      icon: <Search size={24} strokeWidth={1.25} />,
    },
    {
      view: 'extensions',
      label: 'Extensions — side projects',
      icon: <Blocks size={24} strokeWidth={1.25} />,
    },
  ]
  return (
    <nav
      aria-label="Activity bar"
      className="flex h-full w-12 shrink-0 flex-col justify-between bg-vsc-activity"
    >
      <div>
        {views.map((v) => (
          <ActivityButton
            key={v.view}
            label={v.label}
            active={(sidebarOpen || drawerOpen) && sideView === v.view}
            onClick={() => showView(v.view)}
          >
            {v.icon}
          </ActivityButton>
        ))}
        <ActivityButton label="Source Control — GitHub" href={siteMetadata.github}>
          <GitBranch size={24} strokeWidth={1.25} />
        </ActivityButton>
      </div>
      <div>
        <ActivityButton label="Accounts — Resume" href="/resume/">
          <CircleUser size={24} strokeWidth={1.25} />
        </ActivityButton>
        <ActivityButton
          label="Manage — Command Palette (Ctrl+Shift+P)"
          onClick={() => setQuickOpen('>')}
        >
          <Settings size={24} strokeWidth={1.25} />
        </ActivityButton>
      </div>
    </nav>
  )
}

function ThemeToggle({ className, size = 14 }: { className?: string; size?: number }) {
  let [mounted, setMounted] = useState(false)
  let { resolvedTheme, setTheme } = useTheme()
  useEffect(() => setMounted(true), [])
  let isDark = mounted && resolvedTheme === 'dark'
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title={isDark ? 'Color theme: Dark+' : 'Color theme: Light+'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={className}
      data-umami-event="nav-theme-switcher"
    >
      {isDark ? <MoonStar size={size} strokeWidth={1.5} /> : <Sun size={size} strokeWidth={1.5} />}
    </button>
  )
}

function LocaleToggle({ className }: { className?: string }) {
  let [locale, localeCodes, updateLocale] = useLocale()
  let next = localeCodes.find((c) => c !== locale.code) || locale.code
  return (
    <button
      type="button"
      aria-label={`Switch language to ${next.toUpperCase()}`}
      title={`Display language: ${locale.name}`}
      onClick={() => updateLocale(next)}
      className={className}
    >
      {locale.code.toUpperCase()}
    </button>
  )
}

function useReadingPosition() {
  let { activePath } = useWorkbench()
  let [pos, setPos] = useState({ line: 1, percent: 0 })
  useEffect(() => {
    let onScroll = () => {
      let el = getEditorScroller()
      if (!el) return
      let max = el.scrollHeight - el.clientHeight
      let percent = max > 0 ? Math.round((el.scrollTop / max) * 100) : 100
      // "Line" = how many 24px lines of the document are above the viewport
      let line = Math.max(1, Math.round(el.scrollTop / 24) + 1)
      setPos({ line, percent })
    }
    onScroll()
    return onEditorScroll(onScroll)
  }, [activePath])
  return pos
}

export function StatusBar() {
  let { locale } = useRouter()
  let { activePath, setQuickOpen } = useWorkbench()
  let info = describePath(activePath, locale)
  let { line, percent } = useReadingPosition()
  let item = 'flex h-full items-center gap-1 px-2 hover:bg-vsc-status-hover'

  return (
    <footer className="relative z-50 flex h-[22px] shrink-0 items-center justify-between bg-vsc-status font-ui text-[12px] text-white">
      <div className="flex h-full min-w-0 items-center">
        <NextLink
          href="/"
          className="flex h-full items-center bg-vsc-remote px-2.5"
          aria-label="Home"
          title="tupt.dev"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M4.5 3.5 1 7l3.5 3.5.7-.7L2.4 7l2.8-2.8-.7-.7Zm7 0-.7.7L13.6 7l-2.8 2.8.7.7L15 7l-3.5-3.5ZM6 12.5 9 1.5l1 .3-3 11-1-.3Z" />
          </svg>
        </NextLink>
        <a
          href={siteMetadata.siteRepo}
          target="_blank"
          rel="noopener noreferrer"
          className={item}
          title="Source on GitHub"
        >
          <GitBranch size={13} />
          main
        </a>
        <span className={clsx(item, 'hidden sm:flex')} title="No problems">
          <CircleX size={13} /> 0 <TriangleAlert size={13} className="ml-1" /> 0
        </span>
      </div>
      <div className="flex h-full items-center">
        <button
          type="button"
          className={clsx(item, 'hidden sm:flex')}
          onClick={() => scrollEditorTo(0)}
          title="Go to top"
        >
          Ln {line}, Col 1
        </button>
        <span className={clsx(item, 'hidden lg:flex')}>{percent}%</span>
        <span className={clsx(item, 'hidden lg:flex')}>Spaces: 2</span>
        <span className={clsx(item, 'hidden lg:flex')}>UTF-8</span>
        <span className={clsx(item, 'hidden md:flex')}>LF</span>
        <button
          type="button"
          className={clsx(item, 'hidden sm:flex')}
          onClick={() => setQuickOpen('')}
          title="Select language mode"
        >
          {info.language}
        </button>
        <LocaleToggle className={item} />
        <ThemeToggle className={item} />
        <a
          href={siteMetadata.analyticsURL}
          target="_blank"
          rel="noopener noreferrer"
          className={item}
          aria-label="Open analytics"
          title="Analytics"
          data-umami-event="nav-analytics"
        >
          <AreaChart size={13} />
        </a>
        <a
          href={siteMetadata.github}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(item, 'hidden sm:flex')}
          aria-label="GitHub"
          title="GitHub"
        >
          <Github size={13} />
        </a>
        <span className={clsx(item, 'hidden sm:flex')} aria-hidden="true">
          <Bell size={13} />
        </span>
      </div>
    </footer>
  )
}

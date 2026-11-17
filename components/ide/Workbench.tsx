import { useRouter } from 'next/router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { normalizePath } from './files'
import { primeKeyboard } from './keyboard'
import { getEditorScroller, scrollEditorTo } from './scroll'
import { clearSearchHighlight } from './search'

export type SideView = 'explorer' | 'search' | 'projects'

interface WorkbenchState {
  tabs: string[]
  activePath: string // the route on screen
  pendingPath: string | null // a route being loaded (its tab is already open and focused)
  focusedPath: string // pendingPath ?? activePath: what the tabs/explorer highlight
  openTab: (path: string) => void
  closeTab: (path: string) => void
  closeOthers: (path: string) => void
  sideView: SideView
  sidebarOpen: boolean // desktop: side bar visible
  drawerOpen: boolean // mobile: activity bar + side bar slid in
  showView: (view: SideView) => void
  toggleSidebar: () => void
  closeDrawer: () => void
  quickOpen: string | null // null = closed, otherwise the initial query ('>' = commands)
  setQuickOpen: (query: string | null) => void
}

const Ctx = createContext<WorkbenchState>(null)
const STORAGE_KEY = 'tupt.ide.tabs'
const MAX_TABS = 20

export function useWorkbench() {
  return useContext(Ctx)
}

function isMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

/** Pages that open as editor tabs: everything but the admin CMS, which has its own layout. */
function isTabPath(path: string) {
  return !/^\/admin(\/|$)/.test(path)
}

function readStoredTabs(): string[] {
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY)
    let tabs = raw ? JSON.parse(raw) : []
    return Array.isArray(tabs)
      ? tabs.filter((t) => typeof t === 'string' && t.startsWith('/') && isTabPath(t))
      : []
  } catch {
    return []
  }
}

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  let router = useRouter()
  let activePath = normalizePath(router.asPath)
  let [tabs, setTabs] = useState<string[]>([activePath])
  let [restored, setRestored] = useState(false)
  let [sideView, setSideView] = useState<SideView>('explorer')
  let [sidebarOpen, setSidebarOpen] = useState(true)
  let [drawerOpen, setDrawerOpen] = useState(false)
  let [quickOpen, setQuickOpenState] = useState<string | null>(null)
  // Called from taps/clicks: bring the mobile keyboard up within the gesture (see ./keyboard)
  let setQuickOpen = useCallback((query: string | null) => {
    if (query !== null) primeKeyboard()
    setQuickOpenState(query)
  }, [])
  let [pendingPath, setPendingPath] = useState<string | null>(null)
  let addedOnStart = useRef<string | null>(null) // tab opened for a route that may still fail

  // Per-tab scroll position, restored when switching back to a tab (like an editor's viewport)
  let scrollByPath = useRef<Record<string, number>>({})
  let restoreFor = useRef<string | null>(null)

  // Restore tabs from the last visit, after hydration so server and client markup match
  useEffect(() => {
    setTabs((current) => {
      let stored = readStoredTabs()
      return stored.includes(current[0]) ? stored : [...stored, ...current]
    })
    setRestored(true)
  }, [])

  // Every navigation opens (or focuses) a tab
  useEffect(() => {
    setTabs((current) => {
      if (current.includes(activePath)) return current
      let next = [...current, activePath]
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next
    })
  }, [activePath])

  useEffect(() => {
    if (!restored) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
    } catch {
      // storage unavailable (private mode): tabs just don't persist
    }
  }, [tabs, restored])

  useEffect(() => {
    let stripLocale = (url: string) =>
      normalizePath(url.replace(new RegExp(`^/(${(router.locales || []).join('|')})(?=/)`), ''))
    let onStart = (url: string) => {
      scrollByPath.current[normalizePath(router.asPath)] = getEditorScroller()?.scrollTop || 0
      clearSearchHighlight() // a revealed search match belongs to the page being left
      // Like VS Code, the tab opens right away and shows progress until the page is rendered
      let path = stripLocale(url)
      if (path === normalizePath(router.asPath)) return // locale switch / same page
      if (!isTabPath(path)) return // leaving the workbench (admin CMS)
      setPendingPath(path)
      setTabs((current) => {
        if (current.includes(path)) return current
        addedOnStart.current = path
        return [...current, path]
      })
    }
    let onError = (_err: unknown, url: string) => {
      let path = stripLocale(url)
      setPendingPath((p) => (p === path ? null : p))
      if (addedOnStart.current === path) setTabs((current) => current.filter((t) => t !== path))
      addedOnStart.current = null
    }
    let onComplete = (url: string) => {
      let path = stripLocale(url)
      // Only clear the indicator of this route: a newer navigation may already be loading
      setPendingPath((p) => (p === path ? null : p))
      if (addedOnStart.current === path) addedOnStart.current = null
      // Next.js only resets the window's scroll; the editor is its own scroll container, so a
      // switched-to tab gets its saved position back and a newly opened page starts at the top
      // (unless the URL targets an anchor, which Next scrolls into view itself)
      if (restoreFor.current === path) {
        let y = scrollByPath.current[path] || 0
        requestAnimationFrame(() => scrollEditorTo(y, 'instant'))
      } else if (!url.includes('#')) {
        scrollEditorTo(0, 'instant')
      }
      restoreFor.current = null
      setDrawerOpen(false)
    }
    router.events.on('routeChangeStart', onStart)
    router.events.on('routeChangeComplete', onComplete)
    router.events.on('routeChangeError', onError)
    return () => {
      router.events.off('routeChangeStart', onStart)
      router.events.off('routeChangeComplete', onComplete)
      router.events.off('routeChangeError', onError)
    }
  }, [router])

  // While a route loads, its tab is the focused one; acting on "the active tab" means that one
  let focusedPath = pendingPath ?? activePath

  let openTab = useCallback(
    (path: string) => {
      if (path === focusedPath) return
      // Switching back to the page on screen cancels the pending load (Next aborts it)
      restoreFor.current = path === activePath ? null : path
      router.push(path, undefined, { scroll: false })
    },
    [router, activePath, focusedPath]
  )

  let closeTab = useCallback(
    (path: string) => {
      let index = tabs.indexOf(path)
      let next = tabs.filter((t) => t !== path)
      if (path === focusedPath) {
        if (next.length === 0) {
          // Like VS Code's empty editor group, but a website always shows something: go home
          next = ['/']
          if (focusedPath !== '/') router.push('/')
        } else {
          openTab(next[Math.min(index, next.length - 1)])
        }
      }
      setTabs(next)
    },
    [tabs, focusedPath, openTab, router]
  )

  let closeOthers = useCallback(
    (path: string) => {
      setTabs([path])
      if (path !== focusedPath) openTab(path)
    },
    [focusedPath, openTab]
  )

  let showView = useCallback(
    (view: SideView) => {
      if (isMobile()) {
        if (view === 'search') primeKeyboard() // the Search view focuses its input
        setSideView(view)
        setDrawerOpen(true)
      } else if (view === sideView && sidebarOpen) {
        // Clicking the active activity-bar icon collapses the side bar, as in VS Code
        setSidebarOpen(false)
      } else {
        setSideView(view)
        setSidebarOpen(true)
      }
    },
    [sideView, sidebarOpen]
  )

  let toggleSidebar = useCallback(() => {
    if (isMobile()) setDrawerOpen((open) => !open)
    else setSidebarOpen((open) => !open)
  }, [])
  let closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Global shortcuts: Ctrl/Cmd+P quick open, Ctrl/Cmd+Shift+P commands, Ctrl/Cmd+B side bar,
  // Ctrl/Cmd+Shift+F search, Ctrl/Cmd+Shift+E explorer, Alt+W close tab (Ctrl+W would close the browser tab)
  useEffect(() => {
    let onKey = (e: KeyboardEvent) => {
      let mod = e.ctrlKey || e.metaKey
      let key = e.key.toLowerCase()
      if (mod && key === 'p') {
        e.preventDefault()
        setQuickOpen(e.shiftKey ? '>' : '')
      } else if (mod && !e.shiftKey && key === 'b') {
        e.preventDefault()
        toggleSidebar()
      } else if (mod && e.shiftKey && (key === 'f' || key === 'e')) {
        e.preventDefault()
        setSideView(key === 'f' ? 'search' : 'explorer')
        setSidebarOpen(true)
      } else if (e.altKey && key === 'w') {
        e.preventDefault()
        closeTab(focusedPath)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar, closeTab, focusedPath, setQuickOpen])

  let value = useMemo<WorkbenchState>(
    () => ({
      tabs,
      activePath,
      pendingPath,
      focusedPath,
      openTab,
      closeTab,
      closeOthers,
      sideView,
      sidebarOpen,
      drawerOpen,
      showView,
      toggleSidebar,
      closeDrawer,
      quickOpen,
      setQuickOpen,
    }),
    [
      tabs,
      activePath,
      pendingPath,
      focusedPath,
      openTab,
      closeTab,
      closeOthers,
      sideView,
      sidebarOpen,
      drawerOpen,
      showView,
      toggleSidebar,
      closeDrawer,
      quickOpen,
      setQuickOpen,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

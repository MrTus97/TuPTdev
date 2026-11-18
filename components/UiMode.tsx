import { useRouter } from 'next/router'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Two interfaces for the public site:
 * - "user" (default): the classic blog layout with the top menu
 * - "dev": the VS Code-style workbench (components/ide)
 *
 * Chosen with the toggle in either interface, or with `?mode=dev|user` in any URL; the choice is
 * remembered in localStorage. Pages are statically rendered in user mode (the server can't know
 * the choice); a script in pages/_document.tsx hides the page until the dev interface is mounted,
 * so returning dev users don't see the user layout flash first.
 */
export type UiMode = 'user' | 'dev'

const STORAGE_KEY = 'tupt.ui.mode'
const PARAM = 'mode'
// Set on <html> by pages/_document.tsx while a stored/requested dev mode isn't on screen yet
export const UI_PENDING_ATTR = 'data-ui-pending'

function isMode(value: unknown): value is UiMode {
  return value === 'user' || value === 'dev'
}

function readStored(): UiMode | null {
  try {
    let value = window.localStorage.getItem(STORAGE_KEY)
    return isMode(value) ? value : null
  } catch {
    return null
  }
}

function persist(mode: UiMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // storage unavailable: the mode lasts for this visit only
  }
}

/** Show the page again (see UI_PENDING_ATTR). */
export function revealUi() {
  document.documentElement.removeAttribute(UI_PENDING_ATTR)
}

interface UiModeState {
  mode: UiMode
  setMode: (mode: UiMode) => void
}

// Default for trees outside the provider (e.g. the admin preview): the user interface
const Ctx = createContext<UiModeState>({ mode: 'user', setMode: () => {} })

export function useUiMode() {
  return useContext(Ctx)
}

export function UiModeProvider({ children }: { children: ReactNode }) {
  let router = useRouter()
  // The first client render must match the statically rendered (user) HTML
  let [mode, setModeState] = useState<UiMode>('user')

  // Drop ?mode= from the address bar once applied, so a later toggle isn't overridden on reload
  let stripParam = useCallback(() => {
    let [beforeHash, hash] = router.asPath.split('#')
    let [path, query = ''] = beforeHash.split('?')
    let params = new URLSearchParams(query)
    if (!params.has(PARAM)) return
    params.delete(PARAM)
    let qs = params.toString()
    router.replace(`${path}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`, undefined, {
      shallow: true,
      scroll: false,
    })
  }, [router])

  // ?mode= in the URL wins (and is remembered), then the remembered mode, then "user"
  useEffect(() => {
    let param = new URLSearchParams(window.location.search).get(PARAM)
    if (isMode(param)) persist(param)
    let next = isMode(param) ? param : readStored() ?? 'user'
    setModeState(next)
    if (next === 'user') revealUi() // dev reveals once the workbench is mounted
  }, [router.asPath])

  useEffect(() => {
    if (router.isReady) stripParam()
  }, [router.isReady, router.asPath, stripParam])

  let setMode = useCallback(
    (next: UiMode) => {
      persist(next)
      // The two layouts scroll differently (window vs the editor); start the new one at the top
      window.scrollTo(0, 0)
      setModeState(next)
      stripParam()
    },
    [stripParam]
  )

  let value = useMemo(() => ({ mode, setMode }), [mode, setMode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Inline script for pages/_document.tsx: runs before the first paint and hides the page when the
 * dev interface will replace the statically rendered user one (with a timeout as a safety net).
 */
export const UI_MODE_BOOT_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search).get('${PARAM}');var m=p==='dev'||p==='user'?p:localStorage.getItem('${STORAGE_KEY}');if(m==='dev'){var d=document.documentElement;d.setAttribute('${UI_PENDING_ATTR}','');setTimeout(function(){d.removeAttribute('${UI_PENDING_ATTR}')},4000)}}catch(e){}})()`

import { useSyncExternalStore } from 'react'

/**
 * Site-wide "wrap long lines" preference for code blocks. Toggling it in any code block wraps
 * every code block (the `code-wrap` class on <html>, see css/tailwind.css) and is remembered.
 */
const STORAGE_KEY = 'tupt.code.wrap'
const CLASS = 'code-wrap'
let listeners = new Set<() => void>()
let wrap: boolean | null = null

function read(): boolean {
  if (wrap === null) {
    try {
      wrap = window.localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      wrap = false
    }
    document.documentElement.classList.toggle(CLASS, wrap)
  }
  return wrap
}

export function setCodeWrap(next: boolean) {
  wrap = next
  document.documentElement.classList.toggle(CLASS, next)
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // storage unavailable: the preference lasts for this visit only
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCodeWrap() {
  return useSyncExternalStore(subscribe, read, () => false)
}

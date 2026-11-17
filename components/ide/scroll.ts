/**
 * The workbench is a fixed-height app: the page never scrolls, the editor content and the side
 * bar each scroll in their own container. Everything that used to read/scroll the window
 * (minimap, outline, status bar, tab scroll restore, scroll-to-top, ToC) goes through here.
 */
export const EDITOR_SCROLL_ID = 'ide-scroll'

export function getEditorScroller(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById(EDITOR_SCROLL_ID)
}

export function scrollEditorTo(top: number, behavior: 'smooth' | 'instant' = 'smooth') {
  getEditorScroller()?.scrollTo({ top, behavior })
}

/** Subscribe to editor scrolling; returns the unsubscribe function. */
export function onEditorScroll(listener: () => void) {
  let el = getEditorScroller()
  if (!el) return () => {}
  el.addEventListener('scroll', listener, { passive: true })
  return () => el.removeEventListener('scroll', listener)
}

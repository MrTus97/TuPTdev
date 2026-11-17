/**
 * Mobile browsers (iOS Safari especially) only open the on-screen keyboard when an input is
 * focused synchronously inside the tap's event handler. Quick open and the Search view mount
 * their input after the tap, in an effect, so focusing it there doesn't bring the keyboard up.
 *
 * Fix: during the tap, focus an invisible "proxy" input (the keyboard opens), then move the focus
 * to the real input once it's rendered; moving focus between inputs keeps the keyboard open.
 */
let proxy: HTMLInputElement | null = null

function isTouch() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

export function primeKeyboard() {
  // Only touch devices have an on-screen keyboard to bring up
  if (!isTouch()) return
  rememberZoom()
  if (!proxy) {
    proxy = document.createElement('input')
    proxy.type = 'text'
    proxy.setAttribute('aria-hidden', 'true')
    proxy.tabIndex = -1
    // 16px: iOS zooms the page when focusing a smaller input
    proxy.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;pointer-events:none;'
    document.body.appendChild(proxy)
  }
  proxy.focus({ preventScroll: true })
}

/**
 * Opening the keyboard can leave the page zoomed in (iOS zooms into focused inputs; some
 * browsers do it whatever the font size). Remember the zoom before an input takes focus, and
 * when it's done (blur / quick open closed) zoom back out, but only if the zoom grew meanwhile:
 * a reader who had pinch-zoomed on purpose keeps their zoom.
 */
let zoomBefore: number | null = null

export function rememberZoom() {
  if (!isTouch() || zoomBefore !== null) return
  zoomBefore = window.visualViewport?.scale ?? 1
}

export function restoreZoom() {
  if (zoomBefore === null) return
  let before = zoomBefore
  zoomBefore = null
  let scale = window.visualViewport?.scale ?? 1
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta || before > 1.01 || scale <= before + 0.01) return
  // There's no API to set the zoom: briefly capping the viewport at scale 1 snaps it back,
  // then the original viewport (pinch zoom allowed) is restored
  let original = meta.content
  meta.content = `${original}, maximum-scale=1`
  setTimeout(() => {
    meta.content = original
  }, 300)
}

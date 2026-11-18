import { useRouter } from 'next/router'
import { useState } from 'react'
import { HEADER_HEIGHT, MAIN_CONTENT_MIN_HEIGHT } from '~/constant'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

// Pages that fill the screen below the header (an embedded side project showcase)
const FULL_BLEED_ROUTES = ['/side-projects/[slug]']

/** The classic blog layout ("user" interface, see ./UiMode): top menu, centered content, footer. */
export function UserLayout({ children }) {
  let { pathname } = useRouter()
  let [navShow, setNavShow] = useState(false)
  let onToggleNav = () => setNavShow((status) => !status)

  return (
    <>
      <MobileNav navShow={navShow} onToggleNav={onToggleNav} />
      <Header navShow={navShow} onToggleNav={onToggleNav} />
      {FULL_BLEED_ROUTES.includes(pathname) ? (
        <main style={{ height: `calc(100dvh - ${HEADER_HEIGHT})` }}>{children}</main>
      ) : (
        <div className="mx-auto max-w-3xl px-3 sm:px-6 xl:max-w-5xl xl:px-0">
          <div className="flex flex-col justify-between">
            <main style={{ minHeight: MAIN_CONTENT_MIN_HEIGHT }}>{children}</main>
            <Footer />
          </div>
        </div>
      )}
    </>
  )
}

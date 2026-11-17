import clsx from 'clsx'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { Footer } from '~/components/Footer'
import { ActivityBar, StatusBar, TitleBar } from './Chrome'
import { Breadcrumbs, EditorTabs } from './EditorTabs'
import { Explorer } from './Explorer'
import { ExtensionsView } from './ExtensionsView'
import { Minimap } from './Minimap'
import { EDITOR_ID } from './Outline'
import { EDITOR_SCROLL_ID } from './scroll'
import { QuickOpen } from './QuickOpen'
import { SearchView } from './SearchView'
import { useWorkbench, WorkbenchProvider } from './Workbench'

/**
 * VS Code-style workbench around every public page:
 *
 *   title bar (command center)
 *   activity bar | side bar (explorer/search/extensions) | tabs + breadcrumbs / editor | minimap
 *   status bar
 *
 * The page itself never scrolls: the side bar panels and the editor (#ide-scroll) each have
 * their own scroll container, like VS Code. See ./scroll.ts.
 */
export function IdeShell({ children }: { children: ReactNode }) {
  return (
    <WorkbenchProvider>
      <Workbench>{children}</Workbench>
    </WorkbenchProvider>
  )
}

// Routes that fill the whole editor area (an embedded page has its own layout and scrolling)
const FULL_BLEED_ROUTES = ['/side-projects/[slug]']

function Workbench({ children }: { children: ReactNode }) {
  let { pathname } = useRouter()
  let { sideView, sidebarOpen, drawerOpen, closeDrawer, pendingPath } = useWorkbench()
  let fullBleed = FULL_BLEED_ROUTES.includes(pathname)

  return (
    // Fixed-height app: only the side bar panels and the editor scroll, never the page
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-vsc-editor">
      <TitleBar />
      <div className="relative flex min-h-0 flex-1">
        {/* Mobile: drawer overlay; desktop: columns */}
        {drawerOpen && (
          <button
            type="button"
            aria-label="Close side bar"
            className="absolute inset-0 z-30 bg-black/40 md:hidden"
            onClick={closeDrawer}
          />
        )}
        <div
          className={clsx(
            'absolute inset-y-0 left-0 z-40 flex font-ui transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:transition-none',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <ActivityBar />
          <aside
            aria-label="Side bar"
            className={clsx(
              'h-full w-[min(80vw,280px)] border-r border-vsc-border bg-vsc-sidebar md:w-[260px] xl:w-[280px]',
              !sidebarOpen && 'md:hidden'
            )}
          >
            {sideView === 'explorer' && <Explorer />}
            {sideView === 'search' && <SearchView />}
            {sideView === 'extensions' && <ExtensionsView />}
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative shrink-0 font-ui">
            <EditorTabs />
            <Breadcrumbs />
            {pendingPath && (
              <div
                role="progressbar"
                aria-label="Loading"
                className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
              >
                <div className="vsc-progress h-full w-1/3 bg-vsc-accent" />
              </div>
            )}
          </div>
          <div className="flex min-h-0 flex-1">
            <div
              id={EDITOR_SCROLL_ID}
              className={clsx(
                // relative: absolutely positioned content scrolls with the page, not the viewport
                'relative min-w-0 flex-1 scroll-pt-3',
                fullBleed ? 'overflow-hidden' : 'vsc-scroll overflow-y-auto'
              )}
            >
              {fullBleed ? (
                <main id={EDITOR_ID} className="h-full">
                  {children}
                </main>
              ) : (
                <main id={EDITOR_ID} className="px-4 pb-4 pt-2 sm:px-8 lg:px-12">
                  <div className="mx-auto max-w-3xl xl:max-w-4xl">
                    {children}
                    <Footer />
                  </div>
                </main>
              )}
            </div>
            {!fullBleed && (
              <div className="hidden w-[100px] shrink-0 shadow-[-1px_0_0_var(--vsc-border)] lg:block">
                <Minimap />
              </div>
            )}
          </div>
        </div>
      </div>
      <StatusBar />
      <QuickOpen />
    </div>
  )
}

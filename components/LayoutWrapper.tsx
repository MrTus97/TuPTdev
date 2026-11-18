import dynamic from 'next/dynamic'
import { useUiMode } from './UiMode'
import { UserLayout } from './UserLayout'

// The dev interface is only ever chosen in the browser, so it's never server-rendered and its code
// is only downloaded by those who use it
const IdeShell = dynamic(() => import('./ide/IdeShell').then((m) => m.IdeShell), { ssr: false })

/** Public pages render in the interface the visitor chose (see ./UiMode); admin pages bypass this. */
export function LayoutWrapper({ children }) {
  let { mode } = useUiMode()
  return mode === 'dev' ? <IdeShell>{children}</IdeShell> : <UserLayout>{children}</UserLayout>
}

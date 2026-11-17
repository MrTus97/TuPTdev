import { IdeShell } from './ide/IdeShell'

/** Public pages render inside the VS Code-style workbench (admin pages bypass it in _app). */
export function LayoutWrapper({ children }) {
  return <IdeShell>{children}</IdeShell>
}

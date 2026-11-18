import NextLink from 'next/link'
import type { AnchorHTMLAttributes } from 'react'
import { sideProjectHref, sideProjectShowcaseSrc } from '~/data/sideProjectsData'
import { useUiMode } from './UiMode'

/**
 * Link to a side project's showcase. In the dev interface it opens in an editor tab
 * (pages/side-projects/[slug].tsx); in the user interface the static showcase page opens in a new
 * browser tab, as it always did (it has its own "← tupt.dev" link back).
 */
export function SideProjectLink({
  slug,
  children,
  ...rest
}: { slug: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  let { mode } = useUiMode()
  return mode === 'dev' ? (
    <NextLink href={sideProjectHref(slug)} {...rest}>
      {children}
    </NextLink>
  ) : (
    <a href={sideProjectShowcaseSrc(slug)} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  )
}

import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { localized, sideProjectHref, sideProjects } from '~/data/sideProjectsData'
import { PanelHeader } from './Explorer'

/** Side projects listed like installed extensions. */
export function ExtensionsView() {
  let { locale } = useRouter()
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Extensions" />
      <p className="px-5 pb-1 text-[11px] font-bold uppercase tracking-wide text-vsc-sidebar-fg">
        Installed · {sideProjects.length}
      </p>
      <ul className="vsc-scroll min-h-0 flex-1 overflow-y-auto">
        {sideProjects.map((p) => (
          <li key={p.slug}>
            <NextLink
              href={sideProjectHref(p.slug)}
              data-umami-event={`side-project-${p.slug}`}
              className="flex gap-3 px-5 py-2.5 hover:bg-vsc-hover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imgSrc}
                alt=""
                width={42}
                height={42}
                className="h-[42px] w-[42px] shrink-0 rounded object-cover"
              />
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-semibold text-vsc-tab-active-fg">{p.title}</p>
                <p className="truncate text-vsc-sidebar-fg">{localized(p.tagline, locale)}</p>
                <p className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-vsc-muted">
                  <span className="truncate">{p.builtWith.join(' · ')}</span>
                  <span className="shrink-0 rounded-sm bg-vsc-accent px-1.5 text-[11px] text-white">
                    Open
                  </span>
                </p>
              </div>
            </NextLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

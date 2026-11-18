import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { localized, sideProjectShowcaseSrc, sideProjects } from '~/data/sideProjectsData'
import { Link } from './Link'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './ui/Popover'

// Showcases are static HTML pages under public/, opened in a new tab with a plain <a>
// (a Next.js <Link> would try to client-side route to a page that doesn't exist).
export function SideProjectsMenu() {
  let { t } = useTranslation('common')
  let { pathname, locale } = useRouter()

  return (
    <Popover>
      <PopoverTrigger
        className={clsx(
          'inline-flex items-center gap-1 rounded px-3 py-1 font-medium',
          pathname.startsWith('/side-projects')
            ? 'bg-gray-200 dark:bg-gray-700'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        )}
        data-umami-event="nav-side-projects"
      >
        {t('menu_side_projects')}
        <ChevronDown size={16} strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-white dark:bg-dark" align="start" sideOffset={8}>
        <div className="space-y-1">
          {sideProjects.map((project) => (
            <a
              key={project.slug}
              href={sideProjectShowcaseSrc(project.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              data-umami-event={`nav-side-project-${project.slug}`}
            >
              <span className="block font-medium">{project.title}</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">
                {localized(project.tagline, locale)}
              </span>
            </a>
          ))}
          <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
            <PopoverClose asChild>
              <Link
                href="/side-projects"
                className="block rounded px-3 py-2 text-sm font-medium text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('side_projects.all')} &rarr;
              </Link>
            </PopoverClose>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

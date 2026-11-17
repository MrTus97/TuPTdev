import { PageSeo } from 'components/SEO'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { localized, sideProjectHref, sideProjects } from '~/data/sideProjectsData'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default function SideProjects() {
  let { t } = useTranslation('common')
  let { locale } = useRouter()
  let description = t('side_projects.description')

  return (
    <>
      <PageSeo
        title={`${t('side_projects.title')} - ${t('site_meta_data.author')} - ${t(
          'site_meta_data.title'
        )}`}
        description={description}
      />
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            {t('side_projects.title')}
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 md:text-lg md:leading-7">
            {description}
          </p>
        </div>
        <div className="container py-12">
          <div className="-m-4 flex flex-wrap">
            {sideProjects.map((project) => {
              let href = sideProjectHref(project.slug)
              return (
                <div key={project.slug} className="p-4 md:w-1/2" style={{ maxWidth: '544px' }}>
                  {/* Opens the showcase in an editor tab (pages/side-projects/[slug].tsx) */}
                  <NextLink
                    href={href}
                    className="group flex h-full flex-col overflow-hidden rounded-lg shadow-nextjs dark:shadow-nextjs-dark"
                    data-umami-event={`side-project-${project.slug}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.imgSrc}
                      alt={project.title}
                      width={1200}
                      height={630}
                      loading="lazy"
                      className="aspect-[1200/630] w-full object-cover object-center"
                    />
                    <div className="flex grow flex-col justify-between space-y-6 p-4 md:p-6">
                      <div className="space-y-3">
                        <h2 className="text-2xl font-bold leading-8 tracking-tight group-hover:text-primary-500">
                          {project.title}
                        </h2>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {localized(project.tagline, locale)}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {localized(project.description, locale)}
                        </p>
                        <div className="flex flex-wrap gap-x-1.5 text-gray-500 dark:text-gray-400">
                          <span className="shrink-0">{t('projects.built_with')}:</span>
                          {project.builtWith.map((tool, index) => (
                            <span
                              key={tool}
                              className="font-semibold text-gray-600 dark:text-gray-300"
                            >
                              {tool}
                              {index !== project.builtWith.length - 1 && ','}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-base font-medium leading-6 text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {t('side_projects.view')} &rarr;
                      </span>
                    </div>
                  </NextLink>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

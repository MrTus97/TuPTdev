import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { PageSeo } from '~/components/SEO'
import { localized, sideProjects, sideProjectShowcaseSrc } from '~/data/sideProjectsData'

export async function getStaticPaths({ locales }: { locales: string[] }) {
  return {
    paths: locales.flatMap((locale) =>
      sideProjects.map((p) => ({ params: { slug: p.slug }, locale }))
    ),
    fallback: false,
  }
}

export async function getStaticProps({ params, locale }) {
  return {
    props: {
      slug: params.slug,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

/**
 * A side project's static showcase (public/side-projects/<slug>/index.html), shown inside the
 * editor tab so the workbench (explorer, tabs, status bar) stays around it. IdeShell renders
 * this route full-bleed: no content padding, footer or minimap.
 */
export default function SideProjectShowcase({ slug }: { slug: string }) {
  let { t } = useTranslation('common')
  let { locale } = useRouter()
  let project = sideProjects.find((p) => p.slug === slug)

  return (
    <>
      <PageSeo
        title={`${project.title} - ${t('side_projects.title')} - ${t('site_meta_data.title')}`}
        description={localized(project.description, locale)}
      />
      <iframe
        key={slug}
        src={sideProjectShowcaseSrc(slug)}
        title={project.title}
        className="block h-full w-full border-0 bg-white"
      />
    </>
  )
}

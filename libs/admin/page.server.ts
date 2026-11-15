import type { GetServerSidePropsContext } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getAdminSession, isLocalMode } from './auth.server'

export type AdminPageProps = { login: string | null; localMode: boolean }

/** getServerSideProps for admin pages: passes the logged-in GitHub login (or null). */
export async function getAdminPageProps(ctx: GetServerSidePropsContext) {
  let session = getAdminSession(ctx)
  return {
    props: {
      login: session?.login ?? null,
      localMode: isLocalMode(),
      // Shared components (search, links) use translations, so load them like other pages
      ...(await serverSideTranslations(ctx.locale ?? 'vi', ['common'])),
    },
  }
}

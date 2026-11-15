import { useTranslation } from 'next-i18next'
import { siteMetadata } from '~/data/siteMetadata'
import NextJS from '~/icons/nextjs.svg'
import Prisma from '~/icons/prisma.svg'
import TailwindCSS from '~/icons/tailwind.svg'
import Typescript from '~/icons/typescript.svg'
import Umami from '~/icons/umami.svg'
import { Link } from './Link'

export function BuiltWith() {
  let { t } = useTranslation('common')

  return (
    <div className="flex items-center space-x-1">
      <span className="mr-1 text-gray-500 dark:text-gray-400">{t('build_with.built_with')}</span>
      <div className="flex space-x-1.5">
        {/* <Link href="https://nextjs.org?ref=tupt.dev"> */}
        <NextJS className="h-5 w-5" fill="currentColor" />
        {/* </Link> */}
        {/* <Link href="https://tailwindcss.com?ref=tupt.dev"> */}
        <TailwindCSS className="h-5 w-5" fill="currentColor" />
        {/* </Link> */}
        {/* <Link href="https://www.prisma.io?ref=tupt.dev"> */}
        <Prisma className="h-5 w-5" fill="currentColor" />
        {/* </Link> */}
        {/* <Link href="https://www.typescriptlang.org?ref=tupt.dev"> */}
        <Typescript className="h-5 w-5" fill="currentColor" />
        {/* </Link> */}
        {/* <Link href="https://umami.is?ref=tupt.dev" className="pl-px"> */}
        <Umami className="h-5 w-5" fill="currentColor" />
        {/* </Link> */}
      </div>
      <span className="px-1 text-gray-400 dark:text-gray-500">-</span>
      <Link
        href={siteMetadata.siteRepo}
        className="text-gray-500 underline underline-offset-4 dark:text-gray-400"
      >
        <span data-umami-event="view-source">{t('build_with.view_source')}</span>
      </Link>
    </div>
  )
}

'use client'

import React from 'react'
import { KBarSearchProvider } from './components/KBar'
import { useParams, useRouter } from 'next/navigation'
// import siteMetadata from '@/data/siteMetadata'
// import { Authors, allAuthors } from 'contentlayer/generated'
// import siteMetadata from '@/data/siteMetadata'
// import { Authors, allAuthors } from 'contentlayer/generated'
import type { CoreContent } from 'pliny/utils/contentlayer'
// import { Blog } from ' contentlayer/generated'
// import { LocaleTypes } from 'app/[locale]/i18n/settings'
// import { useTranslation } from 'app/[locale]/i18n/client'
// import { fallbackLng } from 'app/[locale]/i18n/locales'
import { useTranslation } from 'next-i18next'
import { HomeIcon, BlogIcon, TagsIcon, ProjectsIcon, AboutIcon } from './icons'
import { useLocale } from '~/hooks/useLocale'

interface SearchProviderProps {
  children: React.ReactNode
}

export const SearchProvider = ({ children }: SearchProviderProps) => {
  // const locale = 'vi' as LocaleTypes
  // const locale = useParams()?.locale as LocaleTypes
  let { t } = useTranslation('common')
  const router = useRouter()

  let [locale, localeCodes, updateLocale] = useLocale()
  // const authors = allAuthors
  //   .filter((a) => a.language === locale)
  //   .sort((a, b) => (a.default === b.default ? 0 : a.default ? -1 : 1)) as Authors[]

  // const authorSearchItems = authors.map((author) => {
  //   const { name, slug } = author
  //   return {
  //     id: slug,
  //     name: name,
  //     keywords: '',
  //     shortcut: [],
  //     section: locale === fallbackLng ? 'Authors' : 'Auteurs',
  //     perform: () => router.push(`/${locale}/about/${slug}`),
  //     icon: (
  //       <i>
  //         <AboutIcon />
  //       </i>
  //     ),
  //   }
  // })

  // const showAuthorsSearch = siteMetadata.multiauthors
  // const authorsActions = [
  //   ...(showAuthorsSearch ? authorSearchItems : []),
  //   ...(showAuthorsSearch
  //     ? []
  //     : [
  //         {
  //           id: 'about',
  //           name: locale === fallbackLng ? 'About' : 'À propos',
  //           keywords: '',
  //           shortcut: ['a'],
  //           section: locale === fallbackLng ? 'Navigate' : 'Naviguer',
  //           perform: () => router.push(`/${locale}/about`),
  //           icon: (
  //             <i>
  //               <AboutIcon />
  //             </i>
  //           ),
  //         },
  //       ]),
  // ]

  /* issue when using regular translations, this is a workaround to show how to implement section titles */
  const navigationSection = locale.code === 'vi' ? 'Điều hướng' : 'Navigator1'

  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: 'search.json',
        /* issue when using regular translations, this is a workaround to show how to implement translated menu titles */
        defaultActions: [
          {
            id: 'home',
            name: 'Home',
            keywords: '',
            shortcut: ['h'],
            section: locale.code === 'vi' ? 'Điều hướng' : 'Navigator1',
            perform: () => router.push(`/${locale.code}`),
            icon: (
              <i>
                <HomeIcon />
              </i>
            ),
          },
          {
            id: 'blog',
            name: 'Blog',
            keywords: '',
            shortcut: ['b'],
            section: navigationSection,
            perform: () => router.push(`/${locale.code}/blog`),
            icon: (
              <i>
                <BlogIcon />
              </i>
            ),
          },
          {
            id: 'tag',
            name: 'Tags',
            keywords: '',
            shortcut: ['t'],
            section: navigationSection,
            perform: () => router.push(`/${locale.code}/tags`),
            icon: (
              <i>
                <TagsIcon />
              </i>
            ),
          },
        ],
        onSearchDocumentsLoad(json) {
          return (
            json
              // .filter((post: CoreContent<Blog>) => post.language === locale)
              .map((post: CoreContent<any>) => ({
                id: post.path,
                name: post.title,
                keywords: post?.summary || '',
                section: t('content'),
                subtitle: post.tags.join(', '),
                perform: () => router.push(`/vi/blog/${post.slug}`),
              }))
          )
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}

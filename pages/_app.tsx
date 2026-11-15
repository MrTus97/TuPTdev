import { appWithTranslation } from 'next-i18next'

import 'css/tailwind.css'
import 'css/twemoji.css'
import 'css/resume.css'

import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import Script from 'next/script'
import { Analytics } from '~/components/analytics'
import { LayoutWrapper } from '~/components/LayoutWrapper'
import { SearchProvider } from '~/components/search/SearchProvider'

function App({ Component, pageProps, router }) {
  let isAdmin = router.pathname.startsWith('/admin')

  return (
    // @ts-ignore
    <ThemeProvider attribute="class">
      <Head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </Head>
      {/* No ads or analytics on the private admin pages */}
      {!isAdmin && (
        <>
          <Script
            strategy="lazyOnload"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1313803833871171"
            crossOrigin="anonymous"
          />
          <Analytics />
        </>
      )}
      <SearchProvider>
        {isAdmin ? (
          // Remount when switching between posts and snippets so editor state never leaks across
          <Component key={`${router.pathname}:${router.query.kind ?? 'blog'}`} {...pageProps} />
        ) : (
          <LayoutWrapper>
            <Component {...pageProps} />
          </LayoutWrapper>
        )}
      </SearchProvider>
    </ThemeProvider>
  )
}

export default appWithTranslation(App)

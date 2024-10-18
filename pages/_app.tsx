import { appWithTranslation } from 'next-i18next'

import 'css/tailwind.css'
import 'css/twemoji.css'
import 'css/resume.css'

import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import { Analytics } from '~/components/analytics'
import { LayoutWrapper } from '~/components/LayoutWrapper'
import { SearchProvider } from '~/components/search/SearchProvider'
import { SpeedInsights } from '@vercel/speed-insights/next'

function App({ Component, pageProps }) {
  return (
    // @ts-ignore
    <ThemeProvider attribute="class">
      <Head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1313803833871171"
          crossOrigin="anonymous"
        ></script>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </Head>
      <Analytics />
      <SearchProvider>
        <LayoutWrapper>
          <Component {...pageProps} />
          <SpeedInsights />
        </LayoutWrapper>
      </SearchProvider>
    </ThemeProvider>
  )
}

export default appWithTranslation(App)

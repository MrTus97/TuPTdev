import Document, { Html, Head, Main, NextScript } from 'next/document'
class MyDocument extends Document {
  render() {
    return (
      <Html lang={process.env.NEXT_PUBLIC_DEFAULT_LOCALE}>
        <Head>
          <link rel="icon" href="/static/favicons/favicon.ico" sizes="48x48" />
          <link rel="icon" href="/static/favicons/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/static/favicons/apple-touch-icon.png" />
          <link rel="manifest" href="/static/favicons/site.webmanifest" />
          <meta name="msapplication-TileColor" content="#251097" />
          <meta name="theme-color" content="#251097" />
          <link rel="alternate" type="application/rss+xml" href="/feed.xml" />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body className="bg-white text-black antialiased dark:bg-dark dark:text-white">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument

export let siteMetadata = {
  siteUrl: 'https://tupt.dev',
  siteRepo: 'https://github.com/MrTus97/Tuptdev',
  siteLogo: '/static/images/logo.png',
  image: '/static/images/logo.png',
  socialBanner: '/static/images/logo.jpg',
  email: 'mr.tus97@gmail.com',
  github: 'https://github.com/MrTus97',
  x: 'https://x.com/MrTus1997',
  facebook: 'https://facebook.com/tupt9x',
  youtube: '#',
  linkedin: 'https://www.linkedin.com/in/tupt/',
  locale: 'vi',
  analyticsURL: 'https://cloud.umami.is/share/n4mu0QKnrlpiWH8X/tupt.dev',
  analytics: {
    plausibleDataDomain: '',
    simpleAnalytics: false, // true | false
    umamiWebsiteId: 'e6c01c0a-6412-4da9-b785-616a4328f922',
    googleAnalyticsId: '', // e.g. UA-000000-2 or G-XXXXXXX
  },
  socialAccounts: {
    github: 'MrTus97',
    linkedin: 'tupt',
    facebook: 'tupt9x',
  },
}

/**
 * Select a provider and use the environment variables associated to it
 * https://vercel.com/docs/environment-variables
 * --
 *
 * Visit each provider's documentation link and follow the instructions, then add the environment variable to your project.
 */
export let commentConfig = {
  provider: 'giscus', // 'giscus' | 'utterances' | 'disqus',
  // https://giscus.app/
  giscusConfig: {
    repo: '', // process.env.GISCUS_REPO
    repositoryId: '', // process.env.GISCUS_REPOSITORY_ID
    category: '', // process.env.GISCUS_CATEGORY
    categoryId: '', // process.env.GISCUS_CATEGORY_ID
    mapping: 'title',
    reactions: '1',
    metadata: '0',
    lightTheme: 'light',
    darkTheme: 'transparent_dark',
    themeURL: '',
  },
  // https://utteranc.es/
  utterancesConfig: {
    repo: '', // process.env.UTTERANCES_REPO
    issueTerm: '',
    label: '',
    lightTheme: '',
    darkTheme: '',
  },
  // https://help.disqus.com/en/articles/1717111-what-s-a-shortname
  disqus: {
    shortname: '', // process.env.DISQUS_SHORTNAME
  },
}

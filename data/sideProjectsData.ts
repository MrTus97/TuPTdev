/**
 * Side projects shown in the header "Side projects" menu and on /side-projects.
 *
 * Each project's showcase is a self-contained static page in
 * `public/side-projects/<slug>/index.html` (with its own img/, icons/ ... next to it),
 * served at `/side-projects/<slug>/` through the rewrite in next.config.js.
 * To add a project: drop its folder into public/side-projects/ and add an entry here.
 */
export type LocalizedText = { en: string; vi: string }

export interface SideProject {
  slug: string
  title: string
  tagline: LocalizedText
  description: LocalizedText
  imgSrc: string
  builtWith: string[]
}

export let sideProjects: SideProject[] = [
  {
    slug: 'cashflow',
    title: 'MoneyTus — Cash flow',
    tagline: {
      en: 'Personal cash flow & shared funds',
      vi: 'Sổ tiền cá nhân & các quỹ giữ hộ',
    },
    description: {
      en: 'One bank account, many funds — always know where the money is and whose it is. Log an expense in 5 seconds, scan VietQR, reconcile with bank statements, split bills, budgets, gold & crypto. A PWA that works offline.',
      vi: 'Một tài khoản, nhiều quỹ — luôn biết tiền nằm ở đâu và là của ai. Ghi chi trong 5 giây, quét VietQR, đối soát sao kê, chia bill, ngân sách, vàng & tiền số. PWA chạy cả khi mất mạng.',
    },
    imgSrc: '/static/images/side-projects/cashflow.png',
    builtWith: ['Next.js', 'PostgreSQL', 'Neon', 'Vercel', 'Firebase'],
  },
]

export function sideProjectHref(slug: string) {
  return `/side-projects/${slug}/`
}

export function localized(text: LocalizedText, locale?: string) {
  return locale === 'vi' ? text.vi : text.en
}

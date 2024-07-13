import type { PageTitleProps } from '~/types/components'

export function PageTitle({ children }: PageTitleProps) {
  return (
    <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 md:text-5xl md:leading-[1.25]">
      {children}
    </h2>
  )
}

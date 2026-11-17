import clsx from 'clsx'
import { ChevronRight, ExternalLink, Folder, FolderOpen, Loader2 } from 'lucide-react'
import type { FileKind } from './files'

/** Small Seti-like file icons, keyed by extension; a spinner while the file is loading. */
export function FileIcon({
  kind,
  className,
  loading,
}: {
  kind: FileKind
  className?: string
  loading?: boolean
}) {
  let base = clsx('inline-flex h-4 w-4 shrink-0 items-center justify-center', className)
  if (loading) {
    return (
      <span className={base} role="status" aria-label="Loading">
        <Loader2 size={14} strokeWidth={2} className="animate-spin text-vsc-accent" />
      </span>
    )
  }
  switch (kind) {
    case 'md':
      return (
        <span className={base} aria-hidden="true">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-[#519aba]" fill="currentColor">
            <path d="M1 4.5A1.5 1.5 0 0 1 2.5 3h11A1.5 1.5 0 0 1 15 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11.5v-7Zm2 6.5h1.5V8l1.25 1.6L7 8v3h1.5V5H7L5.75 6.75 4.5 5H3v6Zm8.5 0 2-2.5H12V5h-1.5v3.5H9L11.5 11Z" />
          </svg>
        </span>
      )
    case 'mdx':
      return (
        <span
          className={clsx(base, 'font-mono text-[9px] font-bold text-[#f9a825]')}
          aria-hidden="true"
        >
          M↓
        </span>
      )
    case 'json':
      return (
        <span
          className={clsx(base, 'font-mono text-[11px] font-bold text-[#cbcb41]')}
          aria-hidden="true"
        >
          {'{}'}
        </span>
      )
    case 'tsx':
      return (
        <span className={base} aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4 text-[#519aba]"
            fill="none"
            stroke="currentColor"
          >
            <ellipse cx="8" cy="8" rx="6.5" ry="2.5" />
            <ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(60 8 8)" />
            <ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(120 8 8)" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          </svg>
        </span>
      )
    case 'html':
      return (
        <span
          className={clsx(base, 'font-mono text-[10px] font-bold text-[#e37933]')}
          aria-hidden="true"
        >
          {'<>'}
        </span>
      )
    case 'link':
      return <ExternalLink className={clsx(base, 'text-[#a074c4]')} size={14} strokeWidth={2} />
  }
}

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <>
      <ChevronRight
        size={16}
        strokeWidth={1.5}
        className={clsx('shrink-0 transition-transform duration-100', open && 'rotate-90')}
      />
      {open ? (
        <FolderOpen size={16} strokeWidth={1.5} className="shrink-0 text-[#dcb67a]" />
      ) : (
        <Folder size={16} strokeWidth={1.5} className="shrink-0 text-[#dcb67a]" />
      )}
    </>
  )
}

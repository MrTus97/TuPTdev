import type { GetServerSideProps } from 'next'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminShell, Button, LoginScreen } from '~/components/admin/AdminShell'
import { BrandIcon, BrandIconsMap } from '~/components/BrandIcon'
import { MdxPreview } from '~/components/admin/MdxPreview'
import { uploadImage, type UploadedImage } from '~/components/admin/image-upload'
import { joinTranslated, splitForTranslation } from '~/libs/admin/chunk'
import { serializeMdx, slugify } from '~/libs/admin/frontmatter'
import { getAdminPageProps, type AdminPageProps } from '~/libs/admin/page.server'
import {
  CONTENT_LABELS,
  toContentKind,
  type AdminPostSource,
  type ContentKind,
  type Frontmatter,
} from '~/libs/admin/types'

export const getServerSideProps: GetServerSideProps = getAdminPageProps

// The WYSIWYG editor is large and browser-only, so it loads on demand
const VisualEditor = dynamic(() => import('~/components/admin/VisualEditor'), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-gray-500">Đang tải trình soạn thảo…</p>,
})

type EditorMode = 'visual' | 'source'

/** Bodies with custom components or imports are safer to edit as raw MDX. */
function hasCustomMdx(body: string) {
  return /^(import|export)\s/m.test(body) || /<[A-Z]/.test(body)
}

type Locale = 'vi' | 'en'
type LocaleText = { title: string; heading: string; summary: string; body: string }
type Shared = {
  slug: string
  date: string
  tags: string
  draft: boolean
  images: string[]
  icon: string // snippets: brand icon shown on the card (frontmatter `type`)
  extra: Frontmatter // other frontmatter keys (authors, layout, ...) are kept as-is
}

const SHARED_KEYS = ['title', 'heading', 'summary', 'date', 'tags', 'draft', 'images', 'type']
const ICON_NAMES = Object.keys(BrandIconsMap) as (keyof typeof BrandIconsMap)[]
const today = () => new Date().toISOString().slice(0, 10)
const emptyText: LocaleText = { title: '', heading: '', summary: '', body: '' }

function toText(post: AdminPostSource | null): LocaleText | null {
  if (!post) return null
  return {
    title: String(post.frontmatter.title ?? ''),
    heading: String(post.frontmatter.heading ?? ''),
    summary: String(post.frontmatter.summary ?? ''),
    body: post.body,
  }
}

function buildSource(kind: ContentKind, text: LocaleText, shared: Shared) {
  let tags = shared.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  let frontmatter: Frontmatter =
    kind === 'snippets'
      ? {
          heading: text.heading || text.title,
          title: text.title,
          date: shared.date,
          type: shared.icon,
          draft: shared.draft,
          summary: text.summary,
          tags,
        }
      : {
          title: text.title,
          date: shared.date,
          tags,
          draft: shared.draft,
          summary: text.summary,
          images: shared.images.filter(Boolean),
        }
  return serializeMdx({ ...frontmatter, ...shared.extra }, text.body)
}

export default function AdminEditor({ login, localMode }: AdminPageProps) {
  let router = useRouter()
  let editSlug = typeof router.query.slug === 'string' ? router.query.slug : ''
  let kind = toContentKind(router.query.kind)
  let isSnippet = kind === 'snippets'
  let label = CONTENT_LABELS[kind].single
  let isNew = !editSlug

  let [loaded, setLoaded] = useState(isNew)
  let [shared, setShared] = useState<Shared>({
    slug: '',
    date: today(),
    tags: '',
    draft: true,
    images: [],
    icon: 'Command',
    extra: toContentKind(router.query.kind) === 'snippets' ? {} : { authors: ['default'] },
  })
  let [texts, setTexts] = useState<Record<Locale, LocaleText | null>>({
    vi: { ...emptyText },
    en: null,
  })
  let [tab, setTab] = useState<Locale>('vi')
  let [slugTouched, setSlugTouched] = useState(false)
  let [uploads, setUploads] = useState<UploadedImage[]>([])
  let [busy, setBusy] = useState<'' | 'translate' | 'save' | 'upload'>('')
  let [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string; link?: string } | null>(
    null
  )
  let [dirty, setDirty] = useState(false)
  let [showPreview, setShowPreview] = useState(true)
  let [mode, setMode] = useState<EditorMode>('visual')
  // Bumped when the body changes from outside the editor (load, translation) to remount it
  let [editorVersion, setEditorVersion] = useState(0)
  let bodyRef = useRef<HTMLTextAreaElement>(null)
  let { resolvedTheme } = useTheme()
  let slugRef = useRef(shared.slug)
  slugRef.current = shared.slug

  // Load an existing post (both locales) from GitHub
  useEffect(() => {
    if (!login || !editSlug) return
    setLoaded(false)
    fetch(`/api/admin/posts/?kind=${kind}&slug=${encodeURIComponent(editSlug)}`)
      .then(async (res) => {
        let data = (await res.json()) as Record<Locale, AdminPostSource | null> & {
          message?: string
        }
        if (!res.ok) throw new Error(data.message)
        let primary = data.vi ?? data.en
        if (!primary) throw new Error(`Không tìm thấy ${label} "${editSlug}".`)
        let fm = primary.frontmatter
        let extra = Object.fromEntries(Object.entries(fm).filter(([k]) => !SHARED_KEYS.includes(k)))
        setShared({
          slug: editSlug,
          date: String(fm.date ?? today()).slice(0, 10),
          tags: Array.isArray(fm.tags) ? fm.tags.join(', ') : String(fm.tags ?? ''),
          draft: fm.draft === true,
          images: Array.isArray(fm.images) ? fm.images.map(String) : [],
          icon: String(fm.type ?? 'Command'),
          extra,
        })
        setTexts({ vi: toText(data.vi) ?? { ...emptyText }, en: toText(data.en) })
        setMode(hasCustomMdx(data.vi?.body ?? data.en?.body ?? '') ? 'source' : 'visual')
        setEditorVersion((v) => v + 1)
        setLoaded(true)
      })
      .catch((err) => setNotice({ type: 'error', text: err.message }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login, editSlug, kind])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    let handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  let current = texts[tab]
  let updateText = (patch: Partial<LocaleText>) => {
    setDirty(true)
    setTexts((t) => ({ ...t, [tab]: { ...(t[tab] ?? emptyText), ...patch } }))
    if (tab === 'vi' && isNew && !slugTouched && patch.title !== undefined) {
      setShared((s) => ({ ...s, slug: slugify(patch.title) }))
    }
  }
  let updateShared = (patch: Partial<Shared>) => {
    setDirty(true)
    setShared((s) => ({ ...s, ...patch }))
  }

  let previewSource = useMemo(
    () => (current ? buildSource(kind, current, shared) : ''),
    [kind, current, shared]
  )
  let imageUrls = useMemo(
    () => Object.fromEntries(uploads.map((u) => [u.url, u.objectUrl])),
    [uploads]
  )

  let insertAtCursor = useCallback(
    (snippet: string) => {
      let el = bodyRef.current
      let body = texts[tab]?.body ?? ''
      let start = el ? el.selectionStart : body.length
      let end = el ? el.selectionEnd : body.length
      updateText({ body: body.slice(0, start) + snippet + body.slice(end) })
      requestAnimationFrame(() => {
        el?.focus()
        el?.setSelectionRange(start + snippet.length, start + snippet.length)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texts, tab]
  )

  async function handleFiles(files: FileList | File[], asCover = false) {
    let images = [...files].filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setBusy('upload')
    setNotice(null)
    try {
      for (let file of images) {
        let uploaded = await uploadImage(file, shared.slug)
        setUploads((u) => [...u, uploaded])
        if (asCover) {
          updateShared({ images: [uploaded.url, ...shared.images.slice(1)] })
          // Posts show the cover through a `thumbnail-image` at the top of the body
          let vi = texts.vi?.body ?? ''
          if (!vi.includes('![thumbnail-image]')) {
            setTexts((t) => ({
              ...t,
              vi: { ...(t.vi ?? emptyText), body: `![thumbnail-image](${uploaded.url})\n\n${vi}` },
            }))
            setEditorVersion((v) => v + 1)
          }
        } else {
          let alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
          insertAtCursor(`\n![${alt}](${uploaded.url})\n`)
        }
      }
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setBusy('')
    }
  }

  let uploadForVisual = useCallback(async (file: File) => {
    let uploaded = await uploadImage(file, slugRef.current)
    setUploads((u) => [...u, uploaded])
    return uploaded.url
  }, [])
  let previewUrl = useCallback((src: string) => imageUrls[src] ?? src, [imageUrls])

  async function translate() {
    let vi = texts.vi
    if (!vi?.body.trim())
      return setNotice({ type: 'error', text: 'Hãy viết bản tiếng Việt trước.' })
    if (
      texts.en?.body.trim() &&
      !confirm('Bản tiếng Anh hiện tại sẽ bị thay bằng bản dịch mới. Tiếp tục?')
    )
      return
    setBusy('translate')
    // Each request must finish within Vercel's 60s limit, so long bodies go in parts
    let parts = splitForTranslation(vi.body)
    let translated: string[] = []
    let meta = { title: '', heading: '', summary: '' }
    try {
      for (let [i, part] of parts.entries()) {
        setNotice({
          type: 'ok',
          text:
            parts.length > 1
              ? `Đang dịch bằng AI… phần ${i + 1}/${parts.length}`
              : 'Đang dịch bằng AI…',
        })
        let first = i === 0
        let res = await fetch('/api/admin/translate/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: first ? vi.title : '',
            heading: first ? vi.heading : '',
            summary: first ? vi.summary : '',
            body: part,
          }),
        })
        let data = await res.json().catch(() => ({ message: `Lỗi máy chủ (${res.status})` }))
        if (!res.ok) {
          throw new Error(
            parts.length > 1 ? `Phần ${i + 1}/${parts.length}: ${data.message}` : data.message
          )
        }
        if (first) meta = { title: data.title, heading: data.heading, summary: data.summary }
        translated.push(data.body)
      }
      setTexts((t) => ({ ...t, en: { ...meta, body: joinTranslated(translated) } }))
      setDirty(true)
      setTab('en')
      setEditorVersion((v) => v + 1)
      setNotice({ type: 'ok', text: 'Đã dịch xong. Hãy đọc lại bản tiếng Anh trước khi lưu.' })
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setBusy('')
    }
  }

  async function save() {
    let vi = texts.vi
    if (!vi?.title.trim() || !vi.body.trim()) {
      setTab('vi')
      return setNotice({ type: 'error', text: 'Bản tiếng Việt cần có tiêu đề và nội dung.' })
    }
    if (!shared.slug) return setNotice({ type: 'error', text: 'Thiếu slug.' })
    if (!texts.en?.body.trim() && !confirm('Chưa có bản tiếng Anh. Vẫn lưu chỉ bản tiếng Việt?'))
      return

    let files: Partial<Record<Locale, string>> = { vi: buildSource(kind, vi, shared) }
    if (texts.en?.body.trim()) files.en = buildSource(kind, texts.en, shared)
    let allSource = Object.values(files).join('\n') + shared.images.join('\n')
    let images = uploads
      .filter((u) => allSource.includes(u.url))
      .map(({ path, sha }) => ({ path, sha }))

    setBusy('save')
    setNotice(null)
    try {
      let res = await fetch('/api/admin/save/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, slug: shared.slug, isNew, files, images }),
      })
      let data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setDirty(false)
      setNotice({
        type: 'ok',
        text: localMode
          ? `Đã lưu vào data/vi|en/${kind}/${shared.slug}.mdx trên máy. Mở /${kind}/${shared.slug}/ để xem bản thật (bỏ đánh dấu nháp nếu cần).`
          : `Đã commit lên GitHub. Vercel sẽ build lại, khoảng 1–2 phút nữa bài ${
              shared.draft ? '(đang ở chế độ nháp) ' : ''
            }sẽ cập nhật trên site.`,
        link: data.url ?? undefined,
      })
      if (isNew) router.replace(`/admin/editor/?kind=${kind}&slug=${shared.slug}`)
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setBusy('')
    }
  }

  if (!login) {
    return (
      <AdminShell title="Đăng nhập" login={null}>
        <LoginScreen />
      </AdminShell>
    )
  }

  let input =
    'w-full rounded-lg border-gray-300 bg-white text-sm focus:border-[#251097] focus:ring-[#251097] dark:border-gray-600 dark:bg-gray-800'

  return (
    <AdminShell
      title={isNew ? `${CONTENT_LABELS[kind].plural}: mới` : texts.vi?.title || editSlug}
      login={login}
      localMode={localMode}
      actions={
        <>
          <Button onClick={translate} disabled={!!busy || !loaded}>
            {busy === 'translate' ? 'Đang dịch…' : 'Dịch sang EN bằng AI'}
          </Button>
          <Button variant="primary" onClick={save} disabled={!!busy || !loaded}>
            {busy === 'save' ? 'Đang lưu…' : localMode ? 'Lưu vào máy' : 'Lưu lên GitHub'}
          </Button>
        </>
      }
    >
      {notice && (
        <div
          className={`mb-4 flex items-start justify-between gap-4 rounded-lg p-3 text-sm ${
            notice.type === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              : 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
          }`}
        >
          <span>
            {notice.text}{' '}
            {notice.link && (
              <a href={notice.link} target="_blank" rel="noreferrer" className="underline">
                Xem commit
              </a>
            )}
          </span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Đóng"
            className="opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {!loaded ? (
        !notice && <p className="text-gray-500">Đang tải {label}…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor column */}
          <section className="space-y-4">
            <details
              open={isNew}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <summary className="cursor-pointer text-sm font-semibold">Thông tin {label}</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-gray-500">Slug (đường dẫn)</span>
                  <input
                    className={`${input} font-mono`}
                    value={shared.slug}
                    disabled={!isNew}
                    onChange={(e) => {
                      setSlugTouched(true)
                      updateShared({ slug: slugify(e.target.value) })
                    }}
                    placeholder="tu-dong-tao-tu-tieu-de"
                  />
                  {!isNew && (
                    <span className="mt-1 block text-xs text-gray-400">
                      Slug của {label} đã đăng không đổi được.
                    </span>
                  )}
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-500">Ngày</span>
                  <input
                    type="date"
                    className={input}
                    value={shared.date}
                    onChange={(e) => updateShared({ date: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-gray-500">Tags (phân cách bằng dấu phẩy)</span>
                  <input
                    className={input}
                    value={shared.tags}
                    onChange={(e) => updateShared({ tags: e.target.value })}
                    placeholder="howto, nextjs"
                  />
                </label>
                {isSnippet ? (
                  <div className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-gray-500">Icon trên thẻ snippet</span>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
                        {shared.icon in BrandIconsMap && (
                          <BrandIcon
                            type={shared.icon as keyof typeof BrandIconsMap}
                            className="h-6 w-6"
                          />
                        )}
                      </span>
                      <select
                        className={input}
                        value={shared.icon}
                        onChange={(e) => updateShared({ icon: e.target.value })}
                      >
                        {ICON_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-gray-500">Ảnh bìa</span>
                    <div className="flex gap-2">
                      <input
                        className={input}
                        value={shared.images[0] ?? ''}
                        onChange={(e) =>
                          updateShared({ images: [e.target.value, ...shared.images.slice(1)] })
                        }
                        placeholder="/static/images/blogs/..."
                      />
                      <label className="inline-flex shrink-0 cursor-pointer items-center rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                        Tải ảnh
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files && handleFiles(e.target.files, true)}
                        />
                      </label>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-[#251097] focus:ring-[#251097]"
                    checked={shared.draft}
                    onChange={(e) => updateShared({ draft: e.target.checked })}
                  />
                  Bản nháp (chưa hiện trên site)
                </label>
              </div>
            </details>

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center gap-1 border-b border-gray-200 px-3 pt-3 dark:border-gray-700">
                {(['vi', 'en'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setTab(l)}
                    className={`-mb-px rounded-t-lg border px-4 py-2 text-sm font-medium ${
                      tab === l
                        ? 'border-gray-200 border-b-white bg-white dark:border-gray-700 dark:border-b-gray-900 dark:bg-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {l === 'vi' ? 'Tiếng Việt' : 'English'}
                    {l === 'en' && !texts.en && (
                      <span className="ml-1 text-xs text-amber-600">(chưa có)</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="ml-auto pb-2 text-xs text-gray-500 hover:text-gray-900 lg:hidden dark:hover:text-white"
                >
                  {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
                </button>
              </div>

              {tab === 'en' && !texts.en ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  <p>Chưa có bản tiếng Anh.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="primary" onClick={translate} disabled={!!busy}>
                      Dịch từ bản tiếng Việt bằng AI
                    </Button>
                    <Button onClick={() => setTexts((t) => ({ ...t, en: { ...emptyText } }))}>
                      Tự viết
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <input
                    className={`${input} text-lg font-semibold`}
                    value={current?.title ?? ''}
                    onChange={(e) => updateText({ title: e.target.value })}
                    placeholder={
                      isSnippet
                        ? tab === 'vi'
                          ? 'Tiêu đề trang snippet'
                          : 'Snippet page title'
                        : tab === 'vi'
                          ? 'Tiêu đề bài viết'
                          : 'Post title'
                    }
                  />
                  {isSnippet && (
                    <input
                      className={input}
                      value={current?.heading ?? ''}
                      onChange={(e) => updateText({ heading: e.target.value })}
                      placeholder={
                        tab === 'vi'
                          ? 'Tiêu đề ngắn trên thẻ snippet (để trống thì dùng tiêu đề)'
                          : 'Short heading for the snippet card'
                      }
                    />
                  )}
                  <textarea
                    className={input}
                    rows={2}
                    value={current?.summary ?? ''}
                    onChange={(e) => updateText({ summary: e.target.value })}
                    placeholder={
                      tab === 'vi'
                        ? 'Tóm tắt ngắn (hiện ở danh sách bài và khi chia sẻ)'
                        : 'Short summary'
                    }
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <div className="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
                      {(
                        [
                          ['visual', 'Trực quan'],
                          ['source', 'MDX gốc'],
                        ] as const
                      ).map(([value, text]) => (
                        <button
                          key={value}
                          onClick={() => setMode(value)}
                          className={`rounded-md px-3 py-1 font-medium ${
                            mode === value
                              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                              : 'hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                    <span className="hidden flex-1 sm:block">
                      {mode === 'visual'
                        ? 'Dùng thanh công cụ hoặc gõ tắt Markdown (## , - , **…**). Dán/kéo ảnh vào để chèn.'
                        : 'MDX gốc: dán hoặc kéo thả ảnh vào ô bên dưới để chèn.'}
                    </span>
                    {mode === 'source' && (
                      <label className="cursor-pointer rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                        {busy === 'upload' ? 'Đang tải ảnh…' : 'Chèn ảnh'}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                  {mode === 'visual' ? (
                    // Fixed height with its own scroll: the toolbar (sticky) and the caret stay in view
                    <div className="h-[calc(100vh-8rem)] min-h-[420px] overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600">
                      <VisualEditor
                        key={`${tab}-${editorVersion}`}
                        markdown={current?.body ?? ''}
                        onChange={(body) => updateText({ body })}
                        uploadImage={uploadForVisual}
                        previewUrl={previewUrl}
                        dark={resolvedTheme === 'dark'}
                        onError={(message) =>
                          setNotice({
                            type: 'error',
                            text: `Trình soạn trực quan không đọc được một phần nội dung (${message}). Hãy chuyển sang "MDX gốc" để sửa phần đó.`,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <textarea
                      ref={bodyRef}
                      className={`${input} h-[calc(100vh-8rem)] min-h-[420px] resize-y font-mono text-[13px] leading-6`}
                      value={current?.body ?? ''}
                      onChange={(e) => updateText({ body: e.target.value })}
                      onPaste={(e) => {
                        if (e.clipboardData.files.length) {
                          e.preventDefault()
                          handleFiles(e.clipboardData.files)
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        if (e.dataTransfer.files.length) {
                          e.preventDefault()
                          handleFiles(e.dataTransfer.files)
                        }
                      }}
                      spellCheck={false}
                      placeholder={'## Mở đầu\n\nViết nội dung bằng Markdown/MDX...'}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Preview column */}
          <section className={`${showPreview ? '' : 'hidden'} lg:block`}>
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                Xem trước · {tab === 'vi' ? 'Tiếng Việt' : 'English'}
              </div>
              <h1 className="mb-6 text-3xl font-extrabold leading-tight">
                {current?.title || 'Chưa có tiêu đề'}
              </h1>
              {current ? (
                <MdxPreview source={previewSource} imageUrls={imageUrls} />
              ) : (
                <p className="text-gray-500">—</p>
              )}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  )
}

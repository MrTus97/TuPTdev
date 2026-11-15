import { getMDXComponent } from 'mdx-bundler/client'
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Image } from '~/components/Image'
import { Link } from '~/components/Link'
import { Pre } from '~/components/Pre'

const components = { Image, a: Link, pre: Pre }

/**
 * Live preview: the server bundles the MDX with the real pipeline (debounced),
 * then it renders here with the same components as published posts.
 * `imageUrls` maps not-yet-committed image paths to local object URLs.
 */
export function MdxPreview({
  source,
  imageUrls,
}: {
  source: string
  imageUrls: Record<string, string>
}) {
  let [code, setCode] = useState('')
  let [error, setError] = useState('')
  let [loading, setLoading] = useState(false)

  useEffect(() => {
    let controller = new AbortController()
    let timer = setTimeout(async () => {
      let withLocalImages = Object.entries(imageUrls).reduce(
        (src, [path, url]) => src.split(path).join(url),
        source
      )
      setLoading(true)
      try {
        let res = await fetch('/api/admin/preview/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: withLocalImages }),
          signal: controller.signal,
        })
        let data = await res.json()
        if (!res.ok) throw new Error(data.message)
        setCode(data.code)
        setError('')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 600)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [source, imageUrls])

  let Content = useMemo(() => (code ? getMDXComponent(code) : null), [code])

  return (
    <div className="relative">
      {loading && (
        <span className="absolute right-0 top-0 text-xs text-gray-400">Đang cập nhật…</span>
      )}
      {error && (
        <pre className="mb-4 whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </pre>
      )}
      <PreviewErrorBoundary resetKey={code}>
        <div className="prose prose-base max-w-none dark:prose-dark md:prose-lg">
          {Content ? <Content components={components} /> : !error && <p>…</p>}
        </div>
      </PreviewErrorBoundary>
    </div>
  )
}

class PreviewErrorBoundary extends Component<
  { resetKey: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <pre className="whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          Lỗi khi hiển thị: {this.state.error.message}
        </pre>
      )
    }
    return this.props.children
  }
}

const MAX_WIDTH = 1920
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024 // stays under Vercel's 4.5MB body limit after base64

export type UploadedImage = { path: string; url: string; sha: string; objectUrl: string }

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Downscale large photos in the browser; keep GIFs and small PNG/WebP files untouched. */
async function optimize(file: File): Promise<{ blob: Blob; ext: string }> {
  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return { blob: file, ext }

  let bitmap = await createImageBitmap(file)
  let keepAsIs = bitmap.width <= MAX_WIDTH && (file.size < 600 * 1024 || file.type === 'image/png')
  if (keepAsIs && file.size <= MAX_UPLOAD_BYTES) {
    bitmap.close()
    return { blob: file, ext: ext === 'jpeg' ? 'jpg' : ext }
  }

  let scale = Math.min(1, MAX_WIDTH / bitmap.width)
  let canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  let ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  let blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  return { blob, ext: 'jpg' }
}

/** Optimize an image and store it as a git blob; it gets committed together with the post. */
export async function uploadImage(file: File, slug: string): Promise<UploadedImage> {
  let { blob, ext } = await optimize(file)
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Ảnh "${file.name}" vẫn quá lớn sau khi nén (tối đa 3.5MB).`)
  }
  let base = (slug || 'image').slice(0, 60)
  let name = `${base}-${Date.now().toString(36)}.${ext}`
  let res = await fetch('/api/admin/upload/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: await readAsBase64(blob) }),
  })
  let data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return {
    path: `public/static/images/blogs/${name}`,
    url: `/static/images/blogs/${name}`,
    sha: data.sha,
    objectUrl: URL.createObjectURL(blob),
  }
}

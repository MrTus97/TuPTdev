/**
 * Split an MDX body into pieces small enough to translate within one serverless call
 * (Vercel Hobby caps functions at 60s). Splits happen before headings, or at blank lines
 * when a section is still too long, and never inside fenced code blocks.
 */
export function splitForTranslation(body: string, maxChars = 4000): string[] {
  let blocks: string[] = []
  let current: string[] = []
  let inFence = false

  let flush = () => {
    if (current.length) blocks.push(current.join('\n'))
    current = []
  }

  for (let line of body.split('\n')) {
    let isFence = /^\s*(```|~~~)/.test(line)
    let size = current.join('\n').length
    if (!inFence && current.length) {
      if (/^#{1,6}\s/.test(line)) flush()
      else if (line.trim() === '' && size > maxChars) flush()
    }
    current.push(line)
    if (isFence) inFence = !inFence
  }
  flush()

  // Pack small blocks together up to maxChars
  let chunks: string[] = []
  for (let block of blocks) {
    let last = chunks[chunks.length - 1]
    if (last !== undefined && last.length + block.length + 1 <= maxChars) {
      chunks[chunks.length - 1] = `${last}\n${block}`
    } else {
      chunks.push(block)
    }
  }
  return chunks.filter((c) => c.trim())
}

export function joinTranslated(chunks: string[]) {
  return chunks.map((c) => c.replace(/^\n+|\s+$/g, '')).join('\n\n') + '\n'
}

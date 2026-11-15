import Anthropic from '@anthropic-ai/sdk'

/**
 * Translate a Vietnamese blog post (title, summary, MDX body) to English with Claude.
 * Env: ANTHROPIC_API_KEY.
 */

const MODEL = 'claude-opus-5-5'

const SYSTEM_PROMPT = `You translate posts for tupt.dev, a Vietnamese software-engineering blog, from Vietnamese into natural, fluent English for developers.

The body is MDX. Translate only the human-readable prose and keep everything else byte-for-byte:
- Keep \`import\` lines, JSX/HTML tags, component names and their non-text props, URLs, image paths, anchors and HTML entities unchanged.
- Translate human-readable text inside JSX children and text props like alt, title, caption.
- Keep fenced code blocks and inline code unchanged, except translate Vietnamese comments inside code.
- Keep the Markdown structure exactly: headings, lists, tables, blank lines, emphasis.
- Keep product names, brand names and established technical terms in their usual English form.
- Write the way a native English-speaking engineer would explain it; don't translate word by word.

The "heading" field is a short heading for a snippet card. Any of title, heading and summary may be empty; return an empty string for an empty input field.

Long posts arrive in several parts, so the body may start or end mid-post. Translate the part as it is, without adding an introduction, a conclusion or headings that aren't there.

Return the translated title, heading, summary and body.`

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    heading: { type: 'string' },
    summary: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['title', 'heading', 'summary', 'body'],
  additionalProperties: false,
}

export type TranslationInput = { title: string; heading: string; summary: string; body: string }

export class TranslationError extends Error {}

let client: Anthropic | null = null

export async function translateToEnglish(input: TranslationInput): Promise<TranslationInput> {
  // Vercel Hobby stops functions at 60s: fail cleanly before that instead of being killed
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 0 })

  // Streaming because long posts produce long outputs; finalMessage() gathers the result.
  let stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      // Translation doesn't need deep reasoning; low effort keeps each call well under 60s
      effort: 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<post>\n${JSON.stringify(input, null, 2)}\n</post>`,
      },
    ],
  })
  let message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new TranslationError('Claude từ chối dịch bài này.')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new TranslationError('Bài quá dài, bản dịch bị cắt giữa chừng. Hãy chia nhỏ bài.')
  }

  let text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { text: string }).text)
    .join('')
  try {
    return JSON.parse(text) as TranslationInput
  } catch {
    throw new TranslationError('Không đọc được kết quả dịch, hãy thử lại.')
  }
}

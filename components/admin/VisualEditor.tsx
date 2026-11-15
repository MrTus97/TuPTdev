import '@mdxeditor/editor/style.css'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  GenericJsxEditor,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  imagePlugin,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type JsxComponentDescriptor,
} from '@mdxeditor/editor'
import { useMemo, useRef } from 'react'

/**
 * WYSIWYG editor for the post body (loaded client-side only, see VisualEditor usage).
 *
 * MDXEditor only keeps `import`/`export` lines it knows about, so they are split off before
 * editing and put back at the top on every change. Custom components stay as editable JSX blocks.
 */

const CODE_LANGUAGES = {
  '': 'Plain text',
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  python: 'Python',
  java: 'Java',
  sql: 'SQL',
  yaml: 'YAML',
  liquid: 'Liquid',
  diff: 'Diff',
}

// Any JSX element (custom components, <div>…) is kept and editable as a generic block
const JSX_DESCRIPTORS: JsxComponentDescriptor[] = [
  { name: '*', kind: 'flow', props: [], hasChildren: true, Editor: GenericJsxEditor },
]

/** Split top-level import/export lines (outside code fences) from the rest of the body. */
export function splitModuleLines(body: string) {
  let modules: string[] = []
  let content: string[] = []
  let inFence = false
  for (let line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && /^(import|export)\s/.test(line)) modules.push(line)
    else content.push(line)
  }
  return { modules: modules.join('\n'), content: content.join('\n').replace(/^\n+/, '') }
}

function joinModuleLines(modules: string, content: string) {
  return modules ? `${modules}\n\n${content.replace(/^\n+/, '')}` : content
}

export default function VisualEditor({
  markdown,
  onChange,
  uploadImage,
  previewUrl,
  onError,
  dark,
}: {
  markdown: string
  onChange: (markdown: string) => void
  uploadImage: (file: File) => Promise<string>
  /** Maps not-yet-committed image paths to local object URLs */
  previewUrl: (src: string) => string
  onError: (message: string) => void
  dark: boolean
}) {
  // Only the initial value is read; the parent remounts this component (via `key`) on external changes
  let { modules, content } = useMemo(() => splitModuleLines(markdown), []) // eslint-disable-line react-hooks/exhaustive-deps
  let modulesRef = useRef(modules)
  let previewRef = useRef(previewUrl)
  previewRef.current = previewUrl

  let plugins = useMemo(
    () => [
      headingsPlugin({ allowedHeadingLevels: [2, 3, 4] }),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      imagePlugin({
        imageUploadHandler: uploadImage,
        imagePreviewHandler: async (src) => previewRef.current(src),
      }),
      codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
      codeMirrorPlugin({ codeBlockLanguages: CODE_LANGUAGES }),
      jsxPlugin({ jsxComponentDescriptors: JSX_DESCRIPTORS }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <Separator />
            <ListsToggle />
            <CreateLink />
            <InsertImage />
            <InsertTable />
            <InsertCodeBlock />
            <InsertThematicBreak />
          </>
        ),
      }),
    ],
    [uploadImage]
  )

  return (
    <MDXEditor
      markdown={content}
      plugins={plugins}
      className={`admin-visual-editor ${dark ? 'dark-theme' : ''}`}
      // Fill the scroll box so clicking anywhere below the text still places the caret
      contentEditableClassName="prose prose-base max-w-none dark:prose-dark min-h-[calc(100vh-12rem)]"
      // Match the existing posts' Markdown style
      toMarkdownOptions={{ bullet: '-', emphasis: '*', strong: '*', rule: '-' }}
      onChange={(value, initialNormalize) => {
        // Ignore MDXEditor's own reformatting on load so opening a post doesn't mark it changed
        if (initialNormalize) return
        onChange(joinModuleLines(modulesRef.current, value))
      }}
      onError={({ error }) => onError(error)}
    />
  )
}

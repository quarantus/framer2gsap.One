import { useEffect, useRef, useState } from 'react'
import { config } from '@/config'
import type { OutputFiles, ParsedSection } from '@/store/exporter'
import { downloadZip } from '@/lib/exporter'

type Tab = 'html' | 'css' | 'js'
type Format = 'separate' | 'single'

interface Props {
  files: OutputFiles
  sections: ParsedSection[]
  selectedIds: string[]
  renames: Record<string, string>
  onBack: () => void
  onStartOver: () => void
}

function syntaxHighlight(code: string, lang: Tab): string {
  // Simple tokenizer-based highlighting
  if (lang === 'html') {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;\/?[a-zA-Z][^&]*?&gt;)/g, '<span class="sh-tag">$1</span>')
      .replace(/(class|id|href|src|style|data-[a-z-]+)=/g, '<span class="sh-attr">$1</span>=')
      .replace(/&quot;([^&]*)&quot;/g, '&quot;<span class="sh-str">$1</span>&quot;')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sh-comment">$1</span>')
  }
  if (lang === 'css') {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sh-comment">$1</span>')
      .replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]*)\s*\{/g, '<span class="sh-selector">$1</span> {')
      .replace(/([\w-]+)\s*:/g, '<span class="sh-prop">$1</span>:')
      .replace(/:\s*([^;{}\n]+)/g, ': <span class="sh-val">$&</span>'.replace('$&', '<span class="sh-val">$1</span>'))
      .replace(/@media[^{]+/g, (m) => `<span class="sh-at">${m}</span>`)
  }
  // js
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/(\/\/[^\n]*)/g, '<span class="sh-comment">$1</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|forEach|new|import|export|from|async|await)\b/g, '<span class="sh-kw">$1</span>')
    .replace(/"([^"]*)"/g, '<span class="sh-str">"$1"</span>')
    .replace(/'([^']*)'/g, "<span class=\"sh-str\">'$1'</span>")
    .replace(/`([^`]*)`/g, '<span class="sh-str">`$1`</span>')
}

export default function Step3Export({ files, sections, selectedIds, onBack, onStartOver }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('html')
  const [formats, setFormats] = useState<Record<Format, boolean>>({ separate: true, single: false })
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  const tabContent: Record<Tab, string> = {
    html: files.html,
    css: files.css,
    js: files.js,
  }

  const lineCount = (s: string) => s.split('\n').length

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadZip(files)
    } finally {
      setDownloading(false)
    }
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    'Just exported my Framer project to clean HTML+CSS+GSAP with Framer to Code Exporter!'
  )}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : ''
  )}`

  // Build live preview
  useEffect(() => {
    if (!previewRef.current) return
    const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${files.css}</style>
</head>
<body style="background:#18181b;color:#e4e4e7;">
${sections
  .filter((s) => selectedIds.includes(s.id))
  .map((s) => `<div>${s.html}</div>`)
  .join('\n')}
</body>
</html>`
    previewRef.current.srcdoc = doc
  }, [files, sections, selectedIds])

  const toggleFormat = (f: Format) => {
    setFormats((prev) => ({ ...prev, [f]: !prev[f] }))
  }

  return (
    <div className="step-panel min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <span className="material-symbols-sharp text-[18px]">arrow_back</span>
            Back
          </button>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400 text-xs font-medium">Step 3 of 3</span>
            </span>
            <h2 className="text-white font-semibold text-sm">Export & Download</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onStartOver}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors"
          >
            <span className="material-symbols-sharp text-[18px]">restart_alt</span>
            Start Over
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-400 disabled:opacity-60 transition-colors"
          >
            <span className="material-symbols-sharp text-[18px]">{downloading ? 'hourglass_top' : 'download'}</span>
            {downloading ? 'Generating…' : 'Download ZIP'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Left panel */}
        <div className="w-72 lg:w-80 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Share */}
            <section>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-sharp text-[14px]">share</span>
                Share
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm hover:border-zinc-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-sharp text-[16px]">{copied ? 'check' : 'link'}</span>
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm hover:border-zinc-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </a>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm hover:border-zinc-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Share on LinkedIn
                </a>
              </div>
            </section>

            {/* Donation */}
            <section className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-xl">☕</span>
                <p className="text-orange-300 font-semibold text-sm">{config.donation.label}</p>
              </div>
              <p className="text-zinc-400 text-xs mb-3">
                If this tool saved you time, consider supporting its development.
              </p>
              <a
                href={config.donation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 transition-colors"
              >
                Buy Me a Coffee
              </a>
            </section>

            {/* Format selection */}
            <section>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-sharp text-[14px]">folder_zip</span>
                Export Format
              </p>
              <div className="space-y-2">
                {(
                  [
                    { key: 'separate', label: 'Separate files', desc: 'index.html + styles.css + animations.js', disabled: false },
                    { key: 'single', label: 'Single file', desc: 'All inline in one HTML (coming soon)', disabled: true },
                    { key: 'react', label: 'React component', desc: 'JSX + styled (future)', disabled: true },
                  ] satisfies Array<{ key: string; label: string; desc: string; disabled: boolean }>
                ).map(({ key, label, desc, disabled }) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      disabled
                        ? 'border-zinc-800 opacity-40 cursor-not-allowed'
                        : (formats as any)[key]
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        (formats as any)[key] && !disabled
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-zinc-600'
                      }`}
                    >
                      {(formats as any)[key] && !disabled && (
                        <span className="material-symbols-sharp text-white text-[12px]">check</span>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-200 text-sm font-medium">{label}</p>
                      <p className="text-zinc-500 text-xs">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={(formats as any)[key] ?? false}
                      disabled={disabled}
                      onChange={() => !disabled && toggleFormat(key as Format)}
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* Stats */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Output Stats</p>
              <div className="space-y-2">
                {(
                  [
                    { label: 'Sections', val: selectedIds.length },
                    { label: 'HTML lines', val: lineCount(files.html) },
                    { label: 'CSS lines', val: lineCount(files.css) },
                    { label: 'JS lines', val: lineCount(files.js) },
                  ] as const
                ).map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-zinc-200 font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Right: tabs + preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-800 bg-zinc-950">
            {(['html', 'css', 'js'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  activeTab === tab
                    ? 'text-orange-400 border border-b-0 border-zinc-700 bg-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('html')}
              className={`ml-auto px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === 'preview' as any
                  ? 'text-orange-400 border border-b-0 border-zinc-700 bg-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {/* extra preview tab placeholder — show via state trick */}
            </button>
          </div>

          {/* Code area */}
          <div className="flex-1 overflow-auto bg-zinc-950 relative">
            <div className="absolute top-3 right-4 z-10">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tabContent[activeTab])
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-white hover:bg-zinc-700 transition-all"
              >
                <span className="material-symbols-sharp text-[14px]">content_copy</span>
                Copy
              </button>
            </div>
            <pre
              className="p-5 text-sm leading-relaxed overflow-x-auto code-block"
              style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace', tabSize: 2 }}
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(tabContent[activeTab], activeTab) }}
            />
          </div>

          {/* Mini preview strip */}
          <div className="h-48 border-t border-zinc-800 flex-shrink-0 relative bg-zinc-900">
            <div className="absolute top-2 left-3 text-xs text-zinc-600 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 z-10">
              <span className="material-symbols-sharp text-[11px] align-middle mr-1">preview</span>
              Preview
            </div>
            <iframe
              ref={previewRef}
              sandbox="allow-same-origin"
              className="w-full h-full border-0"
              title="Export Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { ParsedSection } from '@/store/exporter'

interface Props {
  htmlContent: string
  sections: ParsedSection[]
  selectedIds: string[]
  renames: Record<string, string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onRename: (id: string, name: string) => void
  onProcess: () => void
  onBack: () => void
  processing: boolean
  processingStage: string
}

export default function Step2Selection({
  htmlContent,
  sections,
  selectedIds,
  renames,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onRename,
  onProcess,
  onBack,
  processing,
  processingStage,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Update iframe when selection changes
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !htmlContent) return

    const highlighted = focusedId
      ? sections.find((s) => s.id === focusedId)
      : null

    const injectStyle = highlighted
      ? `<style>
          .framer-export-highlight { outline: 3px solid #f97316 !important; outline-offset: 2px !important; }
        </style>`
      : ''

    // Mark selected sections in preview
    const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${injectStyle}
<style>
  body { background: #18181b; color: #e4e4e7; }
  [data-export-id] { outline: 1px dashed rgba(249,115,22,0.3); }
  [data-export-selected] { outline: 2px solid rgba(249,115,22,0.6) !important; }
  [data-export-focused] { outline: 3px solid #f97316 !important; outline-offset: 2px; }
</style>
</head>
<body>
${sections
  .map((s) => {
    const attrs = [
      `data-export-id="${s.id}"`,
      selectedIds.includes(s.id) ? 'data-export-selected' : '',
      s.id === focusedId ? 'data-export-focused' : '',
    ]
      .filter(Boolean)
      .join(' ')
    return `<div ${attrs}>${s.html}</div>`
  })
  .join('\n')}
</body>
</html>`

    iframe.srcdoc = doc

    // Scroll to focused section after load
    if (focusedId) {
      const onLoad = () => {
        try {
          const el = iframe.contentDocument?.querySelector(`[data-export-focused]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } catch {
          // cross-origin safety
        }
      }
      iframe.addEventListener('load', onLoad, { once: true })
    }
  }, [htmlContent, sections, selectedIds, focusedId])

  const startRename = (section: ParsedSection) => {
    setRenamingId(section.id)
    setRenameValue(renames[section.id] || section.label)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const noneSelected = selectedIds.length === 0

  return (
    <div className="step-panel min-h-screen flex flex-col">
      {/* Header bar */}
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400 text-xs font-medium">Step 2 of 3</span>
            </span>
            <h2 className="text-white font-semibold text-sm">Select Sections</h2>
          </div>
        </div>
        <button
          onClick={onProcess}
          disabled={noneSelected || processing}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-400 transition-colors"
        >
          <span className="material-symbols-sharp text-[18px]">code</span>
          Process {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Left: Section list */}
        <div className="w-72 lg:w-80 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400 text-xs">
              {sections.length} section{sections.length !== 1 ? 's' : ''} found
            </span>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                All
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={onDeselectAll}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                None
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {sections.map((section) => {
              const isSelected = selectedIds.includes(section.id)
              const isFocused = focusedId === section.id
              const displayName = renames[section.id] || section.label

              return (
                <div
                  key={section.id}
                  className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-l-2 transition-all ${
                    isFocused
                      ? 'border-orange-500 bg-orange-500/5'
                      : isSelected
                      ? 'border-orange-500/30 bg-zinc-900/40'
                      : 'border-transparent hover:bg-zinc-900/40'
                  }`}
                  onClick={() => setFocusedId(isFocused ? null : section.id)}
                >
                  <div
                    className="mt-0.5 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(section.id)
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-zinc-600 hover:border-orange-400'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-sharp text-white text-[12px]">check</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {renamingId === section.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-zinc-800 border border-orange-500/50 rounded px-2 py-0.5 text-sm text-white outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-white' : 'text-zinc-300'
                          }`}
                        >
                          {displayName}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(section)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-all"
                        >
                          <span className="material-symbols-sharp text-[14px]">edit</span>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-600 font-mono">&lt;{section.tagName}&gt;</span>
                      <span className="text-xs text-zinc-600">{section.elementCount} el</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 bg-zinc-900 relative overflow-hidden">
          <div className="absolute top-3 left-3 z-10 text-xs text-zinc-600 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 backdrop-blur-sm">
            <span className="material-symbols-sharp text-[12px] align-middle mr-1">preview</span>
            Live Preview — click sections on left to highlight
          </div>
          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            className="w-full h-full border-0"
            title="HTML Preview"
          />
        </div>
      </div>

      {/* Loading overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <div className="loader-ring" />
            <p className="text-orange-400 text-lg font-medium animate-pulse">{processingStage}</p>
          </div>
        </div>
      )}
    </div>
  )
}

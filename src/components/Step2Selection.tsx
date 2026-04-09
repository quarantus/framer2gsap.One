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

  // ==================== PREVIEW useEffect ====================
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !htmlContent) return

    const previewHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body, html {
      margin: 0;
      padding: 40px 20px;
      background: #111;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .desktop-frame {
      width: 1440px;
      max-width: 95vw;
      height: 900px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 30px 90px -15px rgba(0, 0, 0, 0.75);
      overflow: auto;
      border: 14px solid #1f1f1f;
    }
    [data-export-id] { position: relative; }
    [data-export-selected] {
      outline: 4px solid #f97316 !important;
      outline-offset: -4px;
    }
    [data-export-focused] {
      outline: 6px solid #fb923c !important;
      outline-offset: -6px;
      box-shadow: 0 0 0 12px rgba(251, 146, 60, 0.25);
    }
  </style>
</head>
<body>
  <div class="desktop-frame">
    ${htmlContent}
  </div>
</body>
</html>`

    iframe.srcdoc = previewHTML

    // Highlight selected and focused sections
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return

        sections.forEach((section) => {
          const allContainers = doc.querySelectorAll('div, section')
          allContainers.forEach((el) => {
            if (el.outerHTML.length > 80 && section.html.includes(el.outerHTML.substring(0, 100))) {
              el.setAttribute('data-export-id', section.id)

              if (selectedIds.includes(section.id)) {
                el.setAttribute('data-export-selected', '')
              }
              if (section.id === focusedId) {
                el.setAttribute('data-export-focused', '')
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }
          })
        })
      } catch (e) {
        console.warn('Preview highlighting failed', e)
      }
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
    <div className="step-panel min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-sharp">arrow_back</span>
            Back
          </button>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Step 2 of 3
            </span>
            <h2 className="text-white font-semibold">Select &amp; Review Sections</h2>
          </div>
        </div>

        <button
          onClick={onProcess}
          disabled={noneSelected || processing}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-400 text-white font-semibold rounded-xl transition-all active:scale-95"
        >
          <span className="material-symbols-sharp">code</span>
          Convert {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 69px)' }}>
        {/* Left: Section List */}
        <div className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <span className="text-sm text-zinc-400">
              {sections.length} sections detected
            </span>
            <div className="flex gap-3 text-xs">
              <button onClick={onSelectAll} className="text-orange-400 hover:text-orange-300">Select All</button>
              <button onClick={onDeselectAll} className="text-zinc-500 hover:text-zinc-300">Deselect All</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sections.map((section) => {
              const isSelected = selectedIds.includes(section.id)
              const isFocused = focusedId === section.id
              const displayName = renames[section.id] || section.label

              return (
                <div
                  key={section.id}
                  onClick={() => setFocusedId(isFocused ? null : section.id)}
                  className={`group px-4 py-4 border-l-4 flex gap-4 cursor-pointer transition-all hover:bg-zinc-900/50 ${
                    isFocused
                      ? 'border-orange-500 bg-orange-500/10'
                      : isSelected
                      ? 'border-orange-500/40 bg-zinc-900/30'
                      : 'border-transparent'
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(section.id)
                    }}
                    className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-zinc-600 group-hover:border-orange-400'
                    }`}
                  >
                    {isSelected && <span className="material-symbols-sharp text-white text-sm">check</span>}
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
                        className="w-full bg-zinc-800 border border-orange-400 rounded px-3 py-1 text-sm outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                          {displayName}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(section) }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300"
                        >
                          <span className="material-symbols-sharp text-base">edit</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="font-mono">&lt;{section.tagName}&gt;</span>
                      <span>{section.elementCount} els</span>
                      {section.depth !== undefined && (
                        <span className="px-1.5 py-0.5 bg-zinc-800 rounded">depth {section.depth}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Desktop Preview */}
        <div className="flex-1 bg-zinc-900 relative flex items-center justify-center overflow-auto p-8">
          <div className="absolute top-6 left-6 z-10 text-xs text-zinc-500 bg-zinc-950/80 px-4 py-2 rounded-xl border border-zinc-800 backdrop-blur">
            Desktop Preview • 1440px
          </div>

          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            className="shadow-2xl rounded-2xl border border-zinc-800 overflow-hidden"
            style={{
              width: '1440px',
              height: '900px',
              maxWidth: '100%',
            }}
            title="Framer Export Preview"
          />
        </div>
      </div>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-orange-400 text-xl font-medium tracking-wide">{processingStage}</p>
          </div>
        </div>
      )}
    </div>
  )
}

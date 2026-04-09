import React, { useCallback, useRef, useState } from 'react'
import { config } from '@/config'

interface Step1UploadProps {
  onFileReady: (file: File, html: string) => void
}

const MAX = config.app.maxFileSize

export default function Step1Upload({ onFileReady }: Step1UploadProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      if (!file.name.endsWith('.html') && file.type !== 'text/html') {
        setError('Only .html files are accepted.')
        return
      }
      if (file.size > MAX) {
        setError(`File exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const html = e.target?.result as string
        onFileReady(file, html)
      }
      reader.onerror = () => setError('Failed to read file.')
      reader.readAsText(file)
    },
    [onFileReady]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="step-panel flex flex-col items-center justify-center min-h-screen px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="material-symbols-sharp text-orange-400 text-[18px]">upload_file</span>
          <span className="text-orange-400 text-sm font-medium">Step 1 of 3</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Upload Framer HTML</h1>
        <p className="text-zinc-400 text-lg max-w-lg">
          Export your Framer page source and upload the HTML file to get started.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`drop-zone w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragging
            ? 'border-orange-500 bg-orange-500/10 scale-[1.02]'
            : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500 hover:bg-zinc-900'
        }`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div className="flex flex-col items-center py-14 px-8 text-center">
          <span
            className={`material-symbols-sharp text-6xl mb-4 transition-colors ${
              dragging ? 'text-orange-400' : 'text-zinc-600'
            }`}
          >
            {dragging ? 'file_present' : 'upload_file'}
          </span>
          <p className="text-zinc-200 text-lg font-medium mb-2">
            {dragging ? 'Drop to upload' : 'Drag & drop your .html file'}
          </p>
          <p className="text-zinc-500 text-sm mb-6">or click to browse — max 10 MB</p>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          >
            Choose File
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
          <span className="material-symbols-sharp text-[18px]">error</span>
          {error}
        </div>
      )}

      {/* Guide */}
      <div className="mt-10 w-full max-w-xl rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="material-symbols-sharp text-[16px] text-zinc-500">help</span>
          How to export from Framer
        </p>
        <ol className="space-y-2.5">
          {[
            'Open your published Framer page in a browser',
            'Right-click anywhere → "View Page Source"',
            'Press Ctrl+A / Cmd+A to select all, then copy',
            'Paste into a text editor and save as index.html',
            'Upload the file here',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

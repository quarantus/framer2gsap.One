import type { OutputFiles } from '@/store/exporter'

export async function downloadZip(files: OutputFiles, basename = 'framer-export'): Promise<void> {
  const [{ default: JSZip }, { saveAs }] = await Promise.all([
    import('jszip'),
    import('file-saver'),
  ])

  const zip = new JSZip()
  zip.file('index.html', files.html)
  zip.file('styles.css', files.css)
  zip.file('animations.js', files.js)

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${basename}.zip`)
}

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useExporterStore } from '@/store/exporter'
import { parseHTMLSections } from '@/lib/parser'
import { convertSections } from '@/lib/converter'
import Step1Upload from '@/components/Step1Upload'
import Step2Selection from '@/components/Step2Selection'
import Step3Export from '@/components/Step3Export'

export const Route = createFileRoute('/')({
  component: ExporterApp,
})

const STAGES = ['Parsing structure...', 'Converting animations...', 'Generating files...']

function ExporterApp() {
  const store = useExporterStore()
  const [processing, setProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(STAGES[0])
  const [mounted, setMounted] = useState(false)

  // Refs for GSAP slide containers
  const containerRef = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Position slides on mount and when step changes
  useEffect(() => {
    if (!mounted) return

    const initSlides = async () => {
      const { gsap } = await import('gsap')

      const refs = [step1Ref, step2Ref, step3Ref]
      refs.forEach((ref, i) => {
        if (!ref.current) return
        const offset = (i + 1 - store.currentStep) * 100
        gsap.set(ref.current, { x: `${offset}%`, willChange: 'transform' })
      })
    }

    initSlides()
  }, [mounted])

  const slideToStep = async (from: number, to: number) => {
    const { gsap } = await import('gsap')
    const direction = to > from ? -1 : 1
    const refs = [step1Ref, step2Ref, step3Ref]

    const fromRef = refs[from - 1]
    const toRef = refs[to - 1]

    if (!fromRef?.current || !toRef?.current) return

    // Place destination off-screen
    gsap.set(toRef.current, { x: `${-direction * 100}%` })

    await gsap.to(fromRef.current, {
      x: `${direction * 100}%`,
      duration: 0.45,
      ease: 'power2.inOut',
    })

    await gsap.to(toRef.current, {
      x: '0%',
      duration: 0.45,
      ease: 'power2.inOut',
    })

    store.setStep(to as 1 | 2 | 3)
  }

  // Step 1 → 2: file uploaded
  const handleFileReady = async (file: File, html: string) => {
    store.setUploadedFile(file, html)
    const sections = parseHTMLSections(html)
    store.setSections(sections)
    await slideToStep(1, 2)
  }

  // Step 2 → 3: process selected sections
  const handleProcess = async () => {
    if (store.selectedSectionIds.length === 0) return

    setProcessing(true)
    setProcessingStage(STAGES[0])

    const start = Date.now()

    // Show loading only if >500ms
    const stageTimer = setInterval(() => {
      setProcessingStage((prev) => {
        const idx = STAGES.indexOf(prev)
        return STAGES[Math.min(idx + 1, STAGES.length - 1)]
      })
    }, 400)

    try {
      // Yield to let React paint the overlay
      await new Promise((r) => setTimeout(r, 0))

      const result = convertSections(
        store.sections,
        store.selectedSectionIds,
        store.sectionRenames,
        store.htmlContent
      )

      store.setOutputFiles(result)

      const elapsed = Date.now() - start
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed))
      }
    } finally {
      clearInterval(stageTimer)
      setProcessing(false)
    }

    await slideToStep(2, 3)
  }

  // Step 2 ← back to Step 1 (reset all)
  const handleBackToStep1 = async () => {
    store.reset()
    await slideToStep(2, 1)
  }

  // Step 3 ← back to Step 2 (keep selections)
  const handleBackToStep2 = async () => {
    await slideToStep(3, 2)
    store.setStep(2)
  }

  // Start over → Step 1
  const handleStartOver = async () => {
    store.reset()
    await slideToStep(3, 1)
  }

  if (!mounted) {
    // SSR placeholder
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-zinc-900">
        <div
          className="h-full bg-orange-500 transition-all duration-500 ease-in-out"
          style={{ width: `${(store.currentStep / 3) * 100}%` }}
        />
      </div>

      {/* Slides container */}
      <div ref={containerRef} className="relative overflow-hidden">
        <div ref={step1Ref} className="absolute inset-0 min-h-screen" style={{ willChange: 'transform' }}>
          <Step1Upload onFileReady={handleFileReady} />
        </div>

        <div ref={step2Ref} className="absolute inset-0 min-h-screen" style={{ willChange: 'transform' }}>
          <Step2Selection
            htmlContent={store.htmlContent}
            sections={store.sections}
            selectedIds={store.selectedSectionIds}
            renames={store.sectionRenames}
            onToggle={store.toggleSection}
            onSelectAll={store.selectAllSections}
            onDeselectAll={store.deselectAllSections}
            onRename={store.renameSection}
            onProcess={handleProcess}
            onBack={handleBackToStep1}
            processing={processing}
            processingStage={processingStage}
          />
        </div>

        <div ref={step3Ref} className="absolute inset-0 min-h-screen" style={{ willChange: 'transform' }}>
          {store.outputFiles ? (
            <Step3Export
              files={store.outputFiles}
              sections={store.sections}
              selectedIds={store.selectedSectionIds}
              renames={store.sectionRenames}
              onBack={handleBackToStep2}
              onStartOver={handleStartOver}
            />
          ) : (
            <div className="flex items-center justify-center min-h-screen text-zinc-600">
              No output yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

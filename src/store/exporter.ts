import { create } from 'zustand'

export interface ParsedSection {
  id: string
  label: string
  elementCount: number
  html: string
  tagName: string
}

export interface OutputFiles {
  html: string
  css: string
  js: string
}

interface ExporterState {
  currentStep: 1 | 2 | 3
  uploadedFile: File | null
  htmlContent: string
  sections: ParsedSection[]
  selectedSectionIds: string[]
  sectionRenames: Record<string, string>
  outputFiles: OutputFiles | null

  setStep: (step: 1 | 2 | 3) => void
  setUploadedFile: (file: File, html: string) => void
  setSections: (sections: ParsedSection[]) => void
  toggleSection: (id: string) => void
  selectAllSections: () => void
  deselectAllSections: () => void
  renameSection: (id: string, name: string) => void
  setOutputFiles: (files: OutputFiles) => void
  reset: () => void
}

const initialState = {
  currentStep: 1 as const,
  uploadedFile: null,
  htmlContent: '',
  sections: [],
  selectedSectionIds: [],
  sectionRenames: {},
  outputFiles: null,
}

export const useExporterStore = create<ExporterState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setUploadedFile: (file, html) => set({ uploadedFile: file, htmlContent: html }),

  setSections: (sections) => set({ sections }),

  toggleSection: (id) => {
    const { selectedSectionIds } = get()
    if (selectedSectionIds.includes(id)) {
      set({ selectedSectionIds: selectedSectionIds.filter((s) => s !== id) })
    } else {
      set({ selectedSectionIds: [...selectedSectionIds, id] })
    }
  },

  selectAllSections: () => {
    const { sections } = get()
    set({ selectedSectionIds: sections.map((s) => s.id) })
  },

  deselectAllSections: () => set({ selectedSectionIds: [] }),

  renameSection: (id, name) => {
    const { sectionRenames } = get()
    set({ sectionRenames: { ...sectionRenames, [id]: name } })
  },

  setOutputFiles: (files) => set({ outputFiles: files }),

  reset: () => set({ ...initialState }),
}))

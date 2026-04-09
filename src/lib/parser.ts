import type { ParsedSection } from '@/store/exporter'

let _idCounter = 0

function nextId(): string {
  return `section-${++_idCounter}`
}

function countElements(el: Element): number {
  return el.querySelectorAll('*').length + 1
}

function getDepth(el: Element): number {
  let depth = 0
  let current = el.parentElement
  while (current && current !== document.body) {
    depth++
    current = current.parentElement
  }
  return depth
}

function getLabel(el: Element): string {
  if (el.id) return el.id
  const name = el.getAttribute('data-framer-name')
  if (name) return name

  const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
  if (heading?.textContent?.trim()) return heading.textContent.trim().slice(0, 55)

  const framerClass = Array.from(el.classList).find(c => /^framer-[a-z0-9]{5,}/.test(c))
  if (framerClass) return framerClass.replace(/^framer-/, '')

  return `Section ${getDepth(el)}`
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  doc.querySelectorAll('script, meta, link, noscript, iframe').forEach(el => el.remove())

  const candidates = new Set<Element>()

  // Main strategy for Framer: capture good-sized framer- containers
  doc.querySelectorAll('div').forEach(el => {
    const cls = el.className?.toString() || ''
    if (/framer-[a-z0-9]{5,}/.test(cls)) {
      const count = countElements(el)
      if (count >= 30 && count <= 8000) {   // avoid too small and the giant wrapper
        candidates.add(el)
      }
    }
  })

  // Also take large semantic / ID containers
  doc.querySelectorAll('section, main, article, [id]').forEach(el => {
    if (el === doc.documentElement || el === doc.body) return
    if (countElements(el) >= 40) candidates.add(el)
  })

  // Large direct body children
  if (doc.body) {
    Array.from(doc.body.children).forEach(child => {
      if (countElements(child) >= 100) candidates.add(child)
    })
  }

  // Deduplication - allow some nesting but not deep
  const sorted = Array.from(candidates).sort((a, b) =>
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
  )

  const filtered: Element[] = []
  for (const el of sorted) {
    const isDescendant = filtered.some(existing => existing.contains(el))
    if (!isDescendant) filtered.push(el)
  }

  // If still too few, take more framer containers
  if (filtered.length < 5 && doc.body) {
    doc.querySelectorAll('div[class*="framer-"]').forEach((el, i) => {
      if (countElements(el) > 45 && i % 2 === 0) {
        filtered.push(el as Element)
      }
    })
  }

  return filtered.map(el => ({
    id: nextId(),
    label: getLabel(el),
    elementCount: countElements(el),
    html: el.outerHTML,
    tagName: el.tagName.toLowerCase(),
    depth: getDepth(el),
  }))
}

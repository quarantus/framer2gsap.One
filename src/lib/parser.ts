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

  const framerName = el.getAttribute('data-framer-name')
  if (framerName) return framerName

  const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim().slice(0, 60)
  }

  // Framer class fallback
  const framerClass = Array.from(el.classList).find(c => /^framer-[a-z0-9]{5,}/.test(c))
  if (framerClass) return framerClass.replace(/^framer-/, '')

  return `${el.tagName.toLowerCase()}-${getDepth(el)}`
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Clean junk
  doc.querySelectorAll('script, meta, link, noscript, iframe, svg').forEach(el => el.remove())

  const candidates = new Set<Element>()

  // 1. Strong Framer containers (most important)
  doc.querySelectorAll('div').forEach(el => {
    const cls = el.className?.toString() || ''
    if (/framer-[a-z0-9]{5,}/.test(cls)) {
      const count = countElements(el)
      if (count >= 35) candidates.add(el)           // lowered + balanced
    }
  })

  // 2. Elements with IDs or semantic tags
  doc.querySelectorAll('section, main, article, header, footer, nav, [id]').forEach(el => {
    if (el === doc.documentElement || el === doc.body) return
    if (countElements(el) >= 25) candidates.add(el)
  })

  // 3. Very large top-level children of <body>
  if (doc.body) {
    Array.from(doc.body.children).forEach(child => {
      if (countElements(child) >= 80) candidates.add(child)
    })
  }

  // Deduplication: Keep top-level containers, but allow some nesting for better sectioning
  const sorted = Array.from(candidates).sort((a, b) => 
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
  )

  const filtered: Element[] = []
  for (const el of sorted) {
    const isDescendant = filtered.some(existing => existing !== el && existing.contains(el))
    if (!isDescendant) {
      filtered.push(el)
    }
  }

  // Fallback: if too few sections, take more Framer containers
  if (filtered.length < 4 && doc.body) {
    doc.querySelectorAll('div[class*="framer-"]').forEach(el => {
      if (countElements(el) >= 50 && !filtered.some(f => f.contains(el))) {
        filtered.push(el)
      }
    })
  }

  return filtered.map((el) => ({
    id: nextId(),
    label: getLabel(el),
    elementCount: countElements(el),
    html: el.outerHTML,
    tagName: el.tagName.toLowerCase(),
    depth: getDepth(el),
  }))
}

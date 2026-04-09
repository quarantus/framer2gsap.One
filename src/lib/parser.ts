import type { ParsedSection } from '@/store/exporter'

let _idCounter = 0

function nextId(): string {
  return `section-${++_idCounter}`
}

function countElements(el: Element): number {
  return el.querySelectorAll('*').length + 1
}

// New: Calculate nesting depth from body
function getDepth(el: Element): number {
  let depth = 0
  let current: Element | null = el
  while (current && current !== document.body && current.parentElement) {
    depth++
    current = current.parentElement
  }
  return depth
}

function getLabel(el: Element, index: number): string {
  if (el.id) return el.id

  const framerName = el.getAttribute('data-framer-name')
  if (framerName) return framerName

  const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim().slice(0, 50)
  }

  // Framer-specific hints
  const variant = el.getAttribute('data-framer-variant')
  if (variant) return variant

  const classList = Array.from(el.classList)
  const framerClass = classList.find(c => /^framer-[a-z0-9]{5,}/.test(c))
  if (framerClass) return framerClass.replace('framer-', '')

  const cleanClass = classList.find(c => c.length > 4 && c.length < 35)
  if (cleanClass) return cleanClass

  return `${el.tagName.toLowerCase()}-${index + 1}`
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Clean noise
  doc.querySelectorAll('script, meta, link, noscript, svg').forEach(el => el.remove())

  const candidates = new Set<Element>()

  // 1. Semantic elements
  doc.querySelectorAll('section, main, article, header, footer, nav').forEach(el => {
    if (countElements(el) >= 10) candidates.add(el)
  })

  // 2. Elements with IDs
  doc.querySelectorAll('[id]').forEach(el => {
    if (el === doc.documentElement || el === doc.body) return
    if (countElements(el) >= 15) candidates.add(el)
  })

  // 3. Framer containers (most important for your site)
  doc.querySelectorAll('div').forEach(el => {
    const cls = el.className?.toString() || ''

    // Strong Framer class pattern
    if (/framer-[a-z0-9]{5,}/.test(cls)) {
      const count = countElements(el)
      if (count >= 20) candidates.add(el)           // good balance for Framer
    }
  })

  // 4. Large top-level containers (very common in Framer)
  if (doc.body) {
    Array.from(doc.body.children).forEach(child => {
      if (countElements(child) >= 50) {
        candidates.add(child)
      }
    })
  }

  // Deduplication: Keep only outermost containers
  let filtered: Element[] = []
  const sorted = Array.from(candidates).sort((a, b) => 
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  )

  for (const el of sorted) {
    const isDescendant = filtered.some(existing => existing !== el && existing.contains(el))
    if (!isDescendant) {
      filtered.push(el)
    }
  }

  // Fallback
  if (filtered.length === 0 && doc.body) {
    return [{
      id: nextId(),
      label: 'Main Content',
      elementCount: countElements(doc.body),
      html: doc.body.innerHTML,
      tagName: 'body',
      depth: 0,                    // ← added
    }]
  }

  return filtered.map((el, index) => ({
    id: nextId(),
    label: getLabel(el, index),
    elementCount: countElements(el),
    html: el.outerHTML,
    tagName: el.tagName.toLowerCase(),
    depth: getDepth(el),           // ← NEW: shows nesting depth
  }))
}

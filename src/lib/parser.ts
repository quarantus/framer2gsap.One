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
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim().slice(0, 55)
  }

  const cls = Array.from(el.classList).find(c => /^framer-[a-z0-9]{5,}/.test(c))
  if (cls) return cls.replace('framer-', '')

  return el.tagName.toLowerCase()
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Clean noise
  doc.querySelectorAll('script, meta, link, noscript, iframe').forEach(el => el.remove())

  const candidates = new Set<Element>()

  // Strategy 1: Framer containers with strong class pattern
  doc.querySelectorAll('div').forEach(el => {
    const cls = el.className?.toString() || ''
    if (/framer-[a-z0-9]{5,}/.test(cls)) {
      const count = countElements(el)
      if (count >= 20) candidates.add(el)
    }
  })

  // Strategy 2: Large semantic or ID containers
  doc.querySelectorAll('section, main, article, header, footer, nav, [id]').forEach(el => {
    if (el === doc.documentElement || el === doc.body) return
    if (countElements(el) >= 30) candidates.add(el)
  })

  // Strategy 3: Very large top-level children of body (common in Framer)
  if (doc.body) {
    Array.from(doc.body.children).forEach(child => {
      if (countElements(child) >= 100) candidates.add(child)
    })
  }

  // Deduplication - keep outermost only, but allow reasonable nesting
  const sorted = Array.from(candidates).sort((a, b) => 
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
  )

  const filtered: Element[] = []
  for (const el of sorted) {
    const isChildOfExisting = filtered.some(existing => 
      existing !== el && existing.contains(el)
    )
    if (!isChildOfExisting) {
      filtered.push(el)
    }
  }

  // Final fallback - if still only 1 section, split by major visual breaks
  if (filtered.length <= 1 && doc.body) {
    const majorSections = doc.body.querySelectorAll('div[class*="framer-"]')
    if (majorSections.length > 3) {
      majorSections.forEach((el, i) => {
        if (countElements(el) >= 40 && i % 2 === 0) { // take every other to avoid too many
          filtered.push(el as Element)
        }
      })
    } else {
      filtered.push(doc.body)
    }
  }

  return filtered.map((el, index) => ({
    id: nextId(),
    label: getLabel(el),
    elementCount: countElements(el),
    html: el.outerHTML,
    tagName: el.tagName.toLowerCase(),
    depth: getDepth(el),
  }))
}

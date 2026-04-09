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
  let current: Element | null = el.parentElement
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

  const variant = el.getAttribute('data-framer-variant')
  if (variant) return variant

  const cls = Array.from(el.classList).find(c => /^framer-[a-z0-9]{5,}/.test(c))
  if (cls) return cls.replace(/^framer-/, '')

  return el.tagName.toLowerCase()
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Aggressive cleaning for performance
  doc.querySelectorAll('script, meta, link, noscript, svg, iframe').forEach(el => el.remove())

  const candidates = new Set<Element>()

  // Semantic + Framer-aware detection
  const selectors = 'section, main, article, header, footer, nav, [id], [data-framer-name], div'
  doc.querySelectorAll(selectors).forEach(el => {
    if (el === doc.documentElement || el === doc.body) return

    const count = countElements(el)
    const cls = el.className?.toString() || ''
    const isFramer = /framer-[a-z0-9]{5,}/.test(cls)

    if (isFramer && count >= 25) candidates.add(el)
    else if (count >= 40) candidates.add(el)           // large containers
  })

  // Large direct body children (very common in Framer)
  if (doc.body) {
    Array.from(doc.body.children).forEach(child => {
      if (countElements(child) >= 80) candidates.add(child)
    })
  }

  // Deduplication: keep only top-level (non-nested) sections
  const sorted = Array.from(candidates).sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  )

  const filtered: Element[] = []
  for (const el of sorted) {
    if (!filtered.some(existing => existing.contains(el))) {
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
      depth: 0,
    }]
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

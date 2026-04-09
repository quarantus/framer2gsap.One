import type { ParsedSection } from '@/store/exporter'

let _idCounter = 0

function nextId(): string {
  return `section-${++_idCounter}`
}

function countElements(el: Element): number {
  return el.querySelectorAll('*').length + 1
}

function getLabel(el: Element, index: number): string {
  if (el.id) return el.id

  const framerName = el.getAttribute('data-framer-name')
  if (framerName) return framerName

  const heading = el.querySelector('h1, h2, h3, h4, h5, h6')
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim().slice(0, 40)
  }

  const tag = el.tagName.toLowerCase()
  const cls = (el.className || '').toString().split(' ').find((c) => c.length > 2 && c.length < 30)
  if (cls) return cls

  return `${tag}-${index + 1}`
}

export function parseHTMLSections(htmlString: string): ParsedSection[] {
  _idCounter = 0

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')

  // Remove non-visible structural elements
  doc.querySelectorAll('script, meta, link, noscript').forEach((el) => el.remove())

  const candidates = new Set<Element>()

  // Semantic elements
  doc.querySelectorAll('section, main, article, header, footer, nav').forEach((el) => {
    if (countElements(el) >= 3) candidates.add(el)
  })

  // Elements with explicit IDs (non-root)
  doc.querySelectorAll('[id]').forEach((el) => {
    if (el === doc.documentElement || el === doc.body) return
    if (countElements(el) >= 3) candidates.add(el)
  })

  // Framer-named containers
  doc.querySelectorAll('[data-framer-name]').forEach((el) => {
    if (countElements(el) >= 3) candidates.add(el)
  })

  // Large top-level divs in body
  if (doc.body) {
    Array.from(doc.body.children).forEach((child) => {
      if (countElements(child) >= 5) candidates.add(child)
    })
  }

  // Framer hash class containers (e.g. .framer-abc123)
  doc.querySelectorAll('[class]').forEach((el) => {
    const cls = el.className?.toString() || ''
    if (/framer-[a-z0-9]{5,}/i.test(cls) && countElements(el) >= 5) {
      candidates.add(el)
    }
  })

  // Remove descendants of already-selected containers
  const filtered: Element[] = []
  const sorted = Array.from(candidates).sort((a, b) => {
    const pos = a.compareDocumentPosition(b)
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  })

  for (const el of sorted) {
    const isDescendant = filtered.some(
      (existing) => existing !== el && existing.contains(el)
    )
    if (!isDescendant) filtered.push(el)
  }

  if (filtered.length === 0 && doc.body) {
    return [
      {
        id: nextId(),
        label: 'Main Content',
        elementCount: countElements(doc.body),
        html: doc.body.innerHTML,
        tagName: 'body',
      },
    ]
  }

  return filtered.map((el, index) => ({
    id: nextId(),
    label: getLabel(el, index),
    elementCount: countElements(el),
    html: el.outerHTML,
    tagName: el.tagName.toLowerCase(),
  }))
}

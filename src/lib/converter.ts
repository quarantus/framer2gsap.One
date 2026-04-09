import type { ParsedSection, OutputFiles } from '@/store/exporter'

let _classCounter = 0

function nextClass(prefix = 'fc'): string {
  return `${prefix}-${++_classCounter}`
}

// ... (keep your existing parseTransformForGSAP and extractGSAPFromElement functions - they are good)

function styleAttrToCSSDeclarations(styleAttr: string): string {
  return styleAttr
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .join(';\n  ')
}

function processNodeStyles(rootEl: Element, cssRules: string[], gsapAnimations: string[]): void {
  const elementsWithStyle = rootEl.querySelectorAll('[style]')
  const all = [rootEl, ...Array.from(elementsWithStyle)]

  for (const el of all) {
    const styleAttr = el.getAttribute('style')
    if (!styleAttr?.trim()) continue

    const className = nextClass()
    cssRules.push(`.${className} {\n  ${styleAttrToCSSDeclarations(styleAttr)}\n}`)

    const anims = extractGSAPFromElement(el, className)
    gsapAnimations.push(...anims)

    const existing = el.getAttribute('class') || ''
    el.setAttribute('class', existing ? `${existing} ${className}` : className)
    el.removeAttribute('style')
  }
}

function cleanFramerAttrs(el: Element): void {
  const attrsToStrip = [
    'data-framer-name', 'data-framer-appear-id', 'data-framer-animation',
    'data-framer-motion-value', 'data-framer-component-type', 'data-framer-variant'
  ]

  const allNodes = [el, ...el.querySelectorAll('*')]
  for (const node of allNodes) {
    attrsToStrip.forEach(attr => node.removeAttribute(attr))
  }
}

function extractStylesFromDoc(htmlString: string): { base: string; media: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  let base = ''
  let media = ''

  doc.querySelectorAll('style').forEach(styleEl => {
    const text = styleEl.textContent || ''
    const mediaBlocks = text.match(/@media[^{]+\{[\s\S]*?\}\s*\}/g) || []
    media += mediaBlocks.join('\n\n') + '\n'

    const stripped = text.replace(/@media[^{]+\{[\s\S]*?\}\s*\}/g, '').replace(/@import[^;]+;/g, '').trim()
    if (stripped) base += stripped + '\n'
  })

  return { base, media }
}

export function convertSections(
  sections: ParsedSection[],
  selectedIds: string[],
  renames: Record<string, string>,
  originalHtml: string
): OutputFiles {
  _classCounter = 0

  const selected = sections.filter(s => selectedIds.includes(s.id))
  const cssRules: string[] = []
  const gsapAnimations: string[] = []

  const { base: baseCSS, media: mediaCSS } = extractStylesFromDoc(originalHtml)

  const sectionBlocks = selected.map(section => {
    const parser = new DOMParser()
    const frag = parser.parseFromString(`<body>${section.html}</body>`, 'text/html')
    const el = frag.body.firstElementChild
    if (!el) return `<!-- Empty: ${section.id} -->`

    processNodeStyles(el, cssRules, gsapAnimations)
    cleanFramerAttrs(el)

    const name = renames[section.id] || section.label || 'Section'
    const depthTag = section.depth !== undefined ? ` depth-${section.depth}` : ''

    return `<!-- ${name}${depthTag} -->\n<div class="framer-section${depthTag}">\n${el.outerHTML}\n</div>`
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Framer Export</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${sectionBlocks.join('\n\n')}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  <script src="animations.js"></script>
</body>
</html>`

  const css = [
    '/* Base Framer styles */',
    baseCSS.trim(),
    '',
    '/* Converted inline styles */',
    cssRules.join('\n\n'),
    '',
    '/* Media queries */',
    mediaCSS.trim(),
    '',
    '/* Section wrapper */',
    '.framer-section { margin-bottom: 80px; }'
  ].join('\n')

  const js = `gsap.registerPlugin(ScrollTrigger);

${gsapAnimations.join('\n') || '// No inline animations detected'}

// Scroll animations
document.querySelectorAll('.framer-section').forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 80%" },
    opacity: 0,
    y: 60,
    duration: 1,
    ease: "power3.out",
    delay: Math.min(i * 0.08, 0.6)
  });
});
`

  return { html, css, js }
}

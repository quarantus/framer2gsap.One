// Inside Step2Selection component
useEffect(() => {
  const iframe = iframeRef.current
  if (!iframe || !htmlContent) return

  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      background: #111; 
      margin: 0; 
      padding: 40px 20px; 
      display: flex; 
      justify-content: center; 
    }
    .preview-frame {
      width: 1440px;
      background: white;
      box-shadow: 0 30px 100px -20px rgba(0,0,0,0.7);
      border-radius: 16px;
      overflow: hidden;
      min-height: 900px;
    }
    [data-export-id] { position: relative; }
    [data-export-selected] {
      outline: 4px solid #f97316 !important;
      outline-offset: -4px;
    }
    [data-export-focused] {
      outline: 6px solid #fb923c !important;
      outline-offset: -6px;
      box-shadow: 0 0 0 12px rgba(251, 146, 60, 0.25);
    }
  </style>
</head>
<body>
  <div class="preview-frame">
    ${htmlContent}   {/* ← Use the ORIGINAL uploaded HTML as base */}
  </div>
</body>
</html>`

  iframe.srcdoc = doc

  // Highlight selected/focused sections on top of original HTML
  iframe.onload = () => {
    try {
      const doc = iframe.contentDocument
      if (!doc) return

      sections.forEach(section => {
        // Try to find matching elements by structure or class (simple heuristic)
        const els = doc.querySelectorAll('div, section')
        els.forEach(el => {
          if (el.outerHTML.includes(section.html.substring(0, 200))) { // rough match
            el.setAttribute('data-export-id', section.id)
            if (selectedIds.includes(section.id)) {
              el.setAttribute('data-export-selected', '')
            }
            if (section.id === focusedId) {
              el.setAttribute('data-export-focused', '')
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }
        })
      })
    } catch (e) {
      console.warn('Preview highlighting failed', e)
    }
  }
}, [htmlContent, sections, selectedIds, focusedId])

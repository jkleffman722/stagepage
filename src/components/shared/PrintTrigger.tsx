'use client'

import { useEffect } from 'react'

export function PrintTrigger() {
  useEffect(() => {
    // Small delay so the page fully renders before the print dialog opens
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [])
  return null
}

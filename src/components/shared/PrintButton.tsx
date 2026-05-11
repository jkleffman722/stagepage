'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function PrintButton({ href }: { href: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.open(href, '_blank')}
    >
      <Download className="h-4 w-4 mr-1.5" />
      Download PDF
    </Button>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { RiderImportModal } from './RiderImportModal'

export function RiderImportButton({ riderId }: { riderId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1.5" />
        Import existing rider
      </Button>
      <RiderImportModal riderId={riderId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

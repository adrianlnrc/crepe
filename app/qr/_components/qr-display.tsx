'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface QrDisplayProps {
  url: string
  eventName: string
}

export function QrDisplay({ url, eventName }: QrDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false

    import('qrcode').then((QRCode) => {
      if (cancelled || !canvasRef.current) return
      QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    })

    return () => { cancelled = true }
  }, [url])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${eventName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <Card className="p-8 flex flex-col items-center gap-4 print:shadow-none print:border-none">
        <canvas ref={canvasRef} className="rounded-lg" />
        <div className="text-center">
          <p className="font-semibold text-lg">{eventName}</p>
          <p className="text-xs text-muted-foreground mt-1 break-all max-w-xs">{url}</p>
        </div>
      </Card>

      <div className="flex gap-3 print:hidden">
        <Button onClick={handleDownload} className="flex-1">
          ⬇ Baixar PNG
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex-1">
          🖨 Imprimir
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface ReadyBannerProps {
  identifier: string
  flavorName: string
}

export function ReadyBanner({ identifier, flavorName }: ReadyBannerProps) {
  const router = useRouter()

  useEffect(() => {
    // Vibração e som — best-effort
    try {
      navigator.vibrate?.([200, 100, 200])
    } catch {}

    try {
      const audio = new Audio('/sounds/ready.mp3')
      audio.play().catch(() => {})
    } catch {}
  }, [])

  return (
    <div
      data-testid="ready-banner"
      className="fixed inset-0 bg-green-600 flex flex-col items-center justify-center text-white p-6 text-center"
    >
      <div className="text-8xl mb-6">✅</div>
      <h1 className="text-5xl font-black mb-3 leading-tight">PRONTO!</h1>
      <p className="text-2xl font-semibold mb-2">Retire no balcão</p>
      <p className="text-lg opacity-90 mb-1">{identifier}</p>
      <p className="text-base opacity-80 mb-10">{flavorName}</p>
      <Button
        onClick={() => router.push('/')}
        variant="outline"
        size="lg"
        className="bg-white text-green-700 hover:bg-green-50 border-white font-semibold text-lg h-14 px-8"
      >
        Já retirei 👍
      </Button>
    </div>
  )
}

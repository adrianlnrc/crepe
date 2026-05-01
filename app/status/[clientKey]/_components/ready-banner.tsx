'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface ReadyBannerProps {
  identifier: string
  flavorName: string
  eventId: string
}

export function ReadyBanner({ identifier, flavorName, eventId }: ReadyBannerProps) {
  const router = useRouter()
  const [retrieved, setRetrieved] = useState(false)

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
      {retrieved ? (
        <div className="text-center space-y-4">
          <p className="text-2xl">🥞</p>
          <p className="text-lg font-semibold">Bom apetite!</p>
          <a
            href={`/pedido?event=${eventId}`}
            className="inline-block mt-2 px-6 py-3 bg-white text-green-700 font-semibold rounded-full hover:bg-green-50 transition"
          >
            Quero mais um! 🥞
          </a>
        </div>
      ) : (
        <Button
          onClick={() => setRetrieved(true)}
          variant="outline"
          size="lg"
          className="bg-white text-green-700 hover:bg-green-50 border-white font-semibold text-lg h-14 px-8"
        >
          Já retirei 👍
        </Button>
      )}
    </div>
  )
}

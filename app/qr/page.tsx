import { headers } from 'next/headers'
import { getServerClient } from '@/lib/supabase/server'
import { QrDisplay } from './_components/qr-display'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'QR Code do Evento',
  description: 'QR code para convidados fazerem pedidos',
}

export default async function QrPage() {
  const client = getServerClient()

  const { data: event } = await client
    .from('events')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single<any>()

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Nenhum evento ativo</h1>
          <p className="text-muted-foreground">Ative um evento para gerar o QR.</p>
        </div>
      </div>
    )
  }

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const pedidoUrl = `${protocol}://${host}/pedido?event=${event.id}`

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center print:hidden">
          <h1 className="text-2xl font-bold">QR Code</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compartilhe com os convidados
          </p>
        </div>
        <QrDisplay url={pedidoUrl} eventName={event.name} />
      </div>
    </div>
  )
}

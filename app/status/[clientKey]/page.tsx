import { getServerClient } from '@/lib/supabase/server'
import { StatusScreen } from './_components/status-screen'

export const metadata = {
  title: 'Status do Pedido',
  description: 'Acompanhe o status do seu pedido em tempo real',
}

export default async function StatusPage({
  params,
}: {
  params: { clientKey: string }
}) {
  const clientKey = params.clientKey

  // Busca pedido inicial do servidor
  const client = getServerClient()
  const { data: order } = await client
    .from('orders')
    .select(
      `
      id, sequence_number, status, first_name, last_name, flavor_id, observation,
      created_at, started_at, finished_at,
      flavors (id, name, category)
    `
    )
    .eq('client_key', clientKey)
    .single()

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Pedido não encontrado</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  return <StatusScreen clientKey={clientKey} initialOrder={order} />
}

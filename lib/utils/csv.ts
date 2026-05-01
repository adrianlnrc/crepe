export interface OrderCsvRecord {
  sequence_number: number
  first_name: string
  last_name: string
  flavor_name: string
  ingredient_names: string[]
  observation: string | null
  status: string
  cancellation_reason: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  duration_seconds: number | null
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function serializeOrdersToCsv(orders: OrderCsvRecord[]): string {
  const headers = [
    'Número',
    'Nome',
    'Sobrenome',
    'Sabor',
    'Ingredientes',
    'Observação',
    'Status',
    'Motivo Cancelamento',
    'Criado em',
    'Iniciado em',
    'Finalizado em',
    'Duração (min)',
  ]

  const rows = orders.map((o) =>
    [
      String(o.sequence_number),
      o.first_name,
      o.last_name,
      o.flavor_name,
      o.ingredient_names.join('; '),
      o.observation || '',
      o.status,
      o.cancellation_reason || '',
      formatDate(o.created_at),
      formatDate(o.started_at),
      formatDate(o.finished_at),
      o.duration_seconds !== null ? String(Math.round(o.duration_seconds / 60)) : '',
    ]
      .map(escapeCsv)
      .join(',')
  )

  return [headers.map(escapeCsv).join(','), ...rows].join('\r\n')
}

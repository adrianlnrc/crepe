'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCallback } from 'react'

export function HistoryFilters({ totalCount }: { totalCount: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentFrom = searchParams.get('from') || ''
  const currentTo = searchParams.get('to') || ''
  const currentStatus = searchParams.get('status') || 'done,cancelled'

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/historico?${params.toString()}`)
  }, [router, searchParams])

  const buildExportUrl = () => {
    const params = new URLSearchParams()
    if (currentFrom) params.set('from', currentFrom)
    if (currentTo) params.set('to', currentTo)
    if (currentStatus) params.set('status', currentStatus)
    return `/api/export/csv?${params.toString()}`
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex gap-3 flex-1 flex-wrap">
        <div className="min-w-[140px]">
          <Label className="text-xs mb-1 block">De</Label>
          <Input
            type="date"
            value={currentFrom}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs mb-1 block">Até</Label>
          <Input
            type="date"
            value={currentTo}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            variant={currentStatus === 'done' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('status', 'done')}
          >
            Finalizados
          </Button>
          <Button
            variant={currentStatus === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('status', 'cancelled')}
          >
            Cancelados
          </Button>
          <Button
            variant={currentStatus === 'done,cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('status', 'done,cancelled')}
          >
            Todos
          </Button>
        </div>
      </div>

      <a href={buildExportUrl()} download>
        <Button variant="outline" size="sm">
          ⬇ Exportar CSV ({totalCount})
        </Button>
      </a>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema } from '@/lib/validation/order-schema'
import { generateClientKey } from '@/lib/domain/idempotency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { FlavorPicker } from './flavor-picker'
import { IngredientChecklist } from './ingredient-checklist'
import { Loader2 } from 'lucide-react'

interface Flavor {
  id: string
  name: string
  category: 'doce' | 'salgado'
  tempo_medio_preparo: number | null
  ingredients: Array<{ id: string; name: string }>
}

interface OrderFormProps {
  event: {
    id: string
    name: string
    tempo_medio_preparo_global: number
    flavors: Flavor[]
  }
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // ms

export function OrderForm({ event }: OrderFormProps) {
  const router = useRouter()
  const [clientKey, setClientKey] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      event_id: event.id,
      client_key: '',
      first_name: '',
      last_name: '',
      flavor_id: '',
      ingredient_ids: [],
      observation: '',
    },
  })

  // Gera client_key no mount
  useEffect(() => {
    const key = generateClientKey()
    setClientKey(key)
    form.setValue('client_key', key as any)
  }, [form])

  const selectedFlavorId = form.watch('flavor_id')
  const selectedFlavor = event.flavors.find((f) => f.id === selectedFlavorId)

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setSubmitError(null)

    const attemptSubmit = async (attempt: number) => {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const { order } = await response.json()
          // Redireciona para tela de status com client_key
          router.push(`/status/${data.client_key}`)
          return
        }

        if (attempt < MAX_RETRIES) {
          // Retry com backoff
          const delay = RETRY_DELAYS[attempt]
          setSubmitError(`Reenviando em ${delay / 1000}s...`)
          setTimeout(() => {
            setRetryCount(attempt + 1)
            attemptSubmit(attempt + 1)
          }, delay)
        } else {
          // Max retries atingido
          const errorData = await response.json()
          setSubmitError(
            errorData.error === 'event_inactive'
              ? 'Evento não está ativo'
              : 'Erro ao enviar pedido. Verifique sua conexão.'
          )
          setIsSubmitting(false)
        }
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt]
          setSubmitError(`Reenviando em ${delay / 1000}s...`)
          setTimeout(() => {
            setRetryCount(attempt + 1)
            attemptSubmit(attempt + 1)
          }, delay)
        } else {
          setSubmitError('Erro de conexão. Verifique sua internet.')
          setIsSubmitting(false)
        }
      }
    }

    attemptSubmit(0)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Nome */}
      <Card className="p-4">
        <Label htmlFor="first_name" className="block text-sm font-medium mb-2">
          Primeiro Nome *
        </Label>
        <Input
          id="first_name"
          placeholder="Ex: Maria"
          autoComplete="given-name"
          inputMode="text"
          disabled={isSubmitting}
          {...form.register('first_name')}
          className="mb-4"
        />
        {form.formState.errors.first_name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.first_name.message}
          </p>
        )}

        <Label htmlFor="last_name" className="block text-sm font-medium mb-2 mt-4">
          Sobrenome *
        </Label>
        <Input
          id="last_name"
          placeholder="Ex: Silva"
          autoComplete="family-name"
          inputMode="text"
          disabled={isSubmitting}
          {...form.register('last_name')}
        />
        {form.formState.errors.last_name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.last_name.message}
          </p>
        )}
      </Card>

      {/* Sabor */}
      <div>
        <Label className="block text-sm font-medium mb-3">Sabor *</Label>
        <FlavorPicker
          flavors={event.flavors}
          selectedId={selectedFlavorId}
          onSelect={(id) => {
            form.setValue('flavor_id', id)
            form.clearErrors('flavor_id')
          }}
          disabled={isSubmitting}
        />
        {form.formState.errors.flavor_id && (
          <p className="text-sm text-destructive mt-2">
            {form.formState.errors.flavor_id.message}
          </p>
        )}
      </div>

      {/* Ingredientes */}
      {selectedFlavor && (
        <div>
          <Label className="block text-sm font-medium mb-3">
            Ingredientes (opcionais)
          </Label>
          <IngredientChecklist
            ingredients={selectedFlavor.ingredients}
            selectedIds={(form.watch('ingredient_ids') || []) as string[]}
            onToggle={(ingredientId: string) => {
              const current = (form.watch('ingredient_ids') || []) as string[]
              const updated = current.includes(ingredientId as any)
                ? current.filter((id) => id !== ingredientId)
                : [...current, ingredientId]
              form.setValue('ingredient_ids', updated as any)
            }}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Observação */}
      <Card className="p-4">
        <Label htmlFor="observation" className="block text-sm font-medium mb-2">
          Observações (opcional)
        </Label>
        <Textarea
          id="observation"
          placeholder="Ex: Sem açúcar, pouca nutella..."
          maxLength={140}
          disabled={isSubmitting}
          {...form.register('observation')}
          className="resize-none"
          rows={3}
        />
        <div className="text-xs text-muted-foreground mt-2">
          {form.watch('observation')?.length || 0} / 140
        </div>
        {form.formState.errors.observation && (
          <p className="text-sm text-destructive mt-2">
            {form.formState.errors.observation.message}
          </p>
        )}
      </Card>

      {/* Erro e retry status */}
      {submitError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Botão de envio */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Fazer Pedido'
        )}
      </Button>
    </form>
  )
}

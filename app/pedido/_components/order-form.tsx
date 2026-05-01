'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema } from '@/lib/validation/order-schema'
import { generateClientKey } from '@/lib/domain/idempotency'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase text-orange-700/60 mb-3">
      {children}
    </p>
  )
}

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
  const observation = form.watch('observation') || ''

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
          router.push(`/status/${data.client_key}`)
          return
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt]
          setSubmitError(`Reenviando em ${delay / 1000}s...`)
          setTimeout(() => {
            setRetryCount(attempt + 1)
            attemptSubmit(attempt + 1)
          }, delay)
        } else {
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      {/* ── Nome ── */}
      <section>
        <SectionLabel>👤 Seu nome</SectionLabel>
        <div className="space-y-3">
          <div>
            <Input
              id="first_name"
              placeholder="Primeiro nome *"
              autoComplete="given-name"
              inputMode="text"
              disabled={isSubmitting}
              {...form.register('first_name')}
              className="h-12 rounded-xl border-orange-200 bg-white placeholder:text-orange-300
                         focus:border-orange-400 focus:ring-orange-400 text-orange-900"
            />
            {form.formState.errors.first_name && (
              <p className="text-xs text-red-500 mt-1 ml-1">
                {form.formState.errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <Input
              id="last_name"
              placeholder="Sobrenome *"
              autoComplete="family-name"
              inputMode="text"
              disabled={isSubmitting}
              {...form.register('last_name')}
              className="h-12 rounded-xl border-orange-200 bg-white placeholder:text-orange-300
                         focus:border-orange-400 focus:ring-orange-400 text-orange-900"
            />
            {form.formState.errors.last_name && (
              <p className="text-xs text-red-500 mt-1 ml-1">
                {form.formState.errors.last_name.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Sabor ── */}
      <section>
        <SectionLabel>🥞 Escolha o sabor *</SectionLabel>
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
          <p className="text-xs text-red-500 mt-2 ml-1">
            {form.formState.errors.flavor_id.message}
          </p>
        )}
      </section>

      {/* ── Ingredientes ── */}
      {selectedFlavor && (
        <section>
          <SectionLabel>🥄 Ingredientes</SectionLabel>
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
        </section>
      )}

      {/* ── Observação ── */}
      <section>
        <SectionLabel>📝 Observações</SectionLabel>
        <div className="relative">
          <Textarea
            id="observation"
            placeholder="Ex: Sem açúcar, pouca nutella..."
            maxLength={140}
            disabled={isSubmitting}
            {...form.register('observation')}
            className="resize-none rounded-xl border-orange-200 bg-white placeholder:text-orange-300
                       focus:border-orange-400 focus:ring-orange-400 text-orange-900 pb-7"
            rows={3}
          />
          <span className="absolute bottom-2 right-3 text-xs text-orange-300 tabular-nums">
            {observation.length}/140
          </span>
        </div>
        {form.formState.errors.observation && (
          <p className="text-xs text-red-500 mt-1 ml-1">
            {form.formState.errors.observation.message}
          </p>
        )}
      </section>

      {/* ── Erro ── */}
      {submitError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          <span>⚠️</span>
          {submitError}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="
          w-full h-14 rounded-2xl font-bold text-lg text-white
          bg-orange-500 hover:bg-orange-600
          shadow-lg shadow-orange-300/50
          transition-all active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
          flex items-center justify-center gap-2
        "
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          <>Fazer Pedido 🥞</>
        )}
      </button>
    </form>
  )
}

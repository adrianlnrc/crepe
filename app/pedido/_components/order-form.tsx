'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema } from '@/lib/validation/order-schema'
import { generateClientKey } from '@/lib/domain/idempotency'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface OrderFormProps {
  event: {
    id: string
    name: string
    tempo_medio_preparo_global: number
    flavors: any[]
  }
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // ms

const INGREDIENTS = {
  salgado: [
    'Milho',
    'Frango Desfiado',
    'Gorgonzola e Provolone',
    'Bacon',
    'Calabresa',
    'Pimenta de Cheiro',
    'Azeitona',
    'Presunto',
    'Cebola',
    'Alho Poró',
    'Tomate',
    'Ovo Cozido',
    'Lombo Canadense',
    'Palmito',
    'Catupiry',
  ],
  doce: [
    'Banana',
    'Chocolate',
    'Goiabada',
    'Banana, Açúcar e Canela',
    'Romeu e Julieta',
  ],
}
const DOCE_FLAVOR_ID = 'f1000001-0000-0000-0000-000000000007'
const SALGADO_FLAVOR_ID = 'f1000001-0000-0000-0000-000000000008'

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
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [ingredientError, setIngredientError] = useState<string | null>(null)

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

  // Preenche flavor_id automaticamente com base nos ingredientes selecionados
  useEffect(() => {
    const hasDoce = selectedIngredients.some((i) => INGREDIENTS.doce.includes(i))
    const hasSalgado = selectedIngredients.some((i) => INGREDIENTS.salgado.includes(i))
    if (hasDoce) {
      form.setValue('flavor_id', DOCE_FLAVOR_ID)
    } else if (hasSalgado) {
      form.setValue('flavor_id', SALGADO_FLAVOR_ID)
    }
  }, [selectedIngredients, form])

  const observation = form.watch('observation') || ''

  const toggleIngredient = (name: string) => {
    setIngredientError(null)
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    )
  }

  const onSubmit = async (data: any) => {
    if (selectedIngredients.length === 0) {
      setIngredientError('Selecione pelo menos 1 ingrediente')
      return
    }
    const ingredientsList = selectedIngredients.join(', ')
    const nota = data.observation?.trim()
    data.observation = nota ? `${ingredientsList} — ${nota}` : ingredientsList

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

      {/* ── Monte seu crepe ── */}
      <section>
        <SectionLabel>🥞 Monte seu crepe</SectionLabel>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-orange-700/60 mb-2">
              🧂 Salgado
            </p>
            <div className="flex flex-wrap gap-2">
              {INGREDIENTS.salgado.map((name) => {
                const isSelected = selectedIngredients.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleIngredient(name)}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150
                      ${isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-white border-orange-200 text-orange-800 hover:border-orange-400'
                      }
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    `}
                  >
                    {isSelected && <span className="mr-1.5">✓</span>}
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-orange-700/60 mb-2">
              🍫 Doce
            </p>
            <div className="flex flex-wrap gap-2">
              {INGREDIENTS.doce.map((name) => {
                const isSelected = selectedIngredients.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleIngredient(name)}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150
                      ${isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-white border-orange-200 text-orange-800 hover:border-orange-400'
                      }
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    `}
                  >
                    {isSelected && <span className="mr-1.5">✓</span>}
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
          {ingredientError && (
            <p className="text-xs text-red-500 ml-1">{ingredientError}</p>
          )}
        </div>
      </section>

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

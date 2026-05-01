'use client'

interface Flavor {
  id: string
  name: string
  category: 'doce' | 'salgado'
  tempo_medio_preparo: number | null
}

interface FlavorPickerProps {
  flavors: Flavor[]
  selectedId: string
  onSelect: (id: string) => void
  disabled?: boolean
}

const categoryConfig = {
  doce: { label: 'Doces', emoji: '🍫' },
  salgado: { label: 'Salgados', emoji: '🧀' },
}

export function FlavorPicker({ flavors, selectedId, onSelect, disabled }: FlavorPickerProps) {
  const groupedByCategory = {
    doce: flavors.filter((f) => f.category === 'doce'),
    salgado: flavors.filter((f) => f.category === 'salgado'),
  }

  return (
    <div className="space-y-5">
      {(['doce', 'salgado'] as const).map((category) => {
        const items = groupedByCategory[category]
        if (items.length === 0) return null
        const { label, emoji } = categoryConfig[category]

        return (
          <div key={category}>
            <p className="text-xs font-bold tracking-widest uppercase text-orange-700/60 mb-3">
              {emoji} {label}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {items.map((flavor) => {
                const isSelected = selectedId === flavor.id
                return (
                  <button
                    key={flavor.id}
                    type="button"
                    onClick={() => !disabled && onSelect(flavor.id)}
                    disabled={disabled}
                    className={`
                      relative p-4 rounded-2xl border-2 text-left transition-all duration-200 outline-none
                      focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2
                      ${isSelected
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200 scale-[1.02]'
                        : 'border-orange-100 bg-white text-orange-900 hover:border-orange-300 hover:shadow-md'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                    `}
                  >
                    {/* check indicator */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                      </div>
                    )}

                    <div className="text-2xl mb-2 leading-none">
                      {category === 'doce' ? '🍫' : '🧀'}
                    </div>
                    <div className="font-bold text-sm leading-snug pr-6">{flavor.name}</div>
                    {flavor.tempo_medio_preparo && (
                      <div className={`text-xs mt-1.5 ${isSelected ? 'text-orange-100' : 'text-orange-400'}`}>
                        ⏱ ~{Math.round(flavor.tempo_medio_preparo / 60)} min
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

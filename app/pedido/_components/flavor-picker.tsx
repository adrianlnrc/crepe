'use client'

import { Card } from '@/components/ui/card'

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

const categoryLabel = {
  doce: '🍫 Doce',
  salgado: '🧂 Salgado',
}

export function FlavorPicker({
  flavors,
  selectedId,
  onSelect,
  disabled,
}: FlavorPickerProps) {
  const groupedByCategory = {
    doce: flavors.filter((f) => f.category === 'doce'),
    salgado: flavors.filter((f) => f.category === 'salgado'),
  }

  return (
    <div className="space-y-4">
      {(['doce', 'salgado'] as const).map((category) => (
        <div key={category}>
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            {categoryLabel[category]}
          </p>
          <div className="space-y-2">
            {groupedByCategory[category].map((flavor) => (
              <label
                key={flavor.id}
                className={`block cursor-pointer transition-all ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Card
                  className={`p-3 border-2 transition-colors ${
                    selectedId === flavor.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="flavor"
                      value={flavor.id}
                      checked={selectedId === flavor.id}
                      onChange={() => !disabled && onSelect(flavor.id)}
                      disabled={disabled}
                      className="w-4 h-4 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{flavor.name}</div>
                      {flavor.tempo_medio_preparo && (
                        <div className="text-xs text-muted-foreground">
                          ⏱️ ~{Math.round(flavor.tempo_medio_preparo / 60)} min
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

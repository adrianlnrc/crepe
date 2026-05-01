'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'

interface Ingredient {
  id: string
  name: string
}

interface IngredientChecklistProps {
  ingredients: Ingredient[]
  selectedIds: string[]
  onToggle: (id: string) => void
  disabled?: boolean
}

export function IngredientChecklist({
  ingredients,
  selectedIds,
  onToggle,
  disabled,
}: IngredientChecklistProps) {
  if (ingredients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">Nenhum ingrediente disponível</div>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {ingredients.map((ingredient) => (
          <label
            key={ingredient.id}
            className={`flex items-center gap-3 cursor-pointer transition-opacity ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Checkbox
              checked={selectedIds.includes(ingredient.id)}
              onCheckedChange={() => !disabled && onToggle(ingredient.id)}
              disabled={disabled}
              className="accent-primary"
            />
            <span className="text-sm">{ingredient.name}</span>
          </label>
        ))}
      </div>
    </Card>
  )
}

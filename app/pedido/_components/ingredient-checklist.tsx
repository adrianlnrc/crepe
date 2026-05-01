'use client'

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
      <p className="text-sm text-orange-400 italic">Nenhum ingrediente disponível</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ingredients.map((ingredient) => {
        const isSelected = selectedIds.includes(ingredient.id)
        return (
          <button
            key={ingredient.id}
            type="button"
            onClick={() => !disabled && onToggle(ingredient.id)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150
              outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2
              ${isSelected
                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-white border-orange-200 text-orange-800 hover:border-orange-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
            `}
          >
            {isSelected && <span className="mr-1.5">✓</span>}
            {ingredient.name}
          </button>
        )
      })}
    </div>
  )
}

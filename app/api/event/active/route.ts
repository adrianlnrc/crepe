import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const client = getServerClient()

    // Busca evento ativo com sabores e ingredientes aninhados
    const { data: event, error: eventError } = await client
      .from('events')
      .select(
        `
        id, name, slug, starts_at, ends_at, is_active, tempo_medio_preparo_global, created_at,
        flavors (
          id, name, category, tempo_medio_preparo,
          flavor_ingredients (
            ingredient_id,
            ingredients (id, name)
          )
        )
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'No active event found' },
        { status: 404 }
      )
    }

    // Reestrutura para formato esperado pelo cliente
    const formatted = {
      id: (event as any).id,
      name: (event as any).name,
      slug: (event as any).slug,
      starts_at: (event as any).starts_at,
      ends_at: (event as any).ends_at,
      is_active: (event as any).is_active,
      tempo_medio_preparo_global: (event as any).tempo_medio_preparo_global,
      created_at: (event as any).created_at,
      flavors: ((event as any).flavors as any[]).map((flavor: any) => ({
        id: flavor.id,
        name: flavor.name,
        category: flavor.category,
        tempo_medio_preparo: flavor.tempo_medio_preparo,
        ingredients: (flavor.flavor_ingredients || []).map((fi: any) => ({
          id: fi.ingredient_id,
          name: fi.ingredients?.name || '',
        })),
      })),
    }

    return NextResponse.json(
      { event: formatted },
      {
        headers: {
          'Cache-Control': 'public, max-age=60', // Cache por 1 min
        },
      }
    )
  } catch (error) {
    console.error('GET /api/event/active error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

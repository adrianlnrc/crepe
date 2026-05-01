import { NextRequest, NextResponse } from 'next/server'
import { kitchenLoginSchema } from '@/lib/validation/order-schema'
import { verifyKitchenCode, signKitchenSession } from '@/lib/auth/kitchen'
import { v4 as uuidv4 } from 'uuid'

// Rate limiting em memória (simplista, ok para evento local curto)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || record.resetAt < now) {
    // Nova janela ou expirada
    loginAttempts.set(ip, { count: 0, resetAt: now + 5 * 60 * 1000 }) // 5 min
    return { allowed: true }
  }

  if (record.count >= 5) {
    return {
      allowed: false,
      resetIn: Math.ceil((record.resetAt - now) / 1000),
    }
  }

  record.count++
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'too_many_requests',
          retryAfter: rateLimit.resetIn,
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Valida schema
    const validation = kitchenLoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error' },
        { status: 400 }
      )
    }

    const { code } = validation.data

    // Busca evento ativo via service role (server-side)
    const { getServerClient } = await import('@/lib/supabase/server')
    const client = getServerClient()

    const { data: event } = await client
      .from('events')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single<{ id: string }>()

    if (!event) {
      return NextResponse.json(
        { error: 'no_active_event' },
        { status: 404 }
      )
    }

    // Verifica código contra o hash do banco
    const isValid = await verifyKitchenCode(code, event.id)

    if (!isValid) {
      return NextResponse.json(
        { error: 'invalid_code' },
        { status: 401 }
      )
    }

    // Cria sessão
    const sessionId = uuidv4()
    const signedSession = signKitchenSession(sessionId)

    const response = NextResponse.json({ ok: true })

    // Seta cookie httpOnly
    response.cookies.set({
      name: 'kitchen_session',
      value: signedSession,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60, // 12 horas
      path: '/',
    })

    return response
  } catch (error) {
    console.error('POST /api/kitchen/login error:', error)
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 }
    )
  }
}

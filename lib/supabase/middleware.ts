import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Secret para assinar kitchen sessions (mesmo usado na verificação)
function getSessionSecret(): string {
  const secret = process.env.KITCHEN_SESSION_SECRET
  if (!secret) {
    throw new Error('KITCHEN_SESSION_SECRET not configured')
  }
  return secret
}

// Signature de session: HMAC-SHA256(sessionId + timestamp + secret)
// Simples proteção contra tampering; para produção, considerar JWT com exp claim
export function signKitchenSession(sessionId: string): string {
  const secret = getSessionSecret()
  const timestamp = Date.now().toString()
  const data = `${sessionId}:${timestamp}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex')
  return `${data}:${signature}`
}

// Verifica assinatura e validade de session
export function verifyKitchenSession(signedSession: string): {
  sessionId: string
  valid: boolean
} {
  const parts = signedSession.split(':')
  if (parts.length !== 3) {
    return { sessionId: '', valid: false }
  }

  const [sessionId, timestamp, signature] = parts
  const secret = getSessionSecret()

  // Re-computar assinatura esperada
  const data = `${sessionId}:${timestamp}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')

  // Constant-time comparison
  const signatureMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  // Validar timestamp (sessão válida por 24 horas)
  const now = Date.now()
  const sessionAge = now - parseInt(timestamp, 10)
  const valid = signatureMatch && sessionAge < 24 * 60 * 60 * 1000

  return { sessionId, valid }
}

// Middleware helper para validar kitchen session em requests
export function validateKitchenSession(request: NextRequest): {
  sessionId: string | null
  valid: boolean
} {
  const signedSession = request.headers.get('x-kitchen-session-id')
  if (!signedSession) {
    return { sessionId: null, valid: false }
  }

  const { sessionId, valid } = verifyKitchenSession(signedSession)
  return { sessionId, valid }
}

// Middleware para proteger rotas /api/kitchen/*
export function requireKitchenAuth(request: NextRequest) {
  const { valid } = validateKitchenSession(request)

  if (!valid) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing kitchen session' },
      { status: 401 }
    )
  }

  return null // Prosseguir
}

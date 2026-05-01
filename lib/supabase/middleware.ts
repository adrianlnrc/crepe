import { NextRequest, NextResponse } from 'next/server'

// Secret para assinar kitchen sessions
function getSessionSecret(): string {
  const secret = process.env.KITCHEN_SESSION_SECRET
  if (!secret) {
    throw new Error('KITCHEN_SESSION_SECRET not configured')
  }
  return secret
}

// HMAC-SHA256 via Web Crypto (compatível com Edge Runtime do Next.js middleware)
async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Comparação constant-time entre strings hex (sem Buffer/timingSafeEqual)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function signKitchenSession(sessionId: string): Promise<string> {
  const secret = getSessionSecret()
  const timestamp = Date.now().toString()
  const data = `${sessionId}:${timestamp}`
  const signature = await hmacSha256Hex(secret, data)
  return `${data}:${signature}`
}

export async function verifyKitchenSession(signedSession: string): Promise<{
  sessionId: string
  valid: boolean
}> {
  const parts = signedSession.split(':')
  if (parts.length !== 3) {
    return { sessionId: '', valid: false }
  }

  const [sessionId, timestamp, signature] = parts
  const secret = getSessionSecret()

  const data = `${sessionId}:${timestamp}`
  const expectedSignature = await hmacSha256Hex(secret, data)

  const signatureMatch = safeEqual(signature, expectedSignature)

  // Sessão válida por 24 horas
  const now = Date.now()
  const sessionAge = now - parseInt(timestamp, 10)
  const valid = signatureMatch && sessionAge < 24 * 60 * 60 * 1000

  return { sessionId, valid }
}

export async function validateKitchenSession(request: NextRequest): Promise<{
  sessionId: string | null
  valid: boolean
}> {
  const signedSession = request.headers.get('x-kitchen-session-id')
  if (!signedSession) {
    return { sessionId: null, valid: false }
  }

  const { sessionId, valid } = await verifyKitchenSession(signedSession)
  return { sessionId, valid }
}

export async function requireKitchenAuth(request: NextRequest) {
  const { valid } = await validateKitchenSession(request)

  if (!valid) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing kitchen session' },
      { status: 401 }
    )
  }

  return null
}

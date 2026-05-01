import { NextRequest, NextResponse } from 'next/server'
import { verifyKitchenSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rotas que requerem autenticação da cozinha
  const kitchenRoutes = ['/cozinha', '/historico', '/qr', '/api/kitchen/logout', '/api/orders', '/api/history', '/api/export']
  const kitchenApiTransition = pathname.match(/^\/api\/orders\/[^/]+\/transition$/)

  const isProtectedRoute = kitchenRoutes.some((route) => pathname.startsWith(route)) || kitchenApiTransition

  // Rotas públicas dentro de /api/orders (acesso do convidado)
  if (pathname === '/api/orders' && request.method === 'POST') return NextResponse.next()
  if (pathname.startsWith('/api/orders/by-client-key/')) return NextResponse.next()
  if (pathname.startsWith('/api/orders/queue-position')) return NextResponse.next()

  if (isProtectedRoute) {
    // Skip login page
    if (pathname === '/cozinha/login') {
      return NextResponse.next()
    }

    // POST /api/kitchen/login é público
    if (pathname === '/api/kitchen/login' && request.method === 'POST') {
      return NextResponse.next()
    }

    const kitchenSession = request.cookies.get('kitchen_session')?.value

    if (!kitchenSession) {
      // Browser: redireciona para login
      if (request.headers.get('accept')?.includes('text/html')) {
        return NextResponse.redirect(new URL('/cozinha/login', request.url))
      }
      // API: retorna 401
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verifica assinatura da sessão
    const { valid } = await verifyKitchenSession(kitchenSession)
    if (!valid) {
      if (request.headers.get('accept')?.includes('text/html')) {
        return NextResponse.redirect(new URL('/cozinha/login', request.url))
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/cozinha/:path*',
    '/historico/:path*',
    '/qr/:path*',
    '/api/kitchen/:path*',
    '/api/orders/:path*',
    '/api/history/:path*',
    '/api/export/:path*',
  ],
}

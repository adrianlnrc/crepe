import { NextRequest, NextResponse } from 'next/server'
import { verifyKitchenSession } from '@/lib/supabase/middleware'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rotas que requerem autenticação da cozinha
  const kitchenRoutes = ['/cozinha', '/historico', '/api/kitchen/logout', '/api/orders']
  const kitchenApiTransition = pathname.match(/^\/api\/orders\/[^/]+\/transition$/)

  const isProtectedRoute = kitchenRoutes.some((route) => pathname.startsWith(route)) || kitchenApiTransition

  // POST /api/orders (criar pedido) é público
  if (pathname === '/api/orders' && request.method === 'POST') {
    return NextResponse.next()
  }

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
    const { valid } = verifyKitchenSession(kitchenSession)
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
    // Protege rutas da cozinha
    '/cozinha/:path*',
    '/historico/:path*',
    '/api/kitchen/:path*',
    '/api/orders/:path*',
  ],
}

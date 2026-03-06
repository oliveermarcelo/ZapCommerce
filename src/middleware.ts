import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// Rotas públicas (não precisam de autenticação)
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/webhooks/evolution',
  '/api/webhooks/payment',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rotas públicas
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Permitir assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  // Verificar token
  const token = req.cookies.get('token')?.value

  if (!token) {
    // API routes retornam 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Páginas redirecionam para login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const isSuperAdmin = payload.isSuperAdmin === true

    // Rota de super admin
    if (pathname.startsWith('/admin') && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  } catch {
    // Token inválido/expirado
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Token expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))

    // Limpar cookie inválido
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

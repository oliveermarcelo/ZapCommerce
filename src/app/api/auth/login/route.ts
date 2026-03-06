import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signToken, signRefreshToken } from '@/lib/auth'
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-response'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { cookies } from 'next/headers'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json()
  const { email, password } = loginSchema.parse(body)

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenants: {
        where: { isActive: true },
        include: { tenant: true },
        take: 1,
      },
    },
  })

  if (!user || !user.isActive) {
    return apiError('Email ou senha inválidos', 401)
  }

  // Verificar senha
  const validPassword = await compare(password, user.passwordHash)
  if (!validPassword) {
    return apiError('Email ou senha inválidos', 401)
  }

  // Pegar o primeiro tenant do usuário (ou null se for super admin)
  const tenantUser = user.tenants[0]

  // Gerar tokens
  const token = await signToken({
    userId: user.id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: tenantUser?.tenantId,
    role: tenantUser?.role,
  })

  const refreshToken = await signRefreshToken({ userId: user.id })

  // Salvar sessão
  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    },
  })

  // Setar cookies
  const cookieStore = cookies()
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
    path: '/',
  })

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    path: '/',
  })

  return apiSuccess({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    },
    tenant: tenantUser ? {
      id: tenantUser.tenant.id,
      name: tenantUser.tenant.name,
      slug: tenantUser.tenant.slug,
      role: tenantUser.role,
    } : null,
    token,
  })
})

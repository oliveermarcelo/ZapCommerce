import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { signToken, signRefreshToken } from '@/lib/auth'
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-response'
import { hash } from 'bcryptjs'
import { slugify } from '@/lib/utils'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { BusinessType } from '@prisma/client'

const registerSchema = z.object({
  // Dados do usuário
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),

  // Dados do estabelecimento
  businessName: z.string().min(2, 'Nome do estabelecimento obrigatório'),
  businessType: z.nativeEnum(BusinessType).default('GENERIC'),
  document: z.string().optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json()
  const data = registerSchema.parse(body)

  // Verificar email duplicado
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) return apiError('Email já cadastrado', 409)

  // Gerar slug único
  let slug = slugify(data.businessName)
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  // Buscar template do tipo de negócio
  const template = await prisma.businessTemplate.findUnique({
    where: { businessType: data.businessType },
  })

  // Criar tudo em transação
  const result = await prisma.$transaction(async (tx) => {
    // 1. Criar usuário
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hash(data.password, 12),
        phone: data.phone,
      },
    })

    // 2. Criar tenant
    const tenant = await tx.tenant.create({
      data: {
        name: data.businessName,
        slug,
        businessType: data.businessType,
        document: data.document,
        email: data.email,
        phone: data.phone,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias
      },
    })

    // 3. Vincular usuário ao tenant
    await tx.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    })

    // 4. Criar configurações padrão
    const defaultSettings = template?.defaultSettings as any || {}
    await tx.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        ...defaultSettings,
      },
    })

    // 5. Criar colunas Kanban padrão
    const defaultColumns = (template?.defaultKanbanColumns as any[]) || [
      { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
      { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
      { name: 'Preparando', slug: 'preparing', color: '#F97316', icon: 'flame', mappedStatus: 'PREPARING' },
      { name: 'Pronto', slug: 'ready', color: '#8B5CF6', icon: 'check-circle', mappedStatus: 'READY' },
      { name: 'Saiu p/ Entrega', slug: 'out-for-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
      { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
    ]

    for (let i = 0; i < defaultColumns.length; i++) {
      const col = defaultColumns[i]
      await tx.kanbanColumn.create({
        data: {
          tenantId: tenant.id,
          name: col.name,
          slug: col.slug,
          color: col.color,
          icon: col.icon,
          position: i,
          isDefault: col.mappedStatus === 'RECEIVED',
          isFinal: col.mappedStatus === 'DELIVERED',
          mappedStatus: col.mappedStatus,
          autoMessage: col.autoMessage || null,
        },
      })
    }

    // 6. Criar categorias padrão (do template)
    const defaultCategories = (template?.defaultCategories as any[]) || []
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i]
      await tx.category.create({
        data: {
          tenantId: tenant.id,
          name: cat.name,
          slug: slugify(cat.name),
          position: i,
        },
      })
    }

    return { user, tenant }
  })

  // Gerar token
  const token = await signToken({
    userId: result.user.id,
    email: result.user.email,
    isSuperAdmin: false,
    tenantId: result.tenant.id,
    role: 'OWNER',
  })

  const refreshToken = await signRefreshToken({ userId: result.user.id })

  // Setar cookies
  const cookieStore = cookies()
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return apiSuccess({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      businessType: result.tenant.businessType,
    },
    token,
  })
})

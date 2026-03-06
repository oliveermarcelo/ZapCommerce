import { NextRequest } from 'next/server'
import { BusinessType, OrderStatus, Prisma } from '@prisma/client'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { signToken, signRefreshToken } from '@/lib/auth'
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-response'
import { slugify } from '@/lib/utils'

const registerSchema = z.object({
  // User data
  name: z.string().min(2, 'Nome obrigatorio'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  phone: z.string().min(10, 'Telefone invalido'),

  // Tenant data
  businessName: z.string().min(2, 'Nome do estabelecimento obrigatorio'),
  businessType: z.nativeEnum(BusinessType).default('GENERIC'),
  document: z.string().optional(),
})

const VALID_ORDER_STATUS = new Set<OrderStatus>([
  'AWAITING_PAYMENT',
  'RECEIVED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
])

const ALLOWED_SETTINGS_KEYS = [
  'businessHours',
  'deliveryEnabled',
  'pickupEnabled',
  'deliveryFee',
  'deliveryFeePerKm',
  'maxDeliveryRadiusKm',
  'estimatedDeliveryMin',
  'minimumOrderValue',
  'autoAcceptOnPayment',
  'pixExpirationMinutes',
  'autoMoveToReady',
  'autoMoveMinutes',
  'recurrenceEnabled',
  'recurrenceDays',
  'welcomeMessage',
  'closedMessage',
  'orderConfirmMessage',
  'outForDeliveryMsg',
  'completedMessage',
  'pixMessage',
  'expiredMessage',
  'notifySoundEnabled',
  'notifyPushEnabled',
  'notifyEmail',
] as const

type AllowedSettingsKey = (typeof ALLOWED_SETTINGS_KEYS)[number]

function ensureUniqueSlug(base: string, used: Set<string>, fallback: string) {
  const normalizedBase = base || fallback
  let slug = normalizedBase
  let suffix = 1

  while (used.has(slug)) {
    slug = `${normalizedBase}-${suffix}`
    suffix++
  }

  used.add(slug)
  return slug
}

function sanitizeTemplateSettings(raw: unknown): Partial<Record<AllowedSettingsKey, unknown>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  const source = raw as Record<string, unknown>
  const output: Partial<Record<AllowedSettingsKey, unknown>> = {}

  for (const key of ALLOWED_SETTINGS_KEYS) {
    if (source[key] !== undefined) {
      output[key] = source[key]
    }
  }

  return output
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json()
  const data = registerSchema.parse(body)

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) return apiError('Email ja cadastrado', 409)

  // Build unique slug
  let slug = slugify(data.businessName)
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  // Load business template
  const template = await prisma.businessTemplate.findUnique({
    where: { businessType: data.businessType },
  })

  // Default columns fallback
  const defaultColumnsFallback: Array<Record<string, unknown>> = [
    { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
    { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
    { name: 'Preparando', slug: 'preparing', color: '#F97316', icon: 'flame', mappedStatus: 'PREPARING' },
    { name: 'Pronto', slug: 'ready', color: '#8B5CF6', icon: 'check-circle', mappedStatus: 'READY' },
    { name: 'Saiu p/ Entrega', slug: 'out-for-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
    { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
  ]

  let result: {
    user: { id: string; name: string; email: string }
    tenant: { id: string; name: string; slug: string; businessType: BusinessType }
  }

  try {
    result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await hash(data.password, 12),
          phone: data.phone,
        },
      })

      // 2. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.businessName,
          slug,
          businessType: data.businessType,
          document: data.document,
          email: data.email,
          phone: data.phone,
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })

      // 3. Link user to tenant
      await tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      })

      // 4. Create tenant settings (sanitized)
      const defaultSettings = sanitizeTemplateSettings(template?.defaultSettings)
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          ...defaultSettings,
        },
      })

      // 5. Create default kanban columns (sanitized)
      const defaultColumns = Array.isArray(template?.defaultKanbanColumns)
        ? (template?.defaultKanbanColumns as Record<string, unknown>[])
        : defaultColumnsFallback
      const usedColumnSlugs = new Set<string>()

      for (let i = 0; i < defaultColumns.length; i++) {
        const col = defaultColumns[i]
        const colName = String(col.name || `Etapa ${i + 1}`)
        const colBaseSlug = slugify(String(col.slug || colName))
        const colSlug = ensureUniqueSlug(colBaseSlug, usedColumnSlugs, `etapa-${i + 1}`)
        const mappedStatus =
          typeof col.mappedStatus === 'string' && VALID_ORDER_STATUS.has(col.mappedStatus as OrderStatus)
            ? (col.mappedStatus as OrderStatus)
            : null

        await tx.kanbanColumn.create({
          data: {
            tenantId: tenant.id,
            name: colName,
            slug: colSlug,
            color: typeof col.color === 'string' ? col.color : '#3B82F6',
            icon: typeof col.icon === 'string' ? col.icon : null,
            position: i,
            isDefault: mappedStatus === 'RECEIVED',
            isFinal: mappedStatus === 'DELIVERED',
            mappedStatus,
            autoMessage: typeof col.autoMessage === 'string' ? col.autoMessage : null,
          },
        })
      }

      // 6. Create default categories (sanitized)
      const defaultCategories = Array.isArray(template?.defaultCategories)
        ? (template?.defaultCategories as Record<string, unknown>[])
        : []
      const usedCategorySlugs = new Set<string>()

      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = defaultCategories[i]
        const catName = String(cat.name || `Categoria ${i + 1}`)
        const catBaseSlug = slugify(String(cat.slug || catName))
        const catSlug = ensureUniqueSlug(catBaseSlug, usedCategorySlugs, `categoria-${i + 1}`)

        await tx.category.create({
          data: {
            tenantId: tenant.id,
            name: catName,
            slug: catSlug,
            position: i,
          },
        })
      }

      return { user, tenant }
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return apiError('Dados ja cadastrados. Tente outro email ou nome de loja.', 409)
      }
      if (error.code === 'P2003') {
        return apiError('Falha de relacionamento ao criar conta. Verifique os dados e tente novamente.', 400)
      }
    }
    throw error
  }

  // Create auth tokens
  const token = await signToken({
    userId: result.user.id,
    email: result.user.email,
    isSuperAdmin: false,
    tenantId: result.tenant.id,
    role: 'OWNER',
  })

  const refreshToken = await signRefreshToken({ userId: result.user.id })

  // Persist refresh session
  await prisma.session.create({
    data: {
      userId: result.user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Set cookies
  const cookieStore = cookies()
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return apiSuccess({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      isSuperAdmin: false,
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
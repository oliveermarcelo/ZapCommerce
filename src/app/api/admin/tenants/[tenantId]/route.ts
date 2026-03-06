import { TenantPlan, TenantStatus } from '@prisma/client'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiError, apiSuccess, withErrorHandler } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'

const updateTenantSchema = z
  .object({
    plan: z.nativeEnum(TenantPlan).optional(),
    status: z.nativeEnum(TenantStatus).optional(),
    platformFeePercent: z.number().min(0).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nenhum campo para atualizar foi informado',
  })

export const PATCH = withErrorHandler(
  async (req: NextRequest, context?: { params?: { tenantId?: string } }) => {
    await requireSuperAdmin()

    const tenantId = context?.params?.tenantId
    if (!tenantId) {
      return apiError('tenantId é obrigatório', 400)
    }

    const body = await req.json()
    const parsed = updateTenantSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message || 'Payload inválido', 422)
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        platformFeePercent: true,
        updatedAt: true,
      },
    })

    return apiSuccess(tenant)
  }
)

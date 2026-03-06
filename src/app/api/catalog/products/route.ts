import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireTenant } from '@/lib/auth'
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-response'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

// GET /api/catalog/products
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()
  const { searchParams } = new URL(req.url)

  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')
  const isActive = searchParams.get('active')

  const where: any = { tenantId: session.tenantId }
  if (categoryId) where.categoryId = categoryId
  if (isActive !== null) where.isActive = isActive === 'true'
  if (search) where.name = { contains: search, mode: 'insensitive' }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      optionGroups: {
        include: {
          optionGroup: {
            include: { options: { where: { isActive: true }, orderBy: { position: 'asc' } } },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  })

  return apiSuccess(products)
})

// POST /api/catalog/products
const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  promotionalPrice: z.number().positive().optional(),
  categoryId: z.string(),
  imageUrl: z.string().optional(),
  stockEnabled: z.boolean().default(false),
  stockQuantity: z.number().int().optional(),
  isActive: z.boolean().default(true),
  optionGroupIds: z.array(z.string()).optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()
  const body = await req.json()
  const data = createSchema.parse(body)

  // Get next position
  const lastProduct = await prisma.product.findFirst({
    where: { tenantId: session.tenantId, categoryId: data.categoryId },
    orderBy: { position: 'desc' },
  })

  let slug = slugify(data.name)
  const slugExists = await prisma.product.findFirst({
    where: { tenantId: session.tenantId, slug },
  })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  const product = await prisma.product.create({
    data: {
      tenantId: session.tenantId,
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      promotionalPrice: data.promotionalPrice,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl,
      stockEnabled: data.stockEnabled,
      stockQuantity: data.stockQuantity,
      isActive: data.isActive,
      position: (lastProduct?.position ?? -1) + 1,
      optionGroups: data.optionGroupIds ? {
        create: data.optionGroupIds.map((ogId, i) => ({
          optionGroupId: ogId,
          position: i,
        })),
      } : undefined,
    },
    include: {
      category: true,
      optionGroups: { include: { optionGroup: { include: { options: true } } } },
    },
  })

  return apiSuccess(product)
})

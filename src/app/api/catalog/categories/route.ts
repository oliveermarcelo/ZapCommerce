import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireTenant } from '@/lib/auth'
import { apiSuccess, withErrorHandler } from '@/lib/api-response'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

// GET /api/catalog/categories
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()

  const categories = await prisma.category.findMany({
    where: { tenantId: session.tenantId },
    include: { _count: { select: { products: true } } },
    orderBy: { position: 'asc' },
  })

  return apiSuccess(categories.map(c => ({
    ...c,
    productsCount: c._count.products,
    _count: undefined,
  })))
})

// POST /api/catalog/categories
const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()
  const body = await req.json()
  const data = createSchema.parse(body)

  const lastCat = await prisma.category.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { position: 'desc' },
  })

  let slug = slugify(data.name)
  const slugExists = await prisma.category.findFirst({
    where: { tenantId: session.tenantId, slug },
  })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  const category = await prisma.category.create({
    data: {
      tenantId: session.tenantId,
      name: data.name,
      slug,
      description: data.description,
      imageUrl: data.imageUrl,
      position: (lastCat?.position ?? -1) + 1,
    },
  })

  return apiSuccess(category)
})

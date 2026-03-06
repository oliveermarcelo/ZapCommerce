import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function apiValidationError(error: ZodError) {
  const errors = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message,
  }))
  return NextResponse.json({ success: false, errors }, { status: 422 })
}

export function apiUnauthorized(message = 'Não autorizado') {
  return apiError(message, 401)
}

export function apiForbidden(message = 'Acesso negado') {
  return apiError(message, 403)
}

export function apiNotFound(message = 'Recurso não encontrado') {
  return apiError(message, 404)
}

// Wrapper para tratar erros automaticamente nas API routes
export function withErrorHandler<TReq extends Request = Request, TContext = any>(
  handler: (req: TReq, context?: TContext) => Promise<NextResponse> | NextResponse
) {
  return async (req: TReq, context?: TContext): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error: any) {
      console.error('[API Error]', error)

      if (error instanceof ZodError) {
        return apiValidationError(error)
      }

      if (error.message === 'Unauthorized') {
        return apiUnauthorized()
      }

      if (error.message === 'Forbidden: Super Admin only') {
        return apiForbidden()
      }

      return apiError(
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Erro interno do servidor',
        500
      )
    }
  }
}

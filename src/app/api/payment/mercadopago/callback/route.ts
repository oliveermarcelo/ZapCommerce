import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { MercadoPagoProvider } from '@/services/payment/mercadopago.provider'

/**
 * GET /api/payment/mercadopago/callback
 * 
 * Callback do OAuth do Mercado Pago.
 * Quando o lojista autoriza a conexão, o MP redireciona pra cá com o code.
 * 
 * Query params:
 *   - code: authorization code
 *   - state: tenantId (passado na URL de autorização)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const tenantId = searchParams.get('state')

  if (!code || !tenantId) {
    return NextResponse.redirect(new URL('/settings?error=mp_missing_params', req.url))
  }

  try {
    const mp = new MercadoPagoProvider()
    const result = await mp.processOAuthCallback(code, tenantId)

    // Salvar tokens do seller no tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        paymentGateway: 'mercadopago',
        mpUserId: String(result.userId),
        mpAccessToken: result.accessToken,
        mpRefreshToken: result.refreshToken,
        mpTokenExpiresAt: new Date(Date.now() + result.expiresIn * 1000),
        gatewaySubAccountId: String(result.userId),
      },
    })

    // Redirecionar pro painel com sucesso
    return NextResponse.redirect(
      new URL('/settings?success=mp_connected', req.url)
    )
  } catch (error: any) {
    console.error('[MP OAuth Error]', error?.response?.data || error)
    return NextResponse.redirect(
      new URL('/settings?error=mp_oauth_failed', req.url)
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { processPaymentWebhook } from '@/services/payment'

/**
 * POST /api/webhooks/payment
 * Recebe webhooks de AMBOS os gateways: Asaas e Mercado Pago
 * Detecta automaticamente qual enviou e processa.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // Coletar headers relevantes para validação
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => { headers[key] = value })

    await processPaymentWebhook(payload, headers)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Payment Webhook Error]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/payment
 * Verificação do webhook do Mercado Pago (se necessário)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}

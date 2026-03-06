import axios, { type AxiosInstance } from 'axios'
import crypto from 'crypto'
import type {
  IPaymentProvider, PaymentGateway,
  CreateSubAccountInput, SubAccountResult,
  CreatePixChargeInput, PixChargeResult,
  CreateInvoiceInput, InvoiceResult,
  PaymentWebhookData, ChargeStatus,
} from './provider.interface'

/**
 * ============================================
 * Mercado Pago Payment Provider
 * ============================================
 * 
 * Usa a API de Marketplace com Split de Pagamentos.
 * API: https://www.mercadopago.com.br/developers/pt/docs
 * 
 * Estrutura:
 *   - Sua conta = Marketplace (aplicação OAuth)
 *   - Lojista = Seller conectado via OAuth
 *   - Split = application_fee no pagamento
 * 
 * Fluxo de onboarding do lojista:
 *   1. Lojista autoriza via OAuth (MP Connect)
 *   2. Você recebe access_token do seller
 *   3. Cobranças criadas com access_token do seller
 *   4. application_fee retém sua % automaticamente
 * 
 * Taxas Mercado Pago:
 *   - PIX: 0,99% por transação
 *   - Marketplace fee: sem custo adicional
 *   - Dinheiro disponível: instantâneo ou D+14 (grátis)
 */
export class MercadoPagoProvider implements IPaymentProvider {
  readonly gateway: PaymentGateway = 'mercadopago'
  private baseUrl = 'https://api.mercadopago.com'

  private get api(): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      timeout: 30000,
    })
  }

  /** API autenticada com token do seller (lojista) */
  private sellerApi(accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 30000,
    })
  }

  // ============================================
  // SUBCONTAS (OAuth - MP Connect)
  // ============================================

  /**
   * No Mercado Pago, "criar subconta" significa gerar o link OAuth
   * para o lojista conectar sua conta MP ao seu marketplace.
   * 
   * O retorno inclui a URL de autorização.
   * Após autorizar, o callback retorna o access_token do seller.
   */
  async createSubAccount(input: CreateSubAccountInput): Promise<SubAccountResult> {
    // No MP, o onboarding é via OAuth, não criação direta de conta.
    // Geramos a URL de autorização e salvamos o externalReference.
    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${process.env.MP_APP_ID}&response_type=code&platform_id=mp&state=${input.externalReference}&redirect_uri=${encodeURIComponent(process.env.MP_REDIRECT_URI || '')}`

    return {
      id: '', // Será preenchido após callback OAuth
      externalReference: input.externalReference,
      status: 'pending_oauth', // Lojista precisa autorizar
    }
  }

  /**
   * Processa o callback OAuth do Mercado Pago.
   * Chamado quando o lojista autoriza a conexão.
   */
  async processOAuthCallback(code: string, tenantId: string): Promise<{
    accessToken: string
    refreshToken: string
    userId: number
    publicKey: string
    expiresIn: number
  }> {
    const { data } = await axios.post('https://api.mercadopago.com/oauth/token', {
      client_id: process.env.MP_APP_ID,
      client_secret: process.env.MP_APP_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.MP_REDIRECT_URI,
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id,
      publicKey: data.public_key,
      expiresIn: data.expires_in,
    }
  }

  /** Renovar token OAuth do seller */
  async refreshSellerToken(refreshToken: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const { data } = await axios.post('https://api.mercadopago.com/oauth/token', {
      client_id: process.env.MP_APP_ID,
      client_secret: process.env.MP_APP_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }
  }

  async getSubAccount(subAccountId: string): Promise<SubAccountResult | null> {
    // subAccountId aqui é o user_id do seller no MP
    try {
      const { data } = await this.api.get(`/users/${subAccountId}`)
      return {
        id: String(data.id),
        externalReference: '',
        status: data.status?.site_status === 'active' ? 'active' : 'pending',
      }
    } catch {
      return null
    }
  }

  // ============================================
  // COBRANÇAS PIX (PEDIDOS)
  // ============================================

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const expiresAt = new Date(Date.now() + input.expirationMinutes * 60 * 1000)

    // Buscar access_token do seller (lojista)
    const sellerToken = await this.getSellerToken(input.subAccountId)
    const api = this.sellerApi(sellerToken)

    // Calcular application_fee (taxa do marketplace)
    let applicationFee = 0
    if (input.split.type === 'percentage') {
      applicationFee = Math.round((input.amount * input.split.value / 100) * 100) / 100
    } else {
      applicationFee = input.split.value
    }

    // Criar pagamento via PIX com application_fee
    const { data: payment } = await api.post('/v1/payments', {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        first_name: input.payer.name?.split(' ')[0] || 'Cliente',
        last_name: input.payer.name?.split(' ').slice(1).join(' ') || '',
        identification: input.payer.document ? {
          type: input.payer.document.length > 11 ? 'CNPJ' : 'CPF',
          number: input.payer.document.replace(/\D/g, ''),
        } : undefined,
      },
      external_reference: input.externalReference,
      date_of_expiration: expiresAt.toISOString(),
      // Taxa do marketplace (seus 5%)
      application_fee: applicationFee,
      // Notificação de webhook
      notification_url: `${process.env.WEBHOOK_BASE_URL}/payment`,
    })

    // Extrair dados do PIX
    const pixInfo = payment.point_of_interaction?.transaction_data

    return {
      chargeId: String(payment.id),
      qrCodeBase64: pixInfo?.qr_code_base64 || '',
      qrCodeText: pixInfo?.qr_code || '',
      expiresAt,
      status: payment.status,
    }
  }

  async getChargeStatus(chargeId: string): Promise<ChargeStatus> {
    const { data } = await this.api.get(`/v1/payments/${chargeId}`)
    return {
      chargeId: String(data.id),
      status: this.mapMPStatus(data.status),
      amount: data.transaction_amount,
      paidAt: data.date_approved ? new Date(data.date_approved) : undefined,
    }
  }

  async cancelCharge(chargeId: string): Promise<void> {
    await this.api.put(`/v1/payments/${chargeId}`, {
      status: 'cancelled',
    })
  }

  async refundCharge(chargeId: string, amount?: number): Promise<void> {
    await this.api.post(`/v1/payments/${chargeId}/refunds`, {
      ...(amount && { amount }),
    })
  }

  // ============================================
  // FATURAS (COBRANÇA MENSAL)
  // ============================================

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult> {
    // Criar pagamento PIX direto na conta principal (sem split)
    const expiresAt = new Date(input.dueDate + 'T23:59:59')

    const { data: payment } = await this.api.post('/v1/payments', {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        first_name: input.payer.name.split(' ')[0],
        last_name: input.payer.name.split(' ').slice(1).join(' '),
        email: input.payer.email,
        identification: {
          type: input.payer.document.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF',
          number: input.payer.document.replace(/\D/g, ''),
        },
      },
      external_reference: input.externalReference,
      date_of_expiration: expiresAt.toISOString(),
      notification_url: `${process.env.WEBHOOK_BASE_URL}/payment`,
    })

    const pixInfo = payment.point_of_interaction?.transaction_data

    return {
      invoiceId: String(payment.id),
      pixQrCode: pixInfo?.qr_code_base64,
      pixCopyPaste: pixInfo?.qr_code,
      status: payment.status,
    }
  }

  // ============================================
  // WEBHOOK
  // ============================================

  parseWebhook(payload: any, headers?: Record<string, string>): PaymentWebhookData | null {
    // MP pode enviar webhook com { action, data: { id } }
    // ou diretamente o payment object

    // Webhook tipo notificação: { action: "payment.updated", data: { id: "12345" } }
    if (payload.action && payload.data?.id) {
      // Precisamos buscar o pagamento pra ter os dados completos
      // Isso será feito no handler do webhook
      const actionMap: Record<string, PaymentWebhookData['event']> = {
        'payment.created': 'payment_confirmed', // Vamos verificar status depois
        'payment.updated': 'payment_confirmed',
      }

      return {
        event: actionMap[payload.action] || 'payment_confirmed',
        chargeId: String(payload.data.id),
        externalReference: undefined, // Será resolvido ao buscar o pagamento
        amount: 0, // Será resolvido ao buscar o pagamento
        raw: payload,
      }
    }

    // Webhook com payment object completo
    if (payload.id && payload.status) {
      return {
        event: this.mapMPStatusToEvent(payload.status),
        chargeId: String(payload.id),
        externalReference: payload.external_reference,
        amount: payload.transaction_amount,
        paidAt: payload.date_approved ? new Date(payload.date_approved) : undefined,
        raw: payload,
      }
    }

    return null
  }

  isWebhookValid(payload: any, headers?: Record<string, string>): boolean {
    // Mercado Pago usa x-signature header com HMAC
    const xSignature = headers?.['x-signature']
    const xRequestId = headers?.['x-request-id']

    if (!xSignature || !process.env.MP_WEBHOOK_SECRET) return true // Sandbox

    try {
      // Formato: ts=XXX,v1=YYY
      const parts = xSignature.split(',')
      const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1]
      const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1]

      if (!ts || !v1) return false

      const dataId = payload.data?.id
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

      const hmac = crypto
        .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex')

      return hmac === v1
    } catch {
      return false
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  async getPixQrCode(chargeId: string) {
    try {
      const { data } = await this.api.get(`/v1/payments/${chargeId}`)
      const pixInfo = data.point_of_interaction?.transaction_data
      if (!pixInfo) return null
      return {
        qrCodeBase64: pixInfo.qr_code_base64 || '',
        qrCodeText: pixInfo.qr_code || '',
      }
    } catch {
      return null
    }
  }

  /** Buscar access_token do seller no banco */
  private async getSellerToken(subAccountId: string): Promise<string> {
    const prisma = (await import('@/lib/prisma')).default
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { gatewaySubAccountId: subAccountId },
          { mpUserId: subAccountId },
        ],
      },
    })

    if (!tenant?.mpAccessToken) {
      throw new Error('Mercado Pago não conectado para este lojista')
    }

    // Verificar se o token expirou e renovar se necessário
    if (tenant.mpTokenExpiresAt && new Date(tenant.mpTokenExpiresAt) < new Date()) {
      if (tenant.mpRefreshToken) {
        const refreshed = await this.refreshSellerToken(tenant.mpRefreshToken)
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            mpAccessToken: refreshed.accessToken,
            mpRefreshToken: refreshed.refreshToken,
            mpTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          },
        })
        return refreshed.accessToken
      }
      throw new Error('Token Mercado Pago expirado e sem refresh token')
    }

    return tenant.mpAccessToken
  }

  private mapMPStatus(status: string): ChargeStatus['status'] {
    const map: Record<string, ChargeStatus['status']> = {
      'pending': 'pending',
      'approved': 'confirmed',
      'authorized': 'pending',
      'in_process': 'pending',
      'in_mediation': 'pending',
      'rejected': 'cancelled',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
      'charged_back': 'refunded',
    }
    return map[status] || 'pending'
  }

  private mapMPStatusToEvent(status: string): PaymentWebhookData['event'] {
    if (status === 'approved') return 'payment_confirmed'
    if (status === 'refunded' || status === 'charged_back') return 'payment_refunded'
    if (status === 'rejected' || status === 'cancelled') return 'payment_expired'
    return 'payment_failed'
  }
}

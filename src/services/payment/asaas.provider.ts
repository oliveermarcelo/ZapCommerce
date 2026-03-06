import axios, { type AxiosInstance } from 'axios'
import type {
  IPaymentProvider, PaymentGateway,
  CreateSubAccountInput, SubAccountResult,
  CreatePixChargeInput, PixChargeResult,
  CreateInvoiceInput, InvoiceResult,
  PaymentWebhookData, ChargeStatus,
} from './provider.interface'

/**
 * ============================================
 * Asaas Payment Provider
 * ============================================
 * 
 * API: https://docs.asaas.com
 * Sandbox: https://sandbox.asaas.com/api/v3
 * Produção: https://api.asaas.com/api/v3
 * 
 * Fluxo:
 *   1. Conta principal do SaaS (conta-pai)
 *   2. Subconta por lojista (conta-filha) criada via API
 *   3. Cobrança criada na subconta com split apontando pra conta-pai
 *   4. Webhook confirma pagamento → sistema processa
 * 
 * Taxas Asaas:
 *   - PIX: R$ 0,99 (promo 3 meses) → R$ 1,99 por transação
 *   - Split: sem custo adicional
 *   - Transferência: 30 grátis/mês
 */
export class AsaasProvider implements IPaymentProvider {
  readonly gateway: PaymentGateway = 'asaas'
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3',
      headers: {
        'Content-Type': 'application/json',
        access_token: process.env.ASAAS_API_KEY || '',
      },
      timeout: 30000,
    })
  }

  /** API autenticada com token de uma subconta específica */
  private subApi(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3',
      headers: { 'Content-Type': 'application/json', access_token: apiKey },
      timeout: 30000,
    })
  }

  // ============================================
  // SUBCONTAS
  // ============================================

  async createSubAccount(input: CreateSubAccountInput): Promise<SubAccountResult> {
    const { data } = await this.api.post('/accounts', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.document.replace(/\D/g, ''),
      mobilePhone: input.phone?.replace(/\D/g, ''),
      externalReference: input.externalReference,
      // Configurações da subconta
      loginEmail: input.email,
      companyType: input.document.replace(/\D/g, '').length > 11 ? 'LIMITED' : 'MEI',
      // Dados bancários (se fornecidos)
      ...(input.bankAccount && {
        bankAccount: {
          bank: { code: input.bankAccount.bank },
          accountName: input.name,
          ownerName: input.name,
          cpfCnpj: input.document.replace(/\D/g, ''),
          type: input.bankAccount.accountType === 'checking' ? 'CONTA_CORRENTE' : 'CONTA_POUPANCA',
          agency: input.bankAccount.agency,
          account: input.bankAccount.account,
          accountDigit: input.bankAccount.accountDigit,
        },
      }),
    })

    return {
      id: data.walletId || data.id,
      externalReference: input.externalReference,
      status: data.accountNumber ? 'active' : 'pending',
    }
  }

  async getSubAccount(subAccountId: string): Promise<SubAccountResult | null> {
    try {
      const { data } = await this.api.get('/accounts', {
        params: { walletId: subAccountId },
      })
      const account = data.data?.[0]
      if (!account) return null
      return {
        id: account.walletId || subAccountId,
        externalReference: account.externalReference || '',
        status: account.accountNumber ? 'active' : 'pending',
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

    // 1. Criar customer (ou recuperar existente)
    let customerId: string | null = null
    try {
      const { data: customer } = await this.api.post('/customers', {
        name: input.payer.name || 'Cliente WhatsApp',
        phone: input.payer.phone?.replace(/\D/g, ''),
        externalReference: `payer_${input.externalReference}`,
        notificationDisabled: true,
      })
      customerId = customer.id
    } catch (err: any) {
      // Se já existe, buscar
      if (err.response?.status === 400) {
        const { data } = await this.api.get('/customers', {
          params: { externalReference: `payer_${input.externalReference}` },
        })
        customerId = data.data?.[0]?.id
      }
    }

    // 2. Criar cobrança PIX com split
    const chargePayload: any = {
      customer: customerId,
      billingType: 'PIX',
      value: input.amount,
      dueDate: expiresAt.toISOString().split('T')[0],
      description: input.description,
      externalReference: input.externalReference,
    }

    // Configurar split
    if (input.split) {
      chargePayload.split = [{
        walletId: input.split.platformWalletId,
        ...(input.split.type === 'percentage'
          ? { percentualValue: input.split.value }
          : { fixedValue: input.split.value }
        ),
      }]
    }

    const { data: charge } = await this.api.post('/payments', chargePayload)

    // 3. Obter QR Code PIX
    const { data: pixData } = await this.api.get(`/payments/${charge.id}/pixQrCode`)

    return {
      chargeId: charge.id,
      qrCodeBase64: pixData.encodedImage,
      qrCodeText: pixData.payload,
      expiresAt,
      status: charge.status,
    }
  }

  async getChargeStatus(chargeId: string): Promise<ChargeStatus> {
    const { data } = await this.api.get(`/payments/${chargeId}`)
    return {
      chargeId: data.id,
      status: this.mapAsaasStatus(data.status),
      amount: data.value,
      paidAt: data.confirmedDate ? new Date(data.confirmedDate) : undefined,
    }
  }

  async cancelCharge(chargeId: string): Promise<void> {
    await this.api.delete(`/payments/${chargeId}`)
  }

  async refundCharge(chargeId: string, amount?: number): Promise<void> {
    await this.api.post(`/payments/${chargeId}/refund`, {
      ...(amount && { value: amount }),
    })
  }

  // ============================================
  // FATURAS (COBRANÇA MENSAL DE TAXAS)
  // ============================================

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult> {
    // Criar customer para o lojista
    let customerId: string | null = null
    try {
      const { data } = await this.api.post('/customers', {
        name: input.payer.name,
        email: input.payer.email,
        cpfCnpj: input.payer.document.replace(/\D/g, ''),
        notificationDisabled: false, // Lojista recebe notificação
      })
      customerId = data.id
    } catch {
      const { data } = await this.api.get('/customers', {
        params: { cpfCnpj: input.payer.document.replace(/\D/g, '') },
      })
      customerId = data.data?.[0]?.id
    }

    // Criar cobrança PIX
    const { data: charge } = await this.api.post('/payments', {
      customer: customerId,
      billingType: 'PIX',
      value: input.amount,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    })

    // Obter QR Code
    let pixQrCode, pixCopyPaste
    try {
      const { data: pix } = await this.api.get(`/payments/${charge.id}/pixQrCode`)
      pixQrCode = pix.encodedImage
      pixCopyPaste = pix.payload
    } catch { /* PIX pode não estar disponível ainda */ }

    return {
      invoiceId: charge.id,
      pixQrCode,
      pixCopyPaste,
      status: charge.status,
    }
  }

  // ============================================
  // WEBHOOK
  // ============================================

  parseWebhook(payload: any): PaymentWebhookData | null {
    const { event, payment } = payload
    if (!event || !payment) return null

    const eventMap: Record<string, PaymentWebhookData['event']> = {
      'PAYMENT_CONFIRMED': 'payment_confirmed',
      'PAYMENT_RECEIVED': 'payment_confirmed',
      'PAYMENT_OVERDUE': 'payment_expired',
      'PAYMENT_DELETED': 'payment_expired',
      'PAYMENT_REFUNDED': 'payment_refunded',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS': 'payment_failed',
    }

    const mapped = eventMap[event]
    if (!mapped) return null

    return {
      event: mapped,
      chargeId: payment.id,
      externalReference: payment.externalReference,
      amount: payment.value,
      paidAt: payment.confirmedDate ? new Date(payment.confirmedDate) : undefined,
      raw: payload,
    }
  }

  isWebhookValid(payload: any, headers?: Record<string, string>): boolean {
    // Asaas usa token no header para validar
    const token = headers?.['asaas-access-token'] || headers?.['access_token']
    if (process.env.ASAAS_WEBHOOK_SECRET) {
      return token === process.env.ASAAS_WEBHOOK_SECRET
    }
    return true // Em sandbox, aceitar tudo
  }

  // ============================================
  // HELPERS
  // ============================================

  async getPixQrCode(chargeId: string) {
    try {
      const { data } = await this.api.get(`/payments/${chargeId}/pixQrCode`)
      return {
        qrCodeBase64: data.encodedImage,
        qrCodeText: data.payload,
      }
    } catch {
      return null
    }
  }

  private mapAsaasStatus(status: string): ChargeStatus['status'] {
    const map: Record<string, ChargeStatus['status']> = {
      'PENDING': 'pending',
      'RECEIVED': 'confirmed',
      'CONFIRMED': 'confirmed',
      'OVERDUE': 'expired',
      'REFUNDED': 'refunded',
      'DELETED': 'cancelled',
      'REFUND_REQUESTED': 'refunded',
    }
    return map[status] || 'pending'
  }
}

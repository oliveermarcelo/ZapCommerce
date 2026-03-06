/**
 * ============================================
 * Payment Provider Interface
 * ============================================
 * 
 * Contrato abstrato para gateways de pagamento.
 * Implementado por:
 *   - AsaasProvider
 *   - MercadoPagoProvider
 * 
 * Cada tenant escolhe qual gateway usar.
 * O sistema resolve o provider correto via factory.
 */

// ============================================
// TYPES
// ============================================

export type PaymentGateway = 'asaas' | 'mercadopago'

/** Dados para criar subconta do lojista no gateway */
export interface CreateSubAccountInput {
  name: string
  email: string
  document: string          // CPF ou CNPJ
  phone?: string
  externalReference: string // tenantId
  // Dados bancários (opcional - pode ser configurado depois)
  bankAccount?: {
    bank: string
    accountType: 'checking' | 'savings'
    agency: string
    account: string
    accountDigit: string
  }
}

export interface SubAccountResult {
  id: string              // ID no gateway (walletId / collector_id)
  externalReference: string
  status: string
}

/** Dados para gerar cobrança PIX */
export interface CreatePixChargeInput {
  /** ID da subconta do lojista no gateway */
  subAccountId: string
  /** Valor total da cobrança */
  amount: number
  /** Descrição da cobrança */
  description: string
  /** ID externo (orderId) */
  externalReference: string
  /** Dados do pagador */
  payer: {
    name?: string
    document?: string     // CPF
    phone?: string
  }
  /** Expiração em minutos */
  expirationMinutes: number
  /** Regras de split */
  split: {
    /** walletId/collector_id do dono do SaaS */
    platformWalletId: string
    /** Percentual OU valor fixo */
    type: 'percentage' | 'fixed'
    value: number         // 5.0 para 5% ou 5.00 para R$5
  }
}

export interface PixChargeResult {
  chargeId: string         // ID da cobrança no gateway
  qrCodeBase64: string     // Imagem QR Code em base64
  qrCodeText: string       // Código copia-e-cola (EMV)
  expiresAt: Date
  status: string
}

/** Dados para gerar cobrança avulsa (fatura mensal de taxas) */
export interface CreateInvoiceInput {
  /** Cobrar do lojista (subconta) ou gerar na conta principal */
  targetAccountId?: string
  amount: number
  description: string
  externalReference: string
  dueDate: string          // YYYY-MM-DD
  payer: {
    name: string
    email: string
    document: string
  }
}

export interface InvoiceResult {
  invoiceId: string
  pixQrCode?: string
  pixCopyPaste?: string
  status: string
}

/** Dados normalizados do webhook de pagamento */
export interface PaymentWebhookData {
  event: 'payment_confirmed' | 'payment_expired' | 'payment_refunded' | 'payment_failed'
  chargeId: string
  externalReference?: string
  amount: number
  paidAt?: Date
  raw: any
}

/** Status de uma cobrança */
export interface ChargeStatus {
  chargeId: string
  status: 'pending' | 'confirmed' | 'expired' | 'refunded' | 'cancelled'
  amount: number
  paidAt?: Date
}

// ============================================
// INTERFACE PRINCIPAL
// ============================================

export interface IPaymentProvider {
  readonly gateway: PaymentGateway

  // === Subcontas (onboarding do lojista) ===
  createSubAccount(input: CreateSubAccountInput): Promise<SubAccountResult>
  getSubAccount(subAccountId: string): Promise<SubAccountResult | null>

  // === Cobranças PIX (pedidos) ===
  createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult>
  getChargeStatus(chargeId: string): Promise<ChargeStatus>
  cancelCharge(chargeId: string): Promise<void>
  refundCharge(chargeId: string, amount?: number): Promise<void>

  // === Faturas (cobrança mensal de taxas) ===
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult>

  // === Webhook ===
  parseWebhook(payload: any, headers?: Record<string, string>): PaymentWebhookData | null
  isWebhookValid(payload: any, headers?: Record<string, string>): boolean

  // === Helpers ===
  getPixQrCode(chargeId: string): Promise<{ qrCodeBase64: string; qrCodeText: string } | null>
}

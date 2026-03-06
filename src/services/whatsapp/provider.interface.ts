/**
 * ============================================
 * WhatsApp Provider Interface
 * ============================================
 * 
 * Contrato abstrato que define todas as operações de WhatsApp.
 * Implementado por:
 *   - EvolutionProvider (Evolution API v2 - Baileys)
 *   - MetaCloudProvider (API Oficial do WhatsApp - Meta Cloud API)
 * 
 * O tenant escolhe qual provider usar nas configurações.
 * O sistema usa o provider correto automaticamente.
 */

// ============================================
// TYPES
// ============================================

export type WhatsAppProvider = 'evolution' | 'meta_cloud'

export interface SendTextOptions {
  instanceId: string  // Evolution: instanceName | Meta: phoneNumberId
  to: string          // Número do destinatário (55XXXXXXXXXXX)
  text: string
}

export interface SendImageOptions {
  instanceId: string
  to: string
  imageUrl?: string
  imageBase64?: string
  caption?: string
}

export interface SendListOptions {
  instanceId: string
  to: string
  title: string
  description: string
  buttonText: string
  footerText?: string
  sections: Array<{
    title: string
    rows: Array<{
      id: string
      title: string
      description?: string
    }>
  }>
}

export interface SendButtonsOptions {
  instanceId: string
  to: string
  title: string
  body: string
  footerText?: string
  buttons: Array<{
    id: string
    title: string
  }>
}

export interface SendLocationOptions {
  instanceId: string
  to: string
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface SendTemplateOptions {
  instanceId: string
  to: string
  templateName: string
  languageCode: string
  components?: Array<{
    type: 'header' | 'body' | 'button'
    parameters: Array<{
      type: 'text' | 'image' | 'document'
      text?: string
      image?: { link: string }
    }>
  }>
}

export interface ConnectionStatus {
  connected: boolean
  phoneNumber?: string
  displayName?: string
  qrCode?: string        // Base64 do QR Code (Evolution)
  qrCodeUrl?: string     // URL do QR Code
}

export interface WebhookMessage {
  // Dados normalizados independente do provider
  messageId: string
  from: string            // Número do remetente
  fromName?: string       // Push name
  timestamp: number
  type: 'text' | 'list_reply' | 'button_reply' | 'image' | 'location' | 'audio' | 'video' | 'document' | 'unknown'
  text?: string           // Texto da mensagem
  listReplyId?: string    // ID da opção selecionada (lista)
  buttonReplyId?: string  // ID do botão clicado
  imageUrl?: string
  latitude?: number
  longitude?: number
  isFromMe: boolean
  isGroup: boolean
  raw: any               // Payload original do provider
}

export interface WebhookConnectionUpdate {
  status: 'connected' | 'disconnected' | 'connecting'
  phoneNumber?: string
  qrCode?: string
}

// ============================================
// INTERFACE PRINCIPAL
// ============================================

export interface IWhatsAppProvider {
  readonly providerType: WhatsAppProvider

  // === Conexão / Instância ===
  createInstance(config: {
    instanceId: string
    webhookUrl: string
    phoneNumberId?: string    // Meta Cloud: obrigatório
    accessToken?: string      // Meta Cloud: obrigatório
  }): Promise<any>

  getConnectionStatus(instanceId: string): Promise<ConnectionStatus>
  getQrCode(instanceId: string): Promise<{ qrCode?: string; qrCodeUrl?: string }>
  disconnect(instanceId: string): Promise<void>
  deleteInstance(instanceId: string): Promise<void>

  // === Mensagens ===
  sendText(options: SendTextOptions): Promise<{ messageId: string }>
  sendImage(options: SendImageOptions): Promise<{ messageId: string }>
  sendList(options: SendListOptions): Promise<{ messageId: string }>
  sendButtons(options: SendButtonsOptions): Promise<{ messageId: string }>
  sendLocation(options: SendLocationOptions): Promise<{ messageId: string }>

  // === Templates (só Meta Cloud, mas Evolution pode simular) ===
  sendTemplate(options: SendTemplateOptions): Promise<{ messageId: string }>

  // === Webhook Parser ===
  parseMessageWebhook(payload: any): WebhookMessage | null
  parseConnectionWebhook(payload: any): WebhookConnectionUpdate | null

  // === Helpers ===
  formatPhoneNumber(phone: string): string
  isWebhookValid(payload: any, signature?: string): boolean
}

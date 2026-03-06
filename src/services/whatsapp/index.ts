// ============================================
// WhatsApp Module - Barrel Export
// ============================================

export { getProvider, getProviderForTenant } from './factory'
export {
  sendTextToCustomer,
  sendListToCustomer,
  sendButtonsToCustomer,
  sendImageToCustomer,
  sendTemplateToCustomer,
} from './factory'

export { EvolutionProvider } from './evolution.provider'
export { MetaCloudProvider, verifyMetaWebhook } from './meta-cloud.provider'

export type {
  IWhatsAppProvider,
  WhatsAppProvider,
  SendTextOptions,
  SendImageOptions,
  SendListOptions,
  SendButtonsOptions,
  SendLocationOptions,
  SendTemplateOptions,
  ConnectionStatus,
  WebhookMessage,
  WebhookConnectionUpdate,
} from './provider.interface'

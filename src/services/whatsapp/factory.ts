import type { IWhatsAppProvider, WhatsAppProvider } from './provider.interface'
import { EvolutionProvider } from './evolution.provider'
import { MetaCloudProvider } from './meta-cloud.provider'

/**
 * ============================================
 * WhatsApp Provider Factory
 * ============================================
 * 
 * Retorna o provider correto baseado na configuração do tenant.
 * Cada tenant pode usar um provider diferente:
 *   - FREE/BASIC → Evolution API (padrão)
 *   - PRO/PREMIUM → Meta Cloud API (opcional)
 * 
 * O lojista escolhe nas configurações > WhatsApp
 */

// Cache de providers (singleton por tipo)
const providerCache = new Map<WhatsAppProvider, IWhatsAppProvider>()

export function getProvider(type: WhatsAppProvider): IWhatsAppProvider {
  if (!providerCache.has(type)) {
    switch (type) {
      case 'evolution':
        providerCache.set(type, new EvolutionProvider())
        break
      case 'meta_cloud':
        providerCache.set(type, new MetaCloudProvider())
        break
      default:
        throw new Error(`WhatsApp provider desconhecido: ${type}`)
    }
  }
  return providerCache.get(type)!
}

/**
 * Retorna o provider correto para um tenant específico
 * Busca no banco qual provider o tenant usa
 */
export async function getProviderForTenant(tenantId: string): Promise<{
  provider: IWhatsAppProvider
  instanceId: string
}> {
  const prisma = (await import('@/lib/prisma')).default

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      whatsappProvider: true,
      evolutionInstance: true,
      metaPhoneNumberId: true,
    },
  })

  if (!tenant) throw new Error('Tenant não encontrado')

  const providerType = (tenant.whatsappProvider || 'evolution') as WhatsAppProvider
  const provider = getProvider(providerType)

  // Determinar o instanceId baseado no provider
  const instanceId = providerType === 'meta_cloud'
    ? tenant.metaPhoneNumberId || ''
    : tenant.evolutionInstance || ''

  if (!instanceId) {
    throw new Error(`WhatsApp não configurado (provider: ${providerType})`)
  }

  return { provider, instanceId }
}

/**
 * Atalho: busca provider e envia mensagem de texto
 */
export async function sendTextToCustomer(
  tenantId: string,
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return provider.sendText({ instanceId, to, text })
}

/**
 * Atalho: busca provider e envia lista interativa
 */
export async function sendListToCustomer(
  tenantId: string,
  to: string,
  options: Omit<import('./provider.interface').SendListOptions, 'instanceId' | 'to'>
): Promise<{ messageId: string }> {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return provider.sendList({ instanceId, to, ...options })
}

/**
 * Atalho: busca provider e envia botões
 */
export async function sendButtonsToCustomer(
  tenantId: string,
  to: string,
  options: Omit<import('./provider.interface').SendButtonsOptions, 'instanceId' | 'to'>
): Promise<{ messageId: string }> {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return provider.sendButtons({ instanceId, to, ...options })
}

/**
 * Atalho: busca provider e envia imagem
 */
export async function sendImageToCustomer(
  tenantId: string,
  to: string,
  options: Omit<import('./provider.interface').SendImageOptions, 'instanceId' | 'to'>
): Promise<{ messageId: string }> {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return provider.sendImage({ instanceId, to, ...options })
}

/**
 * Atalho: busca provider e envia template (só Meta Cloud)
 */
export async function sendTemplateToCustomer(
  tenantId: string,
  to: string,
  options: Omit<import('./provider.interface').SendTemplateOptions, 'instanceId' | 'to'>
): Promise<{ messageId: string }> {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return provider.sendTemplate({ instanceId, to, ...options })
}

// Re-export types
export type { IWhatsAppProvider, WhatsAppProvider } from './provider.interface'

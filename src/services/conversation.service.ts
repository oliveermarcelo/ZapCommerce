import prisma from '@/lib/prisma'
import redis from '@/lib/redis'
import { getProviderForTenant } from '@/services/whatsapp/factory'
import { formatCurrency } from '@/lib/utils'

/**
 * Motor de Conversação WhatsApp (Multi-Provider)
 * Funciona com Evolution API E Meta Cloud API de forma transparente.
 */

const SESSION_PREFIX = 'chat_session:'
const SESSION_TTL = 1800

interface CartItem {
  productId: string; productName: string; quantity: number; unitPrice: number
  options: Array<{ optionId: string; optionName: string; groupName: string; price: number }>
}

interface SessionData {
  state: string; tenantId: string; customerId: string; customerNumber: string
  cart: CartItem[]; currentProductId?: string; currentOptions: Record<string, string[]>
  pendingOptionGroups: string[]; deliveryType?: 'DELIVERY' | 'PICKUP'
  deliveryAddress?: string; paymentMethod?: string; orderId?: string
}

// --- Session Management (Redis) ---
async function getSession(tenantId: string, num: string): Promise<SessionData | null> {
  const d = await redis.get(`${SESSION_PREFIX}${tenantId}:${num}`)
  return d ? JSON.parse(d) : null
}
async function saveSession(s: SessionData) {
  await redis.set(`${SESSION_PREFIX}${s.tenantId}:${s.customerNumber}`, JSON.stringify(s), 'EX', SESSION_TTL)
}
async function clearSession(tenantId: string, num: string) {
  await redis.del(`${SESSION_PREFIX}${tenantId}:${num}`)
}

// --- Provider Helper ---
async function getWhatsApp(tenantId: string) {
  const { provider, instanceId } = await getProviderForTenant(tenantId)
  return {
    sendText: (to: string, text: string) => provider.sendText({ instanceId, to, text }),
    sendList: (to: string, opts: any) => provider.sendList({ instanceId, to, ...opts }),
    sendButtons: (to: string, opts: any) => provider.sendButtons({ instanceId, to, ...opts }),
    sendImage: (to: string, opts: any) => provider.sendImage({ instanceId, to, ...opts }),
  }
}
type WA = Awaited<ReturnType<typeof getWhatsApp>>

// --- Main Handler ---
export async function handleIncomingMessage(
  tenantId: string, senderNumber: string, messageText: string,
  messageType: string = 'text', listResponseId?: string, buttonResponseId?: string
) {
  const text = messageText?.trim().toLowerCase() || ''
  const responseId = listResponseId || buttonResponseId || ''
  const customer = await getOrCreateCustomer(tenantId, senderNumber)

  let wa: WA
  try { wa = await getWhatsApp(tenantId) } catch { return }

  let session = await getSession(tenantId, senderNumber)

  if (['cancelar', 'sair', 'parar', '0'].includes(text)) {
    await clearSession(tenantId, senderNumber)
    await wa.sendText(senderNumber, 'Pedido cancelado. É só mandar mensagem se precisar! 👋')
    return
  }

  if (!session) {
    session = { state: 'GREETING', tenantId, customerId: customer.id, customerNumber: senderNumber, cart: [], currentOptions: {}, pendingOptionGroups: [] }
  }

  switch (session.state) {
    case 'GREETING': await handleGreeting(session, wa); break
    case 'CHOOSING_CATEGORY': await handleCategoryChoice(session, wa, text, responseId); break
    case 'CHOOSING_PRODUCT': await handleProductChoice(session, wa, text, responseId); break
    case 'CHOOSING_OPTIONS': await handleOptionChoice(session, wa, text, responseId); break
    case 'CHOOSING_QUANTITY': await handleQuantityChoice(session, wa, text); break
    case 'CART_REVIEW': await handleCartReview(session, wa, text, responseId); break
    case 'ASKING_DELIVERY': await handleDeliveryChoice(session, wa, text, responseId); break
    case 'ASKING_ADDRESS': await handleAddressInput(session, wa, messageText); break
    case 'CHOOSING_PAYMENT': await handlePaymentChoice(session, wa, text, responseId); break
    case 'AWAITING_PAYMENT': await handleAwaitingPayment(session, wa, text); break
    default: session.state = 'GREETING'; await handleGreeting(session, wa)
  }
}

// --- State Handlers ---
async function handleGreeting(session: SessionData, wa: WA) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { settings: true, categories: { where: { isActive: true }, orderBy: { position: 'asc' }, include: { products: { where: { isActive: true }, take: 1 } } } },
  })
  if (!tenant) return

  if (tenant.settings?.businessHours) {
    const { isWithinBusinessHours } = await import('@/lib/utils')
    if (!isWithinBusinessHours(tenant.settings.businessHours as any)) {
      await wa.sendText(session.customerNumber, tenant.settings.closedMessage || 'Estamos fechados no momento.')
      return
    }
  }

  const cats = tenant.categories.filter(c => c.products.length > 0)
  if (cats.length === 0) { await wa.sendText(session.customerNumber, 'Sem produtos disponíveis no momento.'); return }

  await wa.sendList(session.customerNumber, {
    title: tenant.name, description: tenant.settings?.welcomeMessage || `Olá! Bem-vindo ao ${tenant.name}! 🎉`,
    buttonText: '📋 Ver Categorias', footerText: 'Escolha uma categoria',
    sections: [{ title: 'Categorias', rows: cats.map(c => ({ id: `cat_${c.id}`, title: c.name, description: c.description?.slice(0, 72) || '' })) }],
  })
  session.state = 'CHOOSING_CATEGORY'; session.cart = []; await saveSession(session)
}

async function handleCategoryChoice(s: SessionData, wa: WA, text: string, rid: string) {
  const catId = rid.startsWith('cat_') ? rid.replace('cat_', '') : ''
  const prods = await prisma.product.findMany({ where: { tenantId: s.tenantId, categoryId: catId || undefined, isActive: true }, orderBy: { position: 'asc' }, take: 30 })
  if (!prods.length) { await wa.sendText(s.customerNumber, 'Nenhum produto. Escolha outra categoria:'); return }

  await wa.sendList(s.customerNumber, {
    title: 'Produtos', description: 'Escolha:', buttonText: '🛒 Produtos',
    sections: [{ title: 'Disponíveis', rows: prods.map(p => ({ id: `prod_${p.id}`, title: `${p.name} - ${formatCurrency(p.promotionalPrice || p.price)}`.slice(0, 24), description: p.description?.slice(0, 72) || '' })) }],
  })
  s.state = 'CHOOSING_PRODUCT'; await saveSession(s)
}

async function handleProductChoice(s: SessionData, wa: WA, text: string, rid: string) {
  const pid = rid.startsWith('prod_') ? rid.replace('prod_', '') : ''
  if (!pid) { await wa.sendText(s.customerNumber, 'Escolha um produto da lista.'); return }

  const prod = await prisma.product.findUnique({ where: { id: pid }, include: { optionGroups: { include: { optionGroup: { include: { options: { where: { isActive: true }, orderBy: { position: 'asc' } } } } }, orderBy: { position: 'asc' } } } })
  if (!prod) return

  s.currentProductId = pid; s.currentOptions = {}
  const groups = prod.optionGroups.map(g => g.optionGroup)
  if (groups.length > 0) {
    s.pendingOptionGroups = groups.map(g => g.id); s.state = 'CHOOSING_OPTIONS'; await saveSession(s); await askNextOption(s, wa)
  } else {
    s.state = 'CHOOSING_QUANTITY'; await saveSession(s)
    await wa.sendText(s.customerNumber, `*${prod.name}* - ${formatCurrency(prod.promotionalPrice || prod.price)}\n\nQuantos deseja?`)
  }
}

async function askNextOption(s: SessionData, wa: WA) {
  if (!s.pendingOptionGroups.length) { s.state = 'CHOOSING_QUANTITY'; await saveSession(s); await wa.sendText(s.customerNumber, 'Quantos deseja?'); return }
  const g = await prisma.optionGroup.findUnique({ where: { id: s.pendingOptionGroups[0] }, include: { options: { where: { isActive: true }, orderBy: { position: 'asc' } } } })
  if (!g || !g.options.length) { s.pendingOptionGroups.shift(); await saveSession(s); await askNextOption(s, wa); return }

  await wa.sendList(s.customerNumber, {
    title: g.name, description: `${g.name}${g.isRequired ? ' (obrigatório)' : ' (opcional)'}`, buttonText: `Escolher ${g.name}`,
    sections: [{ title: g.name, rows: g.options.map(o => ({ id: `opt_${o.id}`, title: (o.price > 0 ? `${o.name} (+${formatCurrency(o.price)})` : o.name).slice(0, 24) })) }],
  })
}

async function handleOptionChoice(s: SessionData, wa: WA, text: string, rid: string) {
  if (!s.pendingOptionGroups.length) { s.state = 'CHOOSING_QUANTITY'; await saveSession(s); return }
  const gid = s.pendingOptionGroups[0]
  if (rid.startsWith('opt_')) { if (!s.currentOptions[gid]) s.currentOptions[gid] = []; s.currentOptions[gid].push(rid.replace('opt_', '')) }
  s.pendingOptionGroups.shift(); await saveSession(s); await askNextOption(s, wa)
}

async function handleQuantityChoice(s: SessionData, wa: WA, text: string) {
  const qty = parseInt(text)
  if (isNaN(qty) || qty < 1 || qty > 99) { await wa.sendText(s.customerNumber, 'Quantidade inválida (1-99):'); return }
  const prod = await prisma.product.findUnique({ where: { id: s.currentProductId! } })
  if (!prod) return

  const opts: CartItem['options'] = []
  for (const ids of Object.values(s.currentOptions)) {
    for (const oid of ids) {
      const o = await prisma.option.findUnique({ where: { id: oid }, include: { optionGroup: true } })
      if (o) opts.push({ optionId: o.id, optionName: o.name, groupName: o.optionGroup.name, price: o.price })
    }
  }
  const unitPrice = (prod.promotionalPrice || prod.price) + opts.reduce((a, o) => a + o.price, 0)
  s.cart.push({ productId: prod.id, productName: prod.name, quantity: qty, unitPrice, options: opts })
  const total = s.cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0)

  await wa.sendButtons(s.customerNumber, { title: '🛒 Carrinho', body: `${buildCartSummary(s.cart)}\n\n*Total: ${formatCurrency(total)}*`, buttons: [{ id: 'add_more', title: '➕ Mais itens' }, { id: 'finish_order', title: '✅ Finalizar' }, { id: 'clear_cart', title: '🗑️ Limpar' }] })
  s.state = 'CART_REVIEW'; s.currentProductId = undefined; s.currentOptions = {}; s.pendingOptionGroups = []; await saveSession(s)
}

async function handleCartReview(s: SessionData, wa: WA, text: string, rid: string) {
  const a = rid || text
  if (a === 'add_more' || text.includes('mais')) { s.state = 'GREETING'; await saveSession(s); await handleGreeting(s, wa); return }
  if (a === 'clear_cart' || text.includes('limpar')) { s.cart = []; s.state = 'GREETING'; await saveSession(s); await wa.sendText(s.customerNumber, 'Limpo!'); await handleGreeting(s, wa); return }
  if (a === 'finish_order' || text.includes('finalizar')) {
    const set = await prisma.tenantSettings.findUnique({ where: { tenantId: s.tenantId } })
    if (set?.deliveryEnabled && set?.pickupEnabled) {
      s.state = 'ASKING_DELIVERY'; await saveSession(s)
      await wa.sendButtons(s.customerNumber, { title: 'Entrega', body: 'Como deseja receber?', buttons: [{ id: 'delivery', title: '🛵 Entrega' }, { id: 'pickup', title: '🏪 Retirar' }] })
    } else if (set?.deliveryEnabled) { s.deliveryType = 'DELIVERY'; s.state = 'ASKING_ADDRESS'; await saveSession(s); await wa.sendText(s.customerNumber, '📍 Endereço de entrega:') }
    else { s.deliveryType = 'PICKUP'; s.state = 'CHOOSING_PAYMENT'; await saveSession(s); await askPayment(s, wa) }
  }
}

async function handleDeliveryChoice(s: SessionData, wa: WA, t: string, rid: string) {
  if (rid === 'delivery' || t.includes('entrega')) { s.deliveryType = 'DELIVERY'; s.state = 'ASKING_ADDRESS'; await saveSession(s); await wa.sendText(s.customerNumber, '📍 Endereço:') }
  else { s.deliveryType = 'PICKUP'; s.state = 'CHOOSING_PAYMENT'; await saveSession(s); await askPayment(s, wa) }
}

async function handleAddressInput(s: SessionData, wa: WA, text: string) {
  s.deliveryAddress = text; await prisma.customer.update({ where: { id: s.customerId }, data: { address: text } })
  s.state = 'CHOOSING_PAYMENT'; await saveSession(s); await askPayment(s, wa)
}

async function askPayment(s: SessionData, wa: WA) {
  const total = s.cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
  const set = await prisma.tenantSettings.findUnique({ where: { tenantId: s.tenantId } })
  const fee = s.deliveryType === 'DELIVERY' ? (set?.deliveryFee || 0) : 0
  let txt = `*Resumo:*\n${buildCartSummary(s.cart)}`; if (fee > 0) txt += `\nEntrega: ${formatCurrency(fee)}`; txt += `\n\n*Total: ${formatCurrency(total + fee)}*`
  await wa.sendButtons(s.customerNumber, { title: 'Pagamento', body: `${txt}\n\nComo pagar?`, buttons: [{ id: 'pay_pix', title: '💰 PIX' }, { id: 'pay_cash', title: '💵 Dinheiro' }, { id: 'pay_card', title: '💳 Cartão' }] })
}

async function handlePaymentChoice(s: SessionData, wa: WA, text: string, rid: string) {
  const c = rid || text; let pm: 'PIX' | 'ON_DELIVERY_CASH' | 'ON_DELIVERY_CARD'
  if (c === 'pay_pix' || text.includes('pix')) pm = 'PIX'; else if (c === 'pay_cash' || text.includes('dinheiro')) pm = 'ON_DELIVERY_CASH'
  else if (c === 'pay_card' || text.includes('cart')) pm = 'ON_DELIVERY_CARD'; else { await wa.sendText(s.customerNumber, 'Escolha a forma de pagamento:'); return }
  s.paymentMethod = pm
  const { createOrderFromSession } = await import('./order.service'); const order = await createOrderFromSession(s); s.orderId = order.id
  if (pm === 'PIX') {
    s.state = 'AWAITING_PAYMENT'; await saveSession(s)
    const { generatePixForOrder } = await import('./payment.service'); const pix = await generatePixForOrder(order.id)
    if (pix?.qrCodeBase64) await wa.sendImage(s.customerNumber, { imageBase64: pix.qrCodeBase64, caption: `💰 PIX\n\nValor: ${formatCurrency(order.total)}\n\nCopia e cola:\n${pix.qrCodeText}\n\n⏰ 15 minutos` })
  } else {
    await clearSession(s.tenantId, s.customerNumber)
    const t = await prisma.tenant.findUnique({ where: { id: s.tenantId }, include: { settings: true } })
    await wa.sendText(s.customerNumber, `${t?.settings?.orderConfirmMessage || '✅ Confirmado!'}\n\nPedido ${order.displayNumber}\nPagamento: ${pm === 'ON_DELIVERY_CASH' ? 'Dinheiro' : 'Cartão'}`)
  }
}

async function handleAwaitingPayment(s: SessionData, wa: WA, text: string) {
  const order = await prisma.order.findUnique({ where: { id: s.orderId! } })
  if (order?.paymentStatus === 'CONFIRMED') { await clearSession(s.tenantId, s.customerNumber); await wa.sendText(s.customerNumber, '✅ Pagamento confirmado!') }
  else await wa.sendText(s.customerNumber, '⏳ Pagamento não identificado ainda. Aguarde.')
}

// --- Helpers ---
function buildCartSummary(cart: CartItem[]): string {
  return cart.map(i => { let l = `${i.quantity}x ${i.productName} - ${formatCurrency(i.unitPrice * i.quantity)}`; if (i.options.length) l += '\n   ' + i.options.map(o => o.price > 0 ? `+ ${o.optionName} (${formatCurrency(o.price)})` : `+ ${o.optionName}`).join('\n   '); return l }).join('\n')
}
async function getOrCreateCustomer(tenantId: string, num: string) {
  let c = await prisma.customer.findUnique({ where: { tenantId_whatsappNumber: { tenantId, whatsappNumber: num } } })
  if (!c) c = await prisma.customer.create({ data: { tenantId, whatsappNumber: num } })
  return c
}

import { PrismaClient, BusinessType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ============================================
  // 1. TEMPLATES DE NEGÓCIO
  // ============================================
  const templates = [
    {
      businessType: BusinessType.RESTAURANT,
      name: 'Lanchonete / Restaurante',
      description: 'Para hamburguerias, pizzarias, restaurantes e similares',
      icon: '🍔',
      defaultCategories: [
        { name: 'Lanches', slug: 'lanches' },
        { name: 'Pizzas', slug: 'pizzas' },
        { name: 'Porções', slug: 'porcoes' },
        { name: 'Bebidas', slug: 'bebidas' },
        { name: 'Sobremesas', slug: 'sobremesas' },
        { name: 'Combos', slug: 'combos' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Preparando', slug: 'preparing', color: '#F97316', icon: 'flame', mappedStatus: 'PREPARING' },
        { name: 'Pronto', slug: 'ready', color: '#8B5CF6', icon: 'package-check', mappedStatus: 'READY' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        estimatedDeliveryMin: 40,
        welcomeMessage: 'Olá! 🍔 Bem-vindo! Confira nosso cardápio e faça seu pedido:',
      },
    },
    {
      businessType: BusinessType.GAS_WATER,
      name: 'Depósito de Gás / Água',
      description: 'Para distribuidoras de gás, água mineral e galões',
      icon: '🔥',
      defaultCategories: [
        { name: 'Gás de Cozinha', slug: 'gas' },
        { name: 'Água Mineral', slug: 'agua' },
        { name: 'Galões', slug: 'galoes' },
        { name: 'Outros', slug: 'outros' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Novo Pedido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: false,
        estimatedDeliveryMin: 30,
        recurrenceEnabled: true,
        recurrenceDays: 30,
        welcomeMessage: 'Olá! 🔥 Precisa de gás ou água? Veja nossos produtos:',
      },
    },
    {
      businessType: BusinessType.PHARMACY,
      name: 'Farmácia',
      description: 'Para farmácias e drogarias com delivery',
      icon: '💊',
      defaultCategories: [
        { name: 'Medicamentos', slug: 'medicamentos' },
        { name: 'Higiene Pessoal', slug: 'higiene' },
        { name: 'Beleza', slug: 'beleza' },
        { name: 'Vitaminas', slug: 'vitaminas' },
        { name: 'Primeiros Socorros', slug: 'primeiros-socorros' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Separando', slug: 'preparing', color: '#F97316', icon: 'package', mappedStatus: 'PREPARING' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        estimatedDeliveryMin: 45,
        welcomeMessage: 'Olá! 💊 Bem-vindo à nossa farmácia. Como posso ajudar?',
      },
    },
    {
      businessType: BusinessType.PET_SHOP,
      name: 'Pet Shop',
      description: 'Para pet shops e agropecuárias',
      icon: '🐾',
      defaultCategories: [
        { name: 'Rações', slug: 'racoes' },
        { name: 'Petiscos', slug: 'petiscos' },
        { name: 'Higiene', slug: 'higiene' },
        { name: 'Acessórios', slug: 'acessorios' },
        { name: 'Medicamentos', slug: 'medicamentos' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Separando', slug: 'preparing', color: '#F97316', icon: 'package', mappedStatus: 'PREPARING' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        recurrenceEnabled: true,
        recurrenceDays: 30,
        estimatedDeliveryMin: 60,
        welcomeMessage: 'Olá! 🐾 Seu pet merece o melhor! Veja nossos produtos:',
      },
    },
    {
      businessType: BusinessType.CONVENIENCE,
      name: 'Conveniência / Adega',
      description: 'Para lojas de conveniência, adegas e bebidas',
      icon: '🍺',
      defaultCategories: [
        { name: 'Cervejas', slug: 'cervejas' },
        { name: 'Destilados', slug: 'destilados' },
        { name: 'Vinhos', slug: 'vinhos' },
        { name: 'Refrigerantes', slug: 'refrigerantes' },
        { name: 'Snacks', slug: 'snacks' },
        { name: 'Cigarros', slug: 'cigarros' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        estimatedDeliveryMin: 30,
        welcomeMessage: 'Olá! 🍺 O que vai ser hoje? Confira nossos produtos:',
      },
    },
    {
      businessType: BusinessType.CLOTHING,
      name: 'Loja de Roupas',
      description: 'Para lojas de roupas, calçados e acessórios',
      icon: '👕',
      defaultCategories: [
        { name: 'Camisetas', slug: 'camisetas' },
        { name: 'Calças', slug: 'calcas' },
        { name: 'Vestidos', slug: 'vestidos' },
        { name: 'Calçados', slug: 'calcados' },
        { name: 'Acessórios', slug: 'acessorios' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Confirmado', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Separando', slug: 'preparing', color: '#F97316', icon: 'package', mappedStatus: 'PREPARING' },
        { name: 'Enviado', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        welcomeMessage: 'Olá! 👕 Bem-vindo à nossa loja! Confira nossas peças:',
      },
    },
    {
      businessType: BusinessType.BAKERY,
      name: 'Padaria / Confeitaria',
      description: 'Para padarias, confeitarias e docerias',
      icon: '🍰',
      defaultCategories: [
        { name: 'Pães', slug: 'paes' },
        { name: 'Bolos', slug: 'bolos' },
        { name: 'Doces', slug: 'doces' },
        { name: 'Salgados', slug: 'salgados' },
        { name: 'Bebidas', slug: 'bebidas' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Preparando', slug: 'preparing', color: '#F97316', icon: 'flame', mappedStatus: 'PREPARING' },
        { name: 'Pronto', slug: 'ready', color: '#8B5CF6', icon: 'package-check', mappedStatus: 'READY' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        estimatedDeliveryMin: 45,
        welcomeMessage: 'Olá! 🍰 Que delícia você quer pedir hoje?',
      },
    },
    {
      businessType: BusinessType.MARKET,
      name: 'Mercado / Mercearia',
      description: 'Para mercados, mercearias e hortifruti',
      icon: '🛒',
      defaultCategories: [
        { name: 'Frutas e Verduras', slug: 'hortifruti' },
        { name: 'Carnes', slug: 'carnes' },
        { name: 'Laticínios', slug: 'laticinios' },
        { name: 'Bebidas', slug: 'bebidas' },
        { name: 'Limpeza', slug: 'limpeza' },
        { name: 'Mercearia', slug: 'mercearia' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Separando', slug: 'preparing', color: '#F97316', icon: 'shopping-cart', mappedStatus: 'PREPARING' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        minimumOrderValue: 30,
        estimatedDeliveryMin: 60,
        welcomeMessage: 'Olá! 🛒 Faça suas compras sem sair de casa:',
      },
    },
    {
      businessType: BusinessType.CONSTRUCTION,
      name: 'Materiais de Construção',
      description: 'Para lojas de materiais de construção e ferramentas',
      icon: '🔨',
      defaultCategories: [
        { name: 'Cimento e Argamassa', slug: 'cimento' },
        { name: 'Tintas', slug: 'tintas' },
        { name: 'Ferramentas', slug: 'ferramentas' },
        { name: 'Elétrica', slug: 'eletrica' },
        { name: 'Hidráulica', slug: 'hidraulica' },
        { name: 'Acabamento', slug: 'acabamento' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Confirmado', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Separando', slug: 'preparing', color: '#F97316', icon: 'package', mappedStatus: 'PREPARING' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        minimumOrderValue: 50,
        welcomeMessage: 'Olá! 🔨 Precisa de material? Veja nossos produtos:',
      },
    },
    {
      businessType: BusinessType.SERVICES,
      name: 'Serviços',
      description: 'Para barbearias, lavanderias, estéticas e similares',
      icon: '✂️',
      defaultCategories: [
        { name: 'Serviços', slug: 'servicos' },
        { name: 'Pacotes', slug: 'pacotes' },
        { name: 'Produtos', slug: 'produtos' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Agendado', slug: 'received', color: '#3B82F6', icon: 'calendar', mappedStatus: 'RECEIVED' },
        { name: 'Em Atendimento', slug: 'preparing', color: '#F97316', icon: 'user', mappedStatus: 'PREPARING' },
        { name: 'Concluído', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: false,
        pickupEnabled: true,
        welcomeMessage: 'Olá! ✂️ Agende seu horário ou veja nossos serviços:',
      },
    },
    {
      businessType: BusinessType.GENERIC,
      name: 'Genérico',
      description: 'Modelo básico para qualquer tipo de negócio',
      icon: '🏪',
      defaultCategories: [
        { name: 'Produtos', slug: 'produtos' },
      ],
      defaultKanbanColumns: [
        { name: 'Aguardando Pagamento', slug: 'awaiting-payment', color: '#F59E0B', icon: 'clock', mappedStatus: 'AWAITING_PAYMENT' },
        { name: 'Recebido', slug: 'received', color: '#3B82F6', icon: 'inbox', mappedStatus: 'RECEIVED' },
        { name: 'Preparando', slug: 'preparing', color: '#F97316', icon: 'package', mappedStatus: 'PREPARING' },
        { name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4', icon: 'truck', mappedStatus: 'OUT_FOR_DELIVERY' },
        { name: 'Entregue', slug: 'delivered', color: '#10B981', icon: 'check', mappedStatus: 'DELIVERED' },
      ],
      defaultSettings: {
        deliveryEnabled: true,
        pickupEnabled: true,
        welcomeMessage: 'Olá! 🏪 Bem-vindo! Como posso ajudar?',
      },
    },
  ]

  for (const tmpl of templates) {
    await prisma.businessTemplate.upsert({
      where: { businessType: tmpl.businessType },
      update: tmpl,
      create: tmpl,
    })
  }
  console.log(`✅ ${templates.length} templates de negócio criados`)

  // ============================================
  // 2. SUPER ADMIN
  // ============================================
  const adminEmail = 'admin@zapcommerce.com.br'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin ZapCommerce',
      passwordHash: await hash('admin123', 12),
      isSuperAdmin: true,
    },
  })
  console.log('✅ Super Admin criado (admin@zapcommerce.com.br / admin123)')

  console.log('🎉 Seed concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

# 🟢 ZapCommerce

**SaaS de Pedidos via WhatsApp para Qualquer Tipo de Estabelecimento**

Plataforma completa que transforma o WhatsApp em um canal de vendas automatizado. O cliente faz pedidos conversando no WhatsApp, o lojista gerencia tudo em um painel Kanban (PWA), e o dono do SaaS lucra com taxa por transação.

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENTE                              │
│                   (WhatsApp)                              │
└─────────────────────┬────────────────────────────────────┘
                      │ mensagens
                      ▼
┌──────────────────────────────────────────────────────────┐
│              EVOLUTION API v2                              │
│         (WhatsApp Business API)                           │
└─────────────────────┬────────────────────────────────────┘
                      │ webhooks
                      ▼
┌──────────────────────────────────────────────────────────┐
│                  NEXT.JS APP                              │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  API Routes  │  │  Motor de    │  │  Painel PWA    │  │
│  │  (REST)      │  │  Conversação │  │  (Kanban)      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │            │
│  ┌──────▼────────────────▼───────────────────▼────────┐  │
│  │                   SERVICES                          │  │
│  │  • Order Service    • Payment Service               │  │
│  │  • Evolution Svc    • Campaign Service              │  │
│  └──────┬────────────────┬───────────────────┬────────┘  │
│         │                │                   │            │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐  │
│  │  PostgreSQL  │  │    Redis    │  │    BullMQ       │  │
│  │  (Prisma)    │  │  (Sessões)  │  │  (Filas/Jobs)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              GATEWAY DE PAGAMENTO                         │
│         (Asaas / EfiBank / OpenPix)                       │
│         PIX com Split automático                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológica

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| Framework   | Next.js 14 (App Router)             |
| UI          | Tailwind CSS + ShadCN/UI            |
| ORM         | Prisma                              |
| Database    | PostgreSQL 16                       |
| Cache/Queue | Redis 7 + BullMQ                    |
| WhatsApp    | Evolution API v2                    |
| Pagamento   | Asaas (PIX com split)               |
| Storage     | MinIO (S3-compatível)               |
| Auth        | JWT (jose) + cookies httpOnly        |
| PWA         | next-pwa + Service Workers          |
| Drag & Drop | @dnd-kit                            |
| Deploy      | Docker Compose / VPS                |

---

## 📁 Estrutura do Projeto

```
zapcommerce/
├── docker-compose.yml          # Infra (PostgreSQL, Redis, Evolution, MinIO)
├── prisma/
│   ├── schema.prisma           # Modelo de dados completo
│   └── seed.ts                 # Templates de negócio + admin
├── src/
│   ├── app/
│   │   ├── (auth)/             # Páginas de login/registro
│   │   ├── (dashboard)/        # Painel do lojista (Kanban, catálogo, etc.)
│   │   ├── admin/              # Painel do dono do SaaS
│   │   ├── api/
│   │   │   ├── auth/           # Login, registro, refresh token
│   │   │   ├── webhooks/       # Evolution API + Gateway pagamento
│   │   │   ├── orders/         # CRUD pedidos
│   │   │   ├── catalog/        # Categorias e produtos
│   │   │   ├── customers/      # Clientes WhatsApp
│   │   │   └── campaigns/      # Marketing/promoções
│   │   ├── globals.css         # Tema ShadCN + estilos globais
│   │   └── layout.tsx          # Layout raiz (PWA meta tags)
│   ├── components/
│   │   ├── ui/                 # Componentes ShadCN
│   │   ├── kanban/             # Board Kanban drag-and-drop
│   │   ├── catalog/            # Editor de catálogo
│   │   └── layout/             # Sidebar, header, etc.
│   ├── services/
│   │   ├── evolution.service.ts    # Integração WhatsApp
│   │   ├── conversation.service.ts # Motor de conversação (state machine)
│   │   ├── order.service.ts        # Lógica de pedidos + auto-move Kanban
│   │   └── payment.service.ts      # PIX, split, faturamento mensal
│   ├── lib/
│   │   ├── prisma.ts           # Client Prisma (singleton)
│   │   ├── redis.ts            # Client Redis (singleton)
│   │   ├── auth.ts             # JWT sign/verify + helpers
│   │   ├── queue.ts            # BullMQ filas e workers
│   │   ├── api-response.ts     # Helpers de resposta API
│   │   └── utils.ts            # Formatadores, validadores BR
│   ├── hooks/                  # React hooks customizados
│   ├── types/                  # TypeScript types
│   └── middleware.ts           # Proteção de rotas (JWT)
└── public/
    └── manifest.json           # PWA manifest
```

---

## 🚀 Setup Rápido

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- Git

### 1. Clonar e instalar

```bash
git clone <repo-url> zapcommerce
cd zapcommerce
cp .env.example .env
npm install
```

### 2. Subir infraestrutura

```bash
docker compose up -d
```

Isso inicia: PostgreSQL, Redis, Evolution API e MinIO.

### 3. Configurar banco de dados

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Iniciar desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

**Login admin:** admin@zapcommerce.com.br / admin123

### 5. Conectar WhatsApp (Evolution API)

Acesse a Evolution API em http://localhost:8080 e crie uma instância.
No painel do ZapCommerce, vá em Configurações > WhatsApp e escaneie o QR Code.

---

## 📊 Modelo de Dados

### Entidades Principais

- **Tenant** → Estabelecimento (multi-tenant)
- **TenantSettings** → Configurações por loja (horários, entrega, mensagens)
- **BusinessTemplate** → Templates por segmento (restaurante, gás, farmácia, etc.)
- **Category / Product** → Catálogo genérico
- **OptionGroup / Option** → Variações dinâmicas (tamanho, adicionais, sabor)
- **Customer** → Clientes via WhatsApp
- **ChatSession** → Estado da conversa no WhatsApp
- **Order / OrderItem** → Pedidos com itens e opções
- **KanbanColumn** → Colunas customizáveis do Kanban
- **Campaign** → Campanhas de marketing
- **MonthlyInvoice** → Faturamento mensal (taxas)

### Fluxo do Pedido

```
AWAITING_PAYMENT → RECEIVED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                                                                    → CANCELLED
                 → EXPIRED (PIX timeout)
```

---

## 💰 Modelo Financeiro

### Pagamento PIX (automático)
1. Cliente paga via QR Code PIX
2. Gateway confirma via webhook
3. Sistema retém % do SaaS (split automático)
4. Lojista recebe o valor líquido

### Pagamento na Entrega
1. Pedido entra direto como "Recebido"
2. Taxa do SaaS é registrada como pendente
3. No fim do mês, sistema gera cobrança PIX para o lojista

---

## 🔧 Segmentos Suportados

| Segmento | Exemplo | Diferenciais |
|----------|---------|-------------|
| 🍔 Restaurante | Lanchonete, pizzaria | Variações, adicionais, tempo de preparo |
| 🔥 Gás/Água | Depósito de gás | Catálogo simples, recorrência automática |
| 💊 Farmácia | Drogaria | Campo receita, busca por nome |
| 🐾 Pet Shop | Loja pet | Variações peso/sabor, recorrência |
| 🍺 Conveniência | Adega, conveniência | Catálogo com categorias |
| 👕 Roupas | Loja de roupas | Variações tamanho/cor |
| 🍰 Padaria | Confeitaria | Tempo de preparo, variedades |
| 🛒 Mercado | Mercearia | Catálogo grande, pedido mínimo |
| 🔨 Construção | Material construção | Busca, quantidade flexível |
| ✂️ Serviços | Barbearia | Agendamento, sem entrega |
| 🏪 Genérico | Qualquer negócio | Totalmente customizável |

---

## 📋 Roadmap

### Fase 1 - MVP ✅
- [x] Modelo de dados multi-tenant
- [x] Motor de conversação WhatsApp
- [x] Sistema de pedidos
- [x] Integração pagamento PIX com split
- [x] Webhooks Evolution API + Gateway
- [x] Templates de negócio
- [x] Filas BullMQ (expiração PIX, campanhas)
- [ ] Painel Kanban (frontend)
- [ ] Tela de catálogo (CRUD)
- [ ] Login/Registro (frontend)
- [ ] Conectar WhatsApp (QR Code no painel)

### Fase 2 - Engajamento
- [ ] Campanhas de marketing com agendamento
- [ ] Recorrência automática (gás, água)
- [ ] Relatórios e dashboard
- [ ] Push notifications (PWA)
- [ ] WebSocket para Kanban em tempo real

### Fase 3 - Escala
- [ ] Painel Admin do SaaS
- [ ] Multi-instância Evolution API
- [ ] Planos e billing
- [ ] Onboarding automatizado
- [ ] API pública para integrações

---

## 📄 Licença

Proprietário - ZapCommerce © 2024

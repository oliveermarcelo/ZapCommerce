#!/bin/bash
# ============================================
# Wapify - Setup Inicial no VPS
# Execute uma vez após clonar o repositório
# ============================================

set -e

echo "🟢 Wapify - Setup Inicial"
echo "=========================="

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado."
    exit 1
fi
echo "✅ Docker: $(docker --version)"

# 2. Verificar se a rede do Traefik existe
if ! docker network ls | grep -q "wapify"; then
    echo "📡 Criando rede 'wapify' para o Traefik..."
    docker network create wapify
    echo "✅ Rede 'wapify' criada"
else
    echo "✅ Rede 'wapify' já existe"
fi

# 3. Criar .env se não existir
if [ ! -f .env ]; then
    echo ""
    echo "📝 Criando .env com senhas geradas automaticamente..."
    cp .env.production .env

    DB_PASS=$(openssl rand -hex 16)
    REDIS_PASS=$(openssl rand -hex 16)
    JWT_SEC=$(openssl rand -hex 64)
    JWT_REF=$(openssl rand -hex 64)
    EVO_KEY=$(openssl rand -hex 24)
    MINIO_PASS=$(openssl rand -hex 16)

    sed -i "s/DB_PASSWORD=TROCAR_SENHA_FORTE_AQUI/DB_PASSWORD=$DB_PASS/" .env
    sed -i "s/REDIS_PASSWORD=TROCAR_SENHA_FORTE_AQUI/REDIS_PASSWORD=$REDIS_PASS/" .env
    sed -i "s/JWT_SECRET=TROCAR_GERAR_COM_OPENSSL/JWT_SECRET=$JWT_SEC/" .env
    sed -i "s/JWT_REFRESH_SECRET=TROCAR_GERAR_COM_OPENSSL/JWT_REFRESH_SECRET=$JWT_REF/" .env
    sed -i "s/EVOLUTION_API_KEY=TROCAR_CHAVE_FORTE/EVOLUTION_API_KEY=$EVO_KEY/" .env
    sed -i "s/MINIO_PASSWORD=TROCAR_SENHA_FORTE_AQUI/MINIO_PASSWORD=$MINIO_PASS/" .env

    echo "✅ Senhas geradas automaticamente"
    echo ""
    echo "⚠️  Edite o .env e configure o CERT_RESOLVER:"
    echo "   nano .env"
    echo ""
    echo "   Se não sabe o nome, rode:"
    echo "   docker exec \$(docker ps --filter name=traefik -q) cat /etc/traefik/traefik.yml 2>/dev/null || echo 'Verifique manualmente'"
    echo ""
    read -p "Pressione ENTER quando terminar de editar..."
fi

# 4. Subir containers
echo ""
echo "🐳 Subindo containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 5. Aguardar PostgreSQL
echo "⏳ Aguardando PostgreSQL..."
sleep 15

# 6. Criar banco do Evolution API
echo "📦 Criando banco da Evolution API..."
docker exec wapify-db psql -U wapify -c "CREATE DATABASE evolution;" 2>/dev/null || echo "  (banco evolution já existe)"

# 7. Migrations do Prisma
echo "🔄 Rodando migrations..."
docker exec wapify-app npx prisma db push --accept-data-loss 2>/dev/null || echo "⚠️  Migration falhou - app pode ainda estar iniciando"

# 8. Seed
echo "🌱 Rodando seed..."
docker exec wapify-app npx tsx prisma/seed.ts 2>/dev/null || echo "⚠️  Seed falhou - rode manualmente depois"

# 9. Criar bucket no MinIO
echo "📁 Configurando MinIO..."
sleep 5
MINIO_USER=$(grep MINIO_USER .env | cut -d= -f2)
MINIO_PASS=$(grep MINIO_PASSWORD .env | cut -d= -f2)
docker exec wapify-minio sh -c "mc alias set local http://localhost:9000 $MINIO_USER $MINIO_PASS && mc mb local/wapify --ignore-existing && mc anonymous set download local/wapify" 2>/dev/null || echo "  (configure o MinIO manualmente)"

echo ""
echo "============================================"
echo "🎉 Wapify instalado com sucesso!"
echo "============================================"
echo ""
echo "📱 Painel:      https://lojista.wapify.com.br"
echo "📡 Evolution:   https://api.wapify.com.br"
echo "📦 CDN:         https://cdn.wapify.com.br"
echo ""
echo "👤 Admin:  admin@zapcommerce.com.br"
echo "🔑 Senha:  admin123"
echo ""
echo "⚠️  TROQUE A SENHA DO ADMIN!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Aponte os DNS dos 3 domínios para ${VPS_IP:-147.93.183.200}"
echo "   2. Aguarde propagação DNS"
echo "   3. Acesse https://lojista.wapify.com.br"
echo "   4. Conecte o WhatsApp no painel"
echo ""

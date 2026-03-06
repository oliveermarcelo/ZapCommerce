#!/bin/bash
set -e
echo "🟢 Wapify - Deploy"
echo "==================="
echo "📥 Atualizando código..."
git pull origin main
echo "🔄 Rebuild da aplicação..."
docker compose -f docker-compose.prod.yml build app
echo "🚀 Reiniciando app..."
docker compose -f docker-compose.prod.yml up -d --no-deps app
echo "🔄 Verificando migrations..."
sleep 10
docker exec wapify-app npx prisma db push --accept-data-loss 2>/dev/null || true
echo "🧹 Limpando imagens antigas..."
docker image prune -f
echo ""
echo "✅ Deploy concluído!"
echo "📋 Logs: docker compose -f docker-compose.prod.yml logs -f app"

<!-- markdownlint-disable MD033 -->
# Água Clara

[![CI](https://github.com/dluks82/agua-clara/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dluks82/agua-clara/actions/workflows/ci.yml)
[![Produção](https://img.shields.io/badge/produção-aguaclara.dluks.dev-0ea5e9)](https://aguaclara.dluks.dev)
[![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](#)
[![Licença](https://img.shields.io/github/license/dluks82/agua-clara)](LICENSE)

Sistema web para monitoramento operacional do consumo de água de condomínios com captação por poço.

Links:
- Repositório: https://github.com/dluks82/agua-clara
- Produção: https://aguaclara.dluks.dev

## 🎯 Objetivo

Registrar leituras manuais de **Hidrômetro** (m³) e **Horímetro** (horas), calcular indicadores, identificar anomalias e gerar evidências para prestação de contas.

## 🛠️ Stack Tecnológica

- **Frontend/Backend**: Next.js 15 (App Router + Route Handlers)
- **Auth**: NextAuth (Google OAuth)
- **Banco**: Postgres (Neon em produção; Postgres local via Docker)
- **ORM**: Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts
- **Validação**: Zod
- **Deploy**: Vercel

## 🚀 Funcionalidades (MVP)

- ✅ **Gestão de Leituras**: Cadastro manual com validação de monotonicidade
- ✅ **Cálculos Automáticos**: Intervalos, vazão média, conversões (L/min, L/s)
- ✅ **Dashboard**: KPIs e gráficos de vazão e produção
- ✅ **Sistema de Alertas**: Detecção de quedas de vazão e oscilações (configurável)
- ✅ **Exportação**: CSV alinhado ao dashboard (inclui pró-rata quando aplicável)
- ✅ **Relatório PDF (via impressão)**: `/export/pdf` (A4, com tabelas e gráficos)
- ✅ **Configurações**: Limiares personalizáveis
- ✅ **Multi-organização**: Usuários podem operar em mais de uma organização
- ✅ **Dashboard pública (somente leitura)**: link com token, expira em 30 dias

## 📊 Modelo de Dados

### Tabelas Principais

- **`tenants`**: Organizações
- **`users`**: Usuários
- **`memberships`**: Vínculos usuário ↔ organização (roles)
- **`readings`**: Leituras do hidrômetro e horímetro
- **`settings`**: Configurações do sistema
- **`events`**: Eventos (troca de medidores, etc.)
- **`public_dashboard_links`**: Links públicos da dashboard (token com expiração)

## 🔧 Configuração do Ambiente

### Pré-requisitos

- Node.js `>= 24 < 25` (`.nvmrc`)
- Postgres (ou use Docker)

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas configurações (exemplo):

```env
DATABASE_URL="postgresql://username:password@localhost:5432/agua_clara"
NEXT_PUBLIC_APP_NAME="Água Clara"
NEXT_PUBLIC_APP_DESCRIPTION="Sistema de Monitoramento de Água"

# Auth
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

### 3. Configurar Banco de Dados

Subir Postgres local via Docker (opcional):

```bash
docker compose up -d
```

Ou com pgAdmin (opcional):

```bash
docker compose -f docker-compose.dev.yml up -d
```

```bash
# Gerar migrations (quando mudar schema)
npm run db:generate

# Aplicar migrations (recomendado; registra drizzle.__drizzle_migrations)
npm run db:migrate

# (Opcional) Sincronizar schema sem migrations (dev/rápido)
npm run db:push

# Abrir Drizzle Studio (opcional)
npm run db:studio
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start

# Linting
npm run lint

# Database (Drizzle)
npm run db:generate  # Gerar migrations
npm run db:migrate   # Aplicar migrations
npm run db:push      # Sincronizar schema (sem registrar migrations)
npm run db:status    # Verificar pendências
npm run db:studio    # Interface visual do banco
```

## 🏗️ Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── api/               # API Routes
│   │   ├── readings/      # CRUD de leituras
│   │   └── intervals/     # Cálculos e KPIs
│   ├── dashboard/         # Página do dashboard
│   ├── leituras/          # Página de gestão
│   └── layout.tsx         # Layout raiz
├── components/            # Componentes React
│   └── ui/               # Componentes shadcn/ui
├── db/                   # Database
│   ├── schema.ts         # Schema Drizzle
│   └── index.ts          # Client do banco
└── lib/                  # Utilities
    ├── calculations.ts    # Funções de cálculo
    ├── alerts.ts         # Sistema de alertas
    ├── validations/      # Schemas Zod
    └── utils.ts          # Utilitários gerais
```

## 🔌 API Endpoints

### Leituras

- `POST /api/readings` - Criar leitura
- `GET /api/readings` - Listar leituras (com filtros)

### Intervalos e KPIs

- `GET /api/intervals` - Calcular intervalos, KPIs e alertas

### Links públicos

- `POST /api/public-dashboard-links/create` - Gerar link público (admin)
- `GET /api/public-dashboard-links` - Listar links (admin)
- `POST /api/public-dashboard-links/revoke` - Revogar link (admin)
- `GET /public/dashboard?token=...` - Dashboard pública (somente leitura, ciclo atual)

## 📈 Regras de Negócio

- **Monotonicidade**: Leituras devem ser crescentes
- **Validação**: Timestamp deve ser maior que a última leitura
- **Cálculos**: Vazão = ΔV / ΔH (apenas intervalos válidos)
- **Alertas**: Queda de vazão (< 90% baseline), oscilação alta (COV > 10%)

## 🚀 Deploy

### Vercel

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Neon Database

1. Crie uma conta no [Neon](https://neon.tech)
2. Crie um novo projeto
3. Copie a `DATABASE_URL` para as variáveis de ambiente

## 📋 Roadmap

- [x] Autenticação (Google)
- [x] Relatórios PDF (via impressão)
- [ ] Integração IoT
- [ ] Rateio por bloco
- [ ] Notificações por email

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja `LICENSE`.

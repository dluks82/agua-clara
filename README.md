# Água Clara - Sistema de Monitoramento de Água

Sistema web para monitoramento operacional do consumo de água de condomínios com captação por poço.

## 🎯 Objetivo

Registrar leituras manuais de **Hidrômetro** (m³) e **Horímetro** (horas), calcular indicadores, identificar anomalias e gerar evidências para prestação de contas.

## 🛠️ Stack Tecnológica

- **Frontend/Backend**: Next.js 14 (App Router + Route Handlers)
- **Database**: Neon Postgres
- **ORM**: Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts
- **Validação**: Zod
- **Deploy**: Vercel

## 🚀 Funcionalidades (MVP)

- ✅ **Gestão de Leituras**: Cadastro manual com validação de monotonicidade
- ✅ **Cálculos Automáticos**: Intervalos, vazão média, conversões (L/min, L/s)
- ✅ **Dashboard**: KPIs e gráficos de vazão e produção
- ✅ **Sistema de Alertas**: Detecção de quedas de vazão e oscilações
- ✅ **Exportação**: CSV com leituras, intervalos e KPIs
- ✅ **Configurações**: Limiares personalizáveis

## 📊 Modelo de Dados

### Tabelas Principais

- **`readings`**: Leituras do hidrômetro e horímetro
- **`settings`**: Configurações do sistema
- **`events`**: Eventos (troca de medidores, etc.)

## 🔧 Configuração do Ambiente

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas configurações:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/agua_clara"
NEXT_PUBLIC_APP_NAME="Água Clara"
NEXT_PUBLIC_APP_DESCRIPTION="Sistema de Monitoramento de Água"
```

### 3. Configurar Banco de Dados

```bash
# Gerar migrations
npm run db:generate

# Aplicar migrations
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

# Database
npm run db:generate  # Gerar migrations
npm run db:push      # Aplicar migrations
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

- [ ] Autenticação (Auth.js)
- [ ] Relatórios PDF
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

Este projeto está sob a licença MIT.
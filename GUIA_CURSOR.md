# Guia de Continuação no Cursor IA

## 📦 Extração do Projeto

```bash
tar -xzf nfce-downloader-final.tar.gz
cd nfce-downloader-app
```

## 🔧 Configuração Inicial

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL=mysql://usuario:senha@localhost:3306/nfce_downloader

# Storage S3 (ou compatível)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=seu-bucket
S3_ACCESS_KEY=sua-access-key
S3_SECRET_KEY=sua-secret-key
S3_REGION=us-east-1

# Autenticação (opcional)
SESSION_SECRET=seu-secret-aleatorio-aqui

# Porta do servidor
PORT=3001
```

### 3. Configurar Banco de Dados

```bash
# Criar banco de dados
mysql -u root -p -e "CREATE DATABASE nfce_downloader;"

# Aplicar migrations
pnpm db:push
```

## 🚀 Executar em Desenvolvimento

```bash
pnpm dev
```

Acesse: http://localhost:3001

## 📦 Build para Produção

```bash
pnpm build
pnpm start
```

## 📁 Estrutura do Projeto

```
nfce-downloader-app/
├── client/                    # Frontend React
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx              # Página inicial
│       │   ├── AccessConfig.tsx      # Configuração de ApiKey
│       │   ├── Download.tsx          # Download por período
│       │   └── History.tsx           # Histórico com ZIP
│       └── ...
├── server/                    # Backend Node.js
│   ├── accessConfigDb.ts            # Funções de banco para configurações
│   ├── portalSearchService.ts       # Busca e download no portal
│   ├── urlParser.ts                 # Parser de URL do portal
│   ├── downloadRouter.ts            # Rotas de download e ZIP
│   ├── routers.ts                   # Rotas principais
│   └── ...
├── drizzle/                   # Schema do banco de dados
│   └── schema.ts
├── README_FINAL.md           # Documentação completa
└── package.json
```

## 🔑 Principais Funcionalidades

### 1. Configuração de ApiKey (AccessConfig)
- Usuário cola URL do portal da SEFAZ-CE
- Sistema extrai ApiKey e CNPJ automaticamente
- Valida expiração do ApiKey (24 horas)

### 2. Busca e Download por Período
- Usuário seleciona configuração e período
- Sistema busca automaticamente todas as NFC-es
- Baixa XMLs automaticamente

### 3. Histórico com Download em ZIP
- Downloads agrupados por sessão
- Botão para baixar todos os XMLs em ZIP
- Download individual de cada XML

## 🛠️ Módulos Principais

### `urlParser.ts`
```typescript
parsePortalUrl(url: string) // Extrai ApiKey da URL
validateApiKey(apiKey: string) // Valida expiração
```

### `portalSearchService.ts`
```typescript
searchNfceByPeriod(params) // Busca NFC-es por período
downloadXml(params) // Baixa XML individual
searchAndDownloadByPeriod(params) // Busca e baixa tudo
```

### `downloadRouter.ts`
```typescript
downloadZip // Gera ZIP com todos os XMLs de uma sessão
```

## 🐛 Debugging

### Logs do Servidor
Os logs estão configurados com prefixos:
- `[ZIP]` - Operações de criação de ZIP
- `[PortalSearch]` - Busca no portal
- `[Download]` - Download de XMLs

### Verificar Logs
```bash
tail -f /tmp/server.log
```

## 📝 Próximas Melhorias Sugeridas

1. **Paginação no Histórico** - Para muitas sessões
2. **Filtros no Histórico** - Por data, status, etc
3. **Agendamento de Downloads** - Buscar automaticamente em horários específicos
4. **Notificações** - Avisar quando download concluir
5. **Exportar Relatórios** - CSV/Excel com estatísticas
6. **Multi-tenant** - Suporte a múltiplas empresas

## 🔒 Segurança

- ApiKeys são armazenados criptografados no banco
- URLs pressinadas do S3 têm validade limitada
- Validação de propriedade em todas as rotas
- CORS configurado para produção

## 📞 Suporte

Para dúvidas sobre a API do portal da SEFAZ-CE:
- Portal: https://cfe.sefaz.ce.gov.br
- Documentação: https://www.sefaz.ce.gov.br/

## 🎯 Status Atual

✅ **Funcionalidades Implementadas:**
- Configuração via URL do portal
- Busca e download automático por período
- Download em ZIP
- Histórico agrupado por sessão
- Interface responsiva

✅ **Testado e Funcionando:**
- Extração de ApiKey e CNPJ
- Busca de NFC-es no portal
- Download de XMLs
- Geração de ZIP
- Upload para S3

## 📄 Arquivos de Referência

- `README_FINAL.md` - Documentação completa para usuários
- `PROGRESSO_IMPLEMENTACAO.md` - Histórico de desenvolvimento
- `test-*.ts` - Scripts de teste das funcionalidades

## 🚀 Deploy em Produção

### Opção 1: Vercel
```bash
vercel deploy
```

### Opção 2: Railway
```bash
railway up
```

### Opção 3: Docker
```bash
docker build -t nfce-downloader .
docker run -p 3001:3001 nfce-downloader
```

## 💡 Dicas para o Cursor IA

1. Use `@workspace` para contexto completo do projeto
2. Principais arquivos para edição:
   - `server/routers.ts` - Adicionar novas rotas
   - `client/src/pages/` - Modificar interface
   - `drizzle/schema.ts` - Alterar banco de dados
3. Sempre rode `pnpm db:push` após alterar schema
4. Use os scripts de teste para validar mudanças

## ✨ Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento

# Build
pnpm build            # Build de produção
pnpm start            # Inicia servidor de produção

# Banco de Dados
pnpm db:push          # Aplica mudanças no schema
pnpm db:studio        # Abre interface visual do banco

# Testes
npx tsx test-*.ts     # Executa scripts de teste

# Linting
pnpm lint             # Verifica código
```

Boa sorte com o desenvolvimento! 🚀


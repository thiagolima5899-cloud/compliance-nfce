# NFC-e Downloader - Aplicação Simplificada

## 📋 Visão Geral

Aplicação web para download automático de XMLs de NFC-e (Nota Fiscal de Consumidor Eletrônica) do portal da SEFAZ-CE. A aplicação utiliza a API do portal para buscar e baixar XMLs de forma automatizada por período.

## ✨ Funcionalidades

### 1. Configuração Simplificada
- **Cole a URL do portal** - Usuário cola a URL completa do portal da SEFAZ-CE
- **Extração automática** - Sistema extrai ApiKey e CNPJ automaticamente da URL
- **Validação de expiração** - Mostra quando o ApiKey vai expirar (24 horas)
- **Múltiplas configurações** - Suporta múltiplos CNPJs

### 2. Busca e Download Automático
- **Busca por período** - Informa data início e fim
- **Busca automática** - Sistema consulta o portal e lista todas as NFC-es do período
- **Download automático** - Para cada NFC-e encontrada, baixa o XML completo
- **Sem necessidade de CSV** - Não precisa preparar arquivo CSV com chaves

### 3. Histórico e Download em ZIP
- **Histórico agrupado** - Downloads organizados por sessão
- **Download individual** - Cada XML pode ser baixado separadamente
- **Download em ZIP** - Baixa todos os XMLs de uma sessão em um único arquivo ZIP
- **Estatísticas** - Mostra quantidade de sucessos e falhas

## 🚀 Como Usar

### Passo 1: Obter a URL do Portal

1. Acesse o portal da SEFAZ-CE: https://cfe.sefaz.ce.gov.br
2. Faça login com seu CPF e senha
3. Vá em **Consulta NFC-e**
4. Busque qualquer NFC-e
5. Clique em uma NFC-e para visualizar o XML
6. **Copie a URL completa** da barra de endereço do navegador

A URL terá este formato:
```
https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/PROTOCOLO?chaveAcesso=CHAVE&apiKey=TOKEN
```

### Passo 2: Configurar o Acesso

1. Na aplicação, clique em **Configurações**
2. Cole a URL no campo indicado
3. (Opcional) Dê um nome amigável para a configuração
4. Clique em **Adicionar Configuração**

O sistema vai:
- Extrair o ApiKey da URL
- Extrair o CNPJ do ApiKey
- Validar se o ApiKey está válido
- Salvar a configuração

### Passo 3: Fazer Download

1. Clique em **Download de NFC-e**
2. Selecione a configuração (CNPJ)
3. Informe a **data início** e **data fim**
4. Clique em **Buscar e Baixar XMLs**

O sistema vai:
- Buscar todas as NFC-es do período no portal
- Baixar o XML de cada NFC-e automaticamente
- Mostrar o progresso e resultado

### Passo 4: Baixar os XMLs

1. Clique em **Histórico**
2. Veja as sessões de download realizadas
3. Clique em **Baixar ZIP** para baixar todos os XMLs de uma sessão
4. Ou clique no ícone de download individual para baixar um XML específico

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** com TypeScript
- **tRPC** para API type-safe
- **Drizzle ORM** para banco de dados
- **MySQL** como banco de dados
- **Archiver** para criação de arquivos ZIP

### Frontend
- **React** com TypeScript
- **Wouter** para roteamento
- **TanStack Query** para gerenciamento de estado
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes

### Integrações
- **API do Portal CFe SEFAZ-CE** para busca e download de XMLs
- **S3-compatible storage** para armazenamento de arquivos

## 📁 Estrutura do Projeto

```
nfce-downloader-app/
├── client/                    # Frontend React
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx              # Página inicial
│       │   ├── AccessConfig.tsx      # Configuração de acesso
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
└── README_FINAL.md           # Esta documentação
```

## 🔑 Principais Módulos

### urlParser.ts
Responsável por extrair ApiKey e CNPJ da URL do portal:
- `parsePortalUrl()` - Extrai ApiKey da URL
- `validateApiKey()` - Valida expiração do ApiKey
- Decodifica JWT para extrair CNPJ

### portalSearchService.ts
Responsável pela busca e download de XMLs:
- `searchNfceByPeriod()` - Busca NFC-es por período
- `downloadXml()` - Baixa XML individual
- `searchAndDownloadByPeriod()` - Busca e baixa tudo automaticamente

### downloadRouter.ts
Rotas de download:
- `downloadZip` - Gera arquivo ZIP com todos os XMLs de uma sessão

### accessConfigDb.ts
Funções de banco de dados para configurações:
- `createAccessConfig()` - Cria nova configuração
- `listAccessConfigs()` - Lista configurações do usuário
- `deleteAccessConfig()` - Remove configuração

## ⚠️ Observações Importantes

### Validade do ApiKey
- O ApiKey tem validade de **24 horas**
- Após expirar, é necessário colar uma nova URL para atualizar
- O sistema mostra a data de expiração na página de Configurações

### Limites do Portal
- O portal pode ter limites de requisições por período
- Recomenda-se fazer buscas em períodos menores (ex: 1 semana)
- Em caso de erro, aguarde alguns minutos e tente novamente

### Armazenamento
- Os XMLs são armazenados no S3-compatible storage
- As URLs dos XMLs são pressinadas e têm validade limitada
- Recomenda-se baixar o ZIP logo após o download

## 🐛 Solução de Problemas

### "ApiKey expirado"
- Cole uma nova URL do portal na página de Configurações
- O sistema vai atualizar automaticamente a configuração existente

### "Erro ao buscar NFC-es"
- Verifique se o período informado está correto
- Tente um período menor
- Aguarde alguns minutos e tente novamente

### "Nenhum XML encontrado"
- Verifique se existem NFC-es no período informado
- Confirme se o CNPJ está correto
- Tente buscar no portal manualmente para confirmar

## 📝 Changelog

### Versão 2.0 (Atual)
- ✅ Simplificação completa da aplicação
- ✅ Remoção de upload de CSV
- ✅ Remoção de certificados digitais
- ✅ Configuração via URL do portal
- ✅ Extração automática de ApiKey e CNPJ
- ✅ Busca e download automático por período
- ✅ Download em ZIP no histórico
- ✅ Interface simplificada e intuitiva

### Versão 1.0 (Anterior)
- Upload de CSV com chaves de acesso
- Uso de certificado digital
- Webservice SOAP da SEFAZ
- Download individual de XMLs

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do portal da SEFAZ-CE:
- Portal: https://cfe.sefaz.ce.gov.br
- Documentação: https://www.sefaz.ce.gov.br/

## 📄 Licença

Este projeto é de uso interno e não possui licença pública.


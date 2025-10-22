# Guia de Uso - Downloader de XML NFC-e (SEFAZ-CE)

Este guia explica como utilizar a aplicação para baixar arquivos XML de Notas Fiscais de Consumidor Eletrônicas (NFC-e) da SEFAZ-CE.

## Visão Geral

A aplicação automatiza o download de XMLs de NFC-e em lote, utilizando um arquivo CSV com as chaves de acesso e um certificado digital A1. A solução utiliza uma abordagem híbrida para contornar as limitações do webservice da SEFAZ:

1.  **Consulta SOAP**: O certificado digital é usado para se comunicar com o webservice da SEFAZ e obter o **número de protocolo** de cada NFC-e.
2.  **API do Portal CFe**: Com o número de protocolo em mãos, a aplicação acessa uma API não documentada do portal da SEFAZ-CE para baixar o **arquivo XML completo**.

Para que o passo 2 funcione, é necessário fornecer um **ApiKey** temporário, que você deve obter manualmente no portal da SEFAZ.

## Passo a Passo

### 1. Login

- Acesse a aplicação através do link fornecido.
- A autenticação é feita via Manus OAuth. Se você não estiver logado, será redirecionado.

### 2. Adicionar um Certificado Digital

- No menu principal, vá para a página **"Certificados"**.
- Clique em **"Novo Certificado"**.
- Preencha o formulário:
    - **Nome do Certificado**: Um nome para identificar o certificado (ex: "Certificado Empresa A").
    - **CNPJ (opcional)**: O CNPJ associado ao certificado.
    - **Arquivo de Certificado**: Selecione o seu arquivo de certificado digital (formato `.pfx` ou `.p12`).
    - **Senha do Certificado**: Digite a senha do seu certificado.
- Clique em **"Adicionar Certificado"**.

### 3. Configurar o ApiKey

Após adicionar o certificado, você precisa configurar o ApiKey para permitir o download dos XMLs.

- No card do certificado que você acabou de adicionar, clique no botão **"Configurar ApiKey"**.
- Uma janela pop-up aparecerá com instruções e um campo para inserir o ApiKey.

#### Como Obter o ApiKey no Portal da SEFAZ-CE

O ApiKey é um token de acesso temporário (válido por 24 horas) que a aplicação precisa para se comunicar com a API do portal da SEFAZ.

1.  **Acesse o Portal CFe**: Abra o site [https://cfe.sefaz.ce.gov.br](https://cfe.sefaz.ce.gov.br) em seu navegador.
2.  **Faça Login**: Utilize seu CPF e senha para acessar o portal.
3.  **Abra as Ferramentas de Desenvolvedor**: Pressione a tecla **F12** (ou Ctrl+Shift+I / Cmd+Opt+I) para abrir as ferramentas de desenvolvedor do seu navegador.
4.  **Vá para a Aba de Armazenamento**: Procure pela aba **"Application"** (no Chrome) ou **"Armazenamento"** (no Firefox).
5.  **Encontre o ApiKey**: No menu lateral, dentro de "Local Storage" (ou "Armazenamento Local"), selecione a URL do portal. Você verá uma lista de chaves e valores. Procure pela chave `apiKey`.
6.  **Copie o Valor**: Clique duas vezes no valor associado à chave `apiKey` para selecioná-lo por completo. O valor é um token longo (JWT). Copie este valor.

![Como encontrar o ApiKey no portal da SEFAZ](https://i.imgur.com/example.png)  *(Nota: Imagem de exemplo a ser substituída por uma real)*

7.  **Cole na Aplicação**: Volte para a aplicação de download, cole o ApiKey copiado no campo correspondente e clique em **"Salvar ApiKey"**.

O sistema irá validar o token e mostrar a data de expiração. Você precisará repetir este processo a cada 24 horas.

### 4. Iniciar um Novo Download

- Volte para a página inicial.
- Clique em **"Novo Download"**.
- Preencha o formulário:
    - **Selecione o Certificado**: Escolha o certificado que você configurou com o ApiKey.
    - **Arquivo CSV**: Selecione o arquivo CSV contendo as chaves de acesso das NFC-e. O arquivo deve ter uma chave de acesso por linha, na primeira coluna.
- Clique em **"Iniciar Download"**.

### 5. Acompanhar o Progresso

- Você será redirecionado para a página de **"Histórico"**, onde poderá acompanhar o progresso da sessão de download em tempo real.
- A página mostrará o total de chaves, quantas foram processadas, e o número de sucessos e falhas.
- Ao final do processo, os XMLs baixados estarão disponíveis para download em um arquivo `.zip`.

## Solução de Problemas

- **Erro de ApiKey Inválido/Expirado**: Certifique-se de que você copiou o ApiKey corretamente e que ele ainda está dentro do prazo de validade de 24 horas. Se necessário, gere um novo no portal da SEFAZ.
- **Falha no Download**: Verifique se as chaves de acesso no seu arquivo CSV estão corretas e se o certificado digital é válido.
- **Página Não Carrega**: Tente recarregar a página. Se o problema persistir, verifique os logs do servidor se tiver acesso.

/**
 * Extrai ApiKey e CNPJ de uma URL do portal da SEFAZ-CE
 * 
 * Formato esperado:
 * https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/PROTOCOLO?chaveAcesso=CHAVE&apiKey=TOKEN
 */

export interface ParsedPortalUrl {
  success: boolean;
  apiKey?: string;
  cnpj?: string;
  errorMessage?: string;
}

/**
 * Decodifica um JWT e extrai o CNPJ do subject
 */
function extractCnpjFromJwt(jwt: string): string | undefined {
  try {
    // JWT tem 3 partes separadas por ponto: header.payload.signature
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return undefined;
    }

    // Decodificar o payload (segunda parte)
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    // O CNPJ está no campo "sub" (subject)
    return data.sub;
  } catch (error) {
    console.error('[UrlParser] Erro ao decodificar JWT:', error);
    return undefined;
  }
}

/**
 * Extrai ApiKey e CNPJ de uma URL do portal da SEFAZ-CE
 */
export function parsePortalUrl(url: string): ParsedPortalUrl {
  try {
    console.log('[UrlParser] Parsing URL:', url.substring(0, 100) + '...');

    // Verificar se é uma URL válida
    if (!url.includes('cfe.sefaz.ce.gov.br')) {
      return {
        success: false,
        errorMessage: 'URL inválida. Deve ser do portal da SEFAZ-CE (cfe.sefaz.ce.gov.br)',
      };
    }

    // Extrair parâmetros da URL
    const urlObj = new URL(url);
    const apiKey = urlObj.searchParams.get('apiKey');

    if (!apiKey) {
      return {
        success: false,
        errorMessage: 'ApiKey não encontrado na URL. Certifique-se de copiar a URL completa ao visualizar um XML no portal.',
      };
    }

    console.log('[UrlParser] ApiKey extraído:', apiKey.substring(0, 50) + '...');

    // Extrair CNPJ do JWT
    const cnpj = extractCnpjFromJwt(apiKey);

    if (!cnpj) {
      return {
        success: false,
        errorMessage: 'Não foi possível extrair o CNPJ da ApiKey. Verifique se a URL está correta.',
      };
    }

    console.log('[UrlParser] CNPJ extraído:', cnpj);

    return {
      success: true,
      apiKey,
      cnpj,
    };
  } catch (error: any) {
    console.error('[UrlParser] Erro ao fazer parse da URL:', error);
    return {
      success: false,
      errorMessage: `Erro ao processar URL: ${error.message}`,
    };
  }
}

/**
 * Valida se uma ApiKey ainda está válida (não expirou)
 */
export function validateApiKey(apiKey: string): {
  valid: boolean;
  expiresAt?: Date;
  errorMessage?: string;
} {
  try {
    const parts = apiKey.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        errorMessage: 'ApiKey inválido (formato incorreto)',
      };
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    // Verificar expiração (exp está em segundos, Date.now() em milissegundos)
    const expiresAt = new Date(data.exp * 1000);
    const now = new Date();

    if (expiresAt < now) {
      return {
        valid: false,
        expiresAt,
        errorMessage: 'ApiKey expirado',
      };
    }

    return {
      valid: true,
      expiresAt,
    };
  } catch (error: any) {
    return {
      valid: false,
      errorMessage: `Erro ao validar ApiKey: ${error.message}`,
    };
  }
}


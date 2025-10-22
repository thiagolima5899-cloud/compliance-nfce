import https from 'https';

/**
 * Interface para requisição de download de XML
 */
export interface DownloadXmlRequest {
  protocolo: string;
  chaveAcesso: string;
  apiKey: string;
}

/**
 * Interface para resultado do download
 */
export interface DownloadXmlResult {
  success: boolean;
  xmlContent?: string;
  errorMessage?: string;
  statusCode?: number;
}

/**
 * Faz download do XML de NFC-e usando a API do Portal CFe
 * 
 * URL: https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/{protocolo}?chaveAcesso={chave}&apiKey={token}
 */
export async function downloadXmlFromPortal(
  request: DownloadXmlRequest
): Promise<DownloadXmlResult> {
  return new Promise((resolve) => {
    try {
      const { protocolo, chaveAcesso, apiKey } = request;

      // Monta URL
      const url = `https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/${protocolo}?chaveAcesso=${chaveAcesso}&apiKey=${encodeURIComponent(apiKey)}`;

      console.log('[PortalCFe] Baixando XML...');
      console.log('[PortalCFe] Protocolo:', protocolo);
      console.log('[PortalCFe] Chave:', chaveAcesso);
      console.log('[PortalCFe] ApiKey:', apiKey.substring(0, 50) + '...');

      // Faz requisição HTTPS
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/xml, text/xml, */*',
        },
        timeout: 30000,
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('[PortalCFe] Status HTTP:', res.statusCode);

          if (res.statusCode === 200) {
            // Verifica se é XML válido
            if (data.includes('<?xml') && data.includes('<NFe')) {
              console.log('[PortalCFe] ✅ XML baixado com sucesso!');
              resolve({
                success: true,
                xmlContent: data,
                statusCode: res.statusCode,
              });
            } else {
              console.error('[PortalCFe] ❌ Resposta não é XML válido');
              resolve({
                success: false,
                errorMessage: 'Resposta não é XML válido',
                statusCode: res.statusCode,
              });
            }
          } else if (res.statusCode === 401) {
            console.error('[PortalCFe] ❌ ApiKey inválido ou expirado');
            resolve({
              success: false,
              errorMessage: 'ApiKey inválido ou expirado (401)',
              statusCode: res.statusCode,
            });
          } else if (res.statusCode === 404) {
            console.error('[PortalCFe] ❌ XML não encontrado (protocolo ou chave incorretos)');
            resolve({
              success: false,
              errorMessage: 'XML não encontrado (404)',
              statusCode: res.statusCode,
            });
          } else {
            console.error('[PortalCFe] ❌ Erro HTTP:', res.statusCode);
            console.error('[PortalCFe] Resposta:', data.substring(0, 500));
            resolve({
              success: false,
              errorMessage: `Erro HTTP ${res.statusCode}`,
              statusCode: res.statusCode,
            });
          }
        });
      });

      req.on('error', (error) => {
        console.error('[PortalCFe] ❌ Erro na requisição:', error.message);
        resolve({
          success: false,
          errorMessage: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('[PortalCFe] ❌ Timeout na requisição');
        resolve({
          success: false,
          errorMessage: 'Timeout na requisição',
        });
      });

    } catch (error: any) {
      console.error('[PortalCFe] ❌ Erro:', error);
      resolve({
        success: false,
        errorMessage: error.message || 'Erro desconhecido',
      });
    }
  });
}

/**
 * Valida se o apiKey é um JWT válido e não expirou
 */
export function validateApiKey(apiKey: string): { valid: boolean; expiresAt?: Date; error?: string } {
  try {
    // Decodifica JWT (formato: header.payload.signature)
    const parts = apiKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'ApiKey não é um JWT válido' };
    }

    // Decodifica payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Verifica expiração
    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();

      if (now >= expiresAt) {
        return { valid: false, error: 'ApiKey expirado', expiresAt };
      }

      return { valid: true, expiresAt };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}


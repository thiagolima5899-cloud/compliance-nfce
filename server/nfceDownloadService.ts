import { consultaProtocoloNFCe } from './sefaz';
import { downloadXmlFromPortal, validateApiKey } from './portalCfeApi';

/**
 * Interface para requisição de download híbrido
 */
export interface HybridDownloadRequest {
  accessKey: string;
  certificatePem: string;
  certificatePassword: string;
  apiKey: string;
  environment: 'production' | 'homologacao';
}

/**
 * Interface para resultado do download híbrido
 */
export interface HybridDownloadResult {
  success: boolean;
  xmlContent?: string;
  protocolNumber?: string;
  status?: string;
  errorMessage?: string;
  method?: 'soap' | 'portal' | 'hybrid';
}

/**
 * Faz download de XML de NFC-e usando abordagem híbrida:
 * 1. Consulta SEFAZ via SOAP para obter número do protocolo
 * 2. Baixa XML completo via API do Portal CFe usando o protocolo
 * 
 * Esta abordagem é necessária porque o webservice SOAP não retorna
 * o XML completo para NFC-e (modelo 65), apenas informações do protocolo.
 */
export async function downloadNfceXml(
  request: HybridDownloadRequest
): Promise<HybridDownloadResult> {
  console.log('[NfceDownloadService] ========================================');
  console.log('[NfceDownloadService] Iniciando download híbrido');
  console.log('[NfceDownloadService] Chave:', request.accessKey);
  console.log('[NfceDownloadService] ========================================');

  try {
    // Validar apiKey antes de iniciar
    console.log('[NfceDownloadService] 1. Validando ApiKey...');
    const apiKeyValidation = validateApiKey(request.apiKey);
    
    if (!apiKeyValidation.valid) {
      console.error('[NfceDownloadService] ❌ ApiKey inválido ou expirado');
      return {
        success: false,
        errorMessage: apiKeyValidation.error || 'ApiKey inválido ou expirado',
      };
    }

    if (apiKeyValidation.expiresAt) {
      console.log('[NfceDownloadService] ApiKey válido até:', apiKeyValidation.expiresAt.toLocaleString('pt-BR'));
    }

    // Passo 1: Consultar SEFAZ via SOAP para obter protocolo
    console.log('[NfceDownloadService] 2. Consultando SEFAZ via SOAP...');
    const soapResponse = await consultaProtocoloNFCe({
      accessKey: request.accessKey,
      nfCertificatePem: request.certificatePem,
      nfCertificatePassword: request.certificatePassword,
      environment: request.environment,
    });

    if (!soapResponse.success) {
      console.error('[NfceDownloadService] ❌ Erro na consulta SOAP:', soapResponse.errorMessage);
      return {
        success: false,
        errorMessage: `Erro SOAP: ${soapResponse.errorMessage}`,
        status: soapResponse.status,
      };
    }

    const protocolNumber = soapResponse.protocolNumber;
    const status = soapResponse.status;

    console.log('[NfceDownloadService] ✅ Protocolo obtido:', protocolNumber);
    console.log('[NfceDownloadService] Status SEFAZ:', status);

    if (!protocolNumber) {
      console.error('[NfceDownloadService] ❌ Protocolo não encontrado na resposta SOAP');
      console.error('[NfceDownloadService] Status retornado:', status);
      
      // Se temos XML da resposta SOAP, tentar usá-lo diretamente
      if (soapResponse.xmlContent) {
        console.log('[NfceDownloadService] ℹ️ Usando XML da resposta SOAP (sem protocolo)');
        return {
          success: true,
          xmlContent: soapResponse.xmlContent,
          status,
          method: 'soap',
        };
      }
      
      return {
        success: false,
        errorMessage: `Número do protocolo não encontrado na resposta da SEFAZ (Status: ${status || 'desconhecido'})`,
        status,
      };
    }

    // Verificar se o status indica que a NFC-e está autorizada
    // Status 100 = Autorizada
    if (status !== '100') {
      console.warn('[NfceDownloadService] ⚠️ NFC-e não autorizada (status:', status, ')');
      // Continuar mesmo assim, pois pode haver XML disponível
    }

    // Passo 2: Baixar XML via API do Portal CFe
    console.log('[NfceDownloadService] 3. Baixando XML via Portal API...');
    const portalResponse = await downloadXmlFromPortal({
      protocolo: protocolNumber,
      chaveAcesso: request.accessKey,
      apiKey: request.apiKey,
    });

    if (!portalResponse.success) {
      console.error('[NfceDownloadService] ❌ Erro no download via Portal:', portalResponse.errorMessage);
      
      // Se falhou no portal, tentar usar o XML do SOAP (se disponível)
      if (soapResponse.xmlContent) {
        console.log('[NfceDownloadService] ℹ️ Usando XML da resposta SOAP como fallback');
        return {
          success: true,
          xmlContent: soapResponse.xmlContent,
          protocolNumber,
          status,
          method: 'soap',
        };
      }
      
      return {
        success: false,
        errorMessage: `Erro Portal: ${portalResponse.errorMessage}`,
        protocolNumber,
        status,
      };
    }

    console.log('[NfceDownloadService] ✅ XML baixado com sucesso via Portal!');
    console.log('[NfceDownloadService] Tamanho do XML:', portalResponse.xmlContent?.length, 'bytes');
    console.log('[NfceDownloadService] ========================================');

    return {
      success: true,
      xmlContent: portalResponse.xmlContent,
      protocolNumber,
      status,
      method: 'hybrid',
    };

  } catch (error: any) {
    console.error('[NfceDownloadService] ❌ Erro fatal:', error);
    console.error('[NfceDownloadService] Stack:', error.stack);
    
    return {
      success: false,
      errorMessage: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se um apiKey está válido e não expirou
 */
export function checkApiKeyValidity(apiKey: string): {
  valid: boolean;
  expiresAt?: Date;
  expiresIn?: string;
  error?: string;
} {
  const validation = validateApiKey(apiKey);
  
  if (!validation.valid) {
    return validation;
  }

  // Calcular tempo restante até expiração
  if (validation.expiresAt) {
    const now = new Date();
    const expiresAt = validation.expiresAt;
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let expiresIn = '';
    if (diffHours > 0) {
      expiresIn = `${diffHours}h ${diffMinutes}m`;
    } else {
      expiresIn = `${diffMinutes}m`;
    }

    return {
      valid: true,
      expiresAt,
      expiresIn,
    };
  }

  return { valid: true };
}


import https from 'https';

/**
 * Interface para requisição de busca por período
 */
export interface SearchByPeriodRequest {
  dataInicio: string; // Formato: YYYY-MM-DD
  dataFim: string; // Formato: YYYY-MM-DD
  apiKey: string;
  cnpj: string; // CNPJ do emitente
  horaInicio?: string; // Formato: HH:mm (padrão: 00:00)
  horaFim?: string; // Formato: HH:mm (padrão: 23:59)
  count?: number; // Quantidade por página (padrão: 100)
}

/**
 * Interface para NFC-e encontrada
 */
export interface NfceFound {
  id: string; // Este é o número do protocolo!
  protocolo: string; // Mesmo valor que id, para clareza
  chaveAcesso: string;
  dataEmissao: string;
  numeroDocFiscal?: string;
  numSerieNfce: string;
  tipoNfce: number;
}

/**
 * Interface para resultado da busca
 */
export interface SearchByPeriodResult {
  success: boolean;
  nfces?: NfceFound[];
  totalFound?: number;
  errorMessage?: string;
  statusCode?: number;
}

/**
 * Busca NFC-es por período no portal da SEFAZ-CE
 * 
 * Esta função faz uma requisição à API do portal para obter
 * a lista de NFC-es emitidas em um determinado período.
 * 
 * URL: https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/coupons/extract
 */
export async function searchNfceByPeriod(
  request: SearchByPeriodRequest
): Promise<SearchByPeriodResult> {
  return new Promise((resolve) => {
    try {
      const {
        dataInicio,
        dataFim,
        apiKey,
        cnpj,
        horaInicio = '00:00',
        horaFim = '23:59',
        count = 100,
      } = request;

      console.log('[PortalSearch] ========================================');
      console.log('[PortalSearch] Iniciando busca por período');
      console.log('[PortalSearch] Data início:', dataInicio, horaInicio);
      console.log('[PortalSearch] Data fim:', dataFim, horaFim);
      console.log('[PortalSearch] CNPJ:', cnpj);
      console.log('[PortalSearch] ========================================');

      // Construir URL com parâmetros
      const params = new URLSearchParams({
        count: count.toString(),
        page: '1',
        startDate: `${dataInicio} ${horaInicio}:00`,
        endDate: `${dataFim} ${horaFim}:59`,
        startDateTime: horaInicio,
        endDateTime: horaFim,
        type: '100',
        ultimaNota: 'false',
      });

      const url = `https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/coupons/extract?${params.toString()}`;
      
      console.log('[PortalSearch] URL:', url);

      const req = https.get(url, {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-authentication-taxid': cnpj,
          'x-authentication-token': apiKey,
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
        timeout: 30000,
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('[PortalSearch] Status HTTP:', res.statusCode);
          console.log('[PortalSearch] Resposta (primeiros 500 chars):', data.substring(0, 500));
          
          if (res.statusCode === 200) {
            try {
              const jsonData = JSON.parse(data);
              
              // Extrair NFC-es da resposta
              const nfces: NfceFound[] = [];
              
              // A resposta tem formato: { status: {code: 0}, data: [...], total: N }
              if (jsonData.data && Array.isArray(jsonData.data)) {
                jsonData.data.forEach((item: any) => {
                  nfces.push({
                    id: item.id.toString(),
                    protocolo: item.id.toString(), // O ID é o número do protocolo!
                    chaveAcesso: item.numeroNotaNfce, // Chave de acesso completa
                    dataEmissao: item.dataEmissao,
                    numeroDocFiscal: item.numoDocFiscal,
                    numSerieNfce: item.numSerieNfce.toString(),
                    tipoNfce: item.tipoNfce,
                  });
                });
              }
              
              const total = jsonData.total || nfces.length;
              
              console.log('[PortalSearch] ✅ Encontradas', nfces.length, 'NFC-es (total:', total, ')');
              
              resolve({
                success: true,
                nfces,
                totalFound: total,
                statusCode: res.statusCode,
              });
            } catch (parseError: any) {
              console.error('[PortalSearch] ❌ Erro ao parsear JSON:', parseError.message);
              console.error('[PortalSearch] Resposta completa:', data);
              resolve({
                success: false,
                errorMessage: 'Erro ao processar resposta do servidor',
                statusCode: res.statusCode,
              });
            }
          } else if (res.statusCode === 401) {
            console.error('[PortalSearch] ❌ ApiKey inválido ou expirado');
            resolve({
              success: false,
              errorMessage: 'ApiKey inválido ou expirado (401)',
              statusCode: res.statusCode,
            });
          } else {
            console.error('[PortalSearch] ❌ Erro HTTP:', res.statusCode);
            console.error('[PortalSearch] Resposta:', data);
            resolve({
              success: false,
              errorMessage: `Erro HTTP ${res.statusCode}`,
              statusCode: res.statusCode,
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('[PortalSearch] ❌ Erro na requisição:', error.message);
        resolve({
          success: false,
          errorMessage: error.message,
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.error('[PortalSearch] ❌ Timeout na requisição');
        resolve({
          success: false,
          errorMessage: 'Timeout na requisição',
        });
      });

    } catch (error: any) {
      console.error('[PortalSearch] ❌ Erro:', error);
      resolve({
        success: false,
        errorMessage: error.message || 'Erro desconhecido',
      });
    }
  });
}

/**
 * Busca e baixa XMLs de NFC-es por período
 * 
 * Esta função combina a busca por período com o download dos XMLs:
 * 1. Busca NFC-es no período informado
 * 2. Para cada NFC-e encontrada, obtém o protocolo via SOAP
 * 3. Baixa o XML usando protocolo + chave + apiKey
 */
export async function searchAndDownloadByPeriod(
  request: SearchByPeriodRequest,
  certificatePem?: string,
  certificatePassword?: string
): Promise<{
  success: boolean;
  nfcesFound?: number;
  xmlsDownloaded?: number;
  xmls?: Array<{ chaveAcesso: string; xmlContent: string }>;
  errors?: Array<{ chaveAcesso: string; error: string }>;
  errorMessage?: string;
}> {
  console.log('[PortalSearch] ========================================');
  console.log('[PortalSearch] Buscar e baixar XMLs por período');
  console.log('[PortalSearch] ========================================');

  // Buscar NFC-es
  const searchResult = await searchNfceByPeriod(request);
  
  if (!searchResult.success || !searchResult.nfces) {
    return {
      success: false,
      errorMessage: searchResult.errorMessage || 'Nenhuma NFC-e encontrada',
    };
  }

  console.log('[PortalSearch] Encontradas', searchResult.nfces.length, 'NFC-es');
  console.log('[PortalSearch] Iniciando download dos XMLs...');

  // Importar serviços necessários
  const { consultaProtocoloNFCe } = await import('./sefaz');
  const { downloadXmlFromPortal } = await import('./portalCfeApi');
  
  let downloadedCount = 0;
  const xmls: Array<{ chaveAcesso: string; xmlContent: string }> = [];
  const errors: Array<{ chaveAcesso: string; error: string }> = [];

  for (const nfce of searchResult.nfces) {
    try {
      console.log('[PortalSearch] Processando:', nfce.chaveAcesso);
      console.log('[PortalSearch] Protocolo:', nfce.protocolo);
      
      // Baixar XML usando protocolo (que já temos do campo 'id')
      console.log('[PortalSearch] Baixando XML...');
      const downloadResult = await downloadXmlFromPortal({
        protocolo: nfce.protocolo,
        chaveAcesso: nfce.chaveAcesso,
        apiKey: request.apiKey,
      });

      if (downloadResult.success && downloadResult.xmlContent) {
        downloadedCount++;
        xmls.push({
          chaveAcesso: nfce.chaveAcesso,
          xmlContent: downloadResult.xmlContent,
        });
        console.log('[PortalSearch] ✅ XML baixado:', nfce.chaveAcesso);
      } else {
        errors.push({
          chaveAcesso: nfce.chaveAcesso,
          error: downloadResult.errorMessage || 'Erro desconhecido',
        });
        console.error('[PortalSearch] ❌ Erro ao baixar:', nfce.chaveAcesso);
      }
    } catch (error: any) {
      errors.push({
        chaveAcesso: nfce.chaveAcesso,
        error: error.message,
      });
      console.error('[PortalSearch] ❌ Erro:', error.message);
    }
  }

  console.log('[PortalSearch] ========================================');
  console.log('[PortalSearch] Busca e download concluídos');
  console.log('[PortalSearch] Total encontrado:', searchResult.nfces.length);
  console.log('[PortalSearch] XMLs baixados:', downloadedCount);
  console.log('[PortalSearch] Erros:', errors.length);
  console.log('[PortalSearch] ========================================');

  return {
    success: true,
    nfcesFound: searchResult.nfces.length,
    xmlsDownloaded: downloadedCount,
    xmls,
    errors: errors.length > 0 ? errors : undefined,
  };
}


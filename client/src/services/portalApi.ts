/**
 * Serviço para interagir com a API do Portal CFe da SEFAZ-CE
 * Busca NFC-es por período e baixa XMLs
 */

export interface NFCe {
  id: string; // Número do protocolo
  numeroNotaNfce: string; // Chave de acesso (44 dígitos)
  dataEmissao: string;
  numoDocFiscal: number;
  numSerieNfce: number;
}

export interface SearchResult {
  nfces: NFCe[];
  total: number;
}

export interface XML {
  chaveAcesso: string;
  xmlContent: string;
  protocolo: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
  currentChave?: string;
  status: 'searching' | 'downloading' | 'completed' | 'error';
}

/**
 * Busca NFC-es por período no portal da SEFAZ-CE
 */
export async function searchNFCes(
  cnpj: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<SearchResult> {
  try {
    console.log('[PortalAPI] Buscando NFC-es:', { startDate, endDate });
    
    const url = new URL('https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/coupons/extract');
    url.searchParams.set('startDate', `${startDate} 00:00:00`);
    url.searchParams.set('endDate', `${endDate} 23:59:59`);
    url.searchParams.set('startDateTime', '00:00');
    url.searchParams.set('endDateTime', '23:59');
    url.searchParams.set('type', '100');
    url.searchParams.set('count', '1000');
    url.searchParams.set('page', '1');
    url.searchParams.set('ultimaNota', 'false');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'x-authentication-taxid': cnpj,
        'x-authentication-token': apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar NFC-es: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const nfces: NFCe[] = data.data || [];
    const total = data.total || nfces.length;
    
    console.log(`[PortalAPI] ${nfces.length} NFC-es encontradas`);
    
    return { nfces, total };
    
  } catch (error) {
    console.error('[PortalAPI] Erro ao buscar NFC-es:', error);
    throw error;
  }
}

/**
 * Baixa o XML de uma NFC-e específica
 */
export async function downloadXML(
  protocolo: string,
  chaveAcesso: string,
  apiKey: string
): Promise<string> {
  try {
    const url = new URL(`https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/${protocolo}`);
    url.searchParams.set('chaveAcesso', chaveAcesso);
    url.searchParams.set('apiKey', apiKey);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/xml, text/xml, */*',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao baixar XML: ${response.status} ${response.statusText}`);
    }
    
    const xmlContent = await response.text();
    
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new Error('XML vazio retornado');
    }
    
    return xmlContent;
    
  } catch (error) {
    console.error(`[PortalAPI] Erro ao baixar XML ${chaveAcesso}:`, error);
    throw error;
  }
}

/**
 * Busca e baixa todos os XMLs de um período
 * Retorna array de XMLs e chama callback de progresso
 */
export async function searchAndDownloadXMLs(
  cnpj: string,
  apiKey: string,
  startDate: string,
  endDate: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<XML[]> {
  
  // 1. Buscar NFC-es
  if (onProgress) {
    onProgress({ current: 0, total: 0, status: 'searching' });
  }
  
  const { nfces, total } = await searchNFCes(cnpj, apiKey, startDate, endDate);
  
  if (nfces.length === 0) {
    if (onProgress) {
      onProgress({ current: 0, total: 0, status: 'completed' });
    }
    return [];
  }
  
  // 2. Baixar XMLs
  const xmls: XML[] = [];
  const errors: Array<{ chaveAcesso: string; error: string }> = [];
  
  for (let i = 0; i < nfces.length; i++) {
    const nfce = nfces[i];
    const protocolo = nfce.id.toString();
    const chaveAcesso = nfce.numeroNotaNfce;
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: nfces.length,
        currentChave: chaveAcesso,
        status: 'downloading',
      });
    }
    
    try {
      const xmlContent = await downloadXML(protocolo, chaveAcesso, apiKey);
      
      xmls.push({
        chaveAcesso,
        xmlContent,
        protocolo,
      });
      
      console.log(`[PortalAPI] XML baixado: ${chaveAcesso} (${i + 1}/${nfces.length})`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push({ chaveAcesso, error: errorMessage });
      console.error(`[PortalAPI] Falha ao baixar ${chaveAcesso}:`, errorMessage);
    }
  }
  
  // 3. Finalizar
  if (onProgress) {
    onProgress({
      current: nfces.length,
      total: nfces.length,
      status: 'completed',
    });
  }
  
  console.log(`[PortalAPI] Download concluído: ${xmls.length} sucesso, ${errors.length} erros`);
  
  if (errors.length > 0) {
    console.warn('[PortalAPI] Erros:', errors);
  }
  
  return xmls;
}


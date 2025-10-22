/**
 * Utilitário para extrair ApiKey e CNPJ da URL do portal da SEFAZ-CE
 */

export interface ParsedUrl {
  apiKey: string;
  cnpj: string;
  expiresAt: Date;
}

/**
 * Extrai ApiKey e CNPJ da URL do portal
 * URL exemplo: https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/223250158063531?chaveAcesso=23251034880879000125650010000152571722108538&apiKey=eyJhbGci...
 */
export function parsePortalUrl(url: string): ParsedUrl {
  try {
    // Extrair apiKey da URL
    const urlObj = new URL(url);
    const apiKey = urlObj.searchParams.get('apiKey');
    
    if (!apiKey) {
      throw new Error('ApiKey não encontrado na URL. Certifique-se de copiar a URL completa do portal.');
    }
    
    // Decodificar JWT para extrair CNPJ e expiração
    const payload = decodeJWT(apiKey);
    
    if (!payload.sub) {
      throw new Error('CNPJ não encontrado no ApiKey');
    }
    
    if (!payload.exp) {
      throw new Error('Data de expiração não encontrada no ApiKey');
    }
    
    const cnpj = payload.sub;
    const expiresAt = new Date(payload.exp * 1000); // exp está em segundos
    
    // Validar CNPJ (14 dígitos)
    if (!/^\d{14}$/.test(cnpj)) {
      throw new Error('CNPJ inválido no ApiKey');
    }
    
    // Validar se não expirou
    const now = new Date();
    if (expiresAt < now) {
      throw new Error('ApiKey expirado. Faça login novamente no portal e copie uma nova URL.');
    }
    
    return {
      apiKey,
      cnpj,
      expiresAt,
    };
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao processar URL. Verifique se copiou a URL correta do portal.');
  }
}

/**
 * Decodifica JWT sem validar assinatura (apenas extrai payload)
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
    
  } catch (error) {
    throw new Error('Erro ao decodificar ApiKey. Token inválido.');
  }
}

/**
 * Formata CNPJ para exibição (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
  if (!/^\d{14}$/.test(cnpj)) {
    return cnpj;
  }
  
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Calcula tempo restante até expiração
 */
export function getTimeUntilExpiration(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Expirado';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  
  return `${minutes} minutos`;
}


/**
 * LocalStorage para gerenciar configuração de acesso (CNPJ + ApiKey)
 * Substitui o banco de dados para armazenamento local
 */

export interface AccessConfig {
  cnpj: string;
  apiKey: string;
  apiKeyExpiresAt: string;
  name: string;
}

const STORAGE_KEY = 'nfce_access_config';

/**
 * Salva configuração de acesso no LocalStorage
 */
export function saveAccessConfig(config: AccessConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('[LocalStorage] Configuração salva:', { cnpj: config.cnpj, name: config.name });
  } catch (error) {
    console.error('[LocalStorage] Erro ao salvar configuração:', error);
    throw new Error('Erro ao salvar configuração. Verifique se o LocalStorage está habilitado.');
  }
}

/**
 * Obtém configuração de acesso do LocalStorage
 */
export function getAccessConfig(): AccessConfig | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return null;
    }
    
    const config = JSON.parse(data) as AccessConfig;
    
    // Verificar se ApiKey expirou
    const expiresAt = new Date(config.apiKeyExpiresAt);
    const now = new Date();
    
    if (expiresAt < now) {
      console.warn('[LocalStorage] ApiKey expirado');
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('[LocalStorage] Erro ao ler configuração:', error);
    return null;
  }
}

/**
 * Remove configuração de acesso do LocalStorage
 */
export function clearAccessConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[LocalStorage] Configuração removida');
  } catch (error) {
    console.error('[LocalStorage] Erro ao remover configuração:', error);
  }
}

/**
 * Verifica se existe configuração válida
 */
export function hasValidConfig(): boolean {
  return getAccessConfig() !== null;
}


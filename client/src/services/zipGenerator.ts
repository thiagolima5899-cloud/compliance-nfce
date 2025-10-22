/**
 * Serviço para gerar arquivos ZIP no navegador
 * Usa JSZip para criar ZIP com XMLs e fazer download automático
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { XML } from './portalApi';

export interface ZipOptions {
  fileName?: string;
  compression?: 'STORE' | 'DEFLATE';
  compressionLevel?: number;
}

/**
 * Gera um arquivo ZIP com os XMLs e faz download automático
 */
export async function generateAndDownloadZip(
  xmls: XML[],
  options: ZipOptions = {}
): Promise<void> {
  try {
    const {
      fileName = 'nfce-xmls.zip',
      compression = 'DEFLATE',
      compressionLevel = 9,
    } = options;
    
    console.log(`[ZipGenerator] Gerando ZIP com ${xmls.length} XMLs...`);
    
    // Criar instância do JSZip
    const zip = new JSZip();
    
    // Adicionar cada XML ao ZIP
    xmls.forEach(({ chaveAcesso, xmlContent }) => {
      zip.file(`${chaveAcesso}.xml`, xmlContent);
    });
    
    console.log('[ZipGenerator] XMLs adicionados ao ZIP, gerando arquivo...');
    
    // Gerar blob do ZIP
    const blob = await zip.generateAsync({
      type: 'blob',
      compression,
      compressionOptions: {
        level: compressionLevel,
      },
    });
    
    const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
    console.log(`[ZipGenerator] ZIP gerado: ${sizeInMB} MB`);
    
    // Download automático
    saveAs(blob, fileName);
    
    console.log(`[ZipGenerator] Download iniciado: ${fileName}`);
    
  } catch (error) {
    console.error('[ZipGenerator] Erro ao gerar ZIP:', error);
    throw error;
  }
}

/**
 * Gera nome de arquivo baseado no período
 */
export function generateFileName(startDate: string, endDate: string): string {
  const start = startDate.replace(/\//g, '-');
  const end = endDate.replace(/\//g, '-');
  return `nfce-${start}_${end}.zip`;
}

/**
 * Estima o tamanho do ZIP baseado nos XMLs
 */
export function estimateZipSize(xmls: XML[]): { bytes: number; mb: string } {
  const totalBytes = xmls.reduce((sum, xml) => sum + xml.xmlContent.length, 0);
  // ZIP com compressão DEFLATE geralmente reduz para ~30-40% do tamanho original
  const estimatedBytes = Math.floor(totalBytes * 0.35);
  const mb = (estimatedBytes / 1024 / 1024).toFixed(2);
  
  return {
    bytes: estimatedBytes,
    mb,
  };
}


import { v4 as uuidv4 } from "uuid";
import { 
  getDownloadSessionById, 
  updateDownloadSession,
  createDownloadRecord,
  getCsvUploadById,
  getCertificateById,
} from "./db";
import { storagePut, storageGet } from "./storage";
import { validateAccessKey } from "./sefaz";
import { downloadNfceXml } from "./nfceDownloadService";

/**
 * Processa um arquivo CSV e inicia downloads de NFC-e
 * Executa em background para não bloquear a requisição HTTP
 */
export async function processDownloadSession(sessionId: string): Promise<void> {
  console.log(`[DownloadProcessor] ======================================`);
  console.log(`[DownloadProcessor] Starting processing for session: ${sessionId}`);
  console.log(`[DownloadProcessor] ======================================`);
  
  try {
    
    const session = await getDownloadSessionById(sessionId);
    if (!session) {
      console.error(`[DownloadProcessor] Session not found: ${sessionId}`);
      return;
    }

    // Obter informações do CSV e certificado
    const csvUpload = await getCsvUploadById(session.csvUploadId);
    const certificate = await getCertificateById(session.certificateId);

    if (!csvUpload || !certificate) {
      console.error(`[DownloadProcessor] CSV or certificate not found`);
      await updateDownloadSession(sessionId, {
        status: "failed",
        completedAt: new Date(),
      });
      return;
    }

    console.log(`[DownloadProcessor] CSV: ${csvUpload.fileName}, Cert: ${certificate.certificateName}`);

    // Verificar se o certificado tem apiKey configurado
    if (!certificate.apiKey) {
      console.error(`[DownloadProcessor] ApiKey não configurado no certificado`);
      await updateDownloadSession(sessionId, {
        status: "failed",
        completedAt: new Date(),
      });
      return;
    }

    // Verificar se o apiKey não expirou
    if (certificate.apiKeyExpiresAt && new Date() >= certificate.apiKeyExpiresAt) {
      console.error(`[DownloadProcessor] ApiKey expirado em ${certificate.apiKeyExpiresAt}`);
      await updateDownloadSession(sessionId, {
        status: "failed",
        completedAt: new Date(),
      });
      return;
    }

    console.log(`[DownloadProcessor] ApiKey válido até: ${certificate.apiKeyExpiresAt?.toLocaleString('pt-BR')}`);

    // Obter conteúdo do CSV do S3
    let csvContent = "";
    try {
      const csvUrl = await storageGet(csvUpload.csvKey, 3600);
      console.log(`[DownloadProcessor] Fetching CSV from: ${csvUrl.url}`);
      csvContent = await fetch(csvUrl.url).then(r => r.text());
    } catch (error) {
      console.error(`[DownloadProcessor] Error fetching CSV:`, error);
      await updateDownloadSession(sessionId, {
        status: "failed",
        completedAt: new Date(),
      });
      return;
    }

    // Parsear chaves do CSV
    const lines = csvContent.split("\n").filter(line => line.trim());
    console.log(`[DownloadProcessor] Total lines in CSV: ${lines.length}`);
    console.log(`[DownloadProcessor] CSV Content (first 500 chars): ${csvContent.substring(0, 500)}`);
    
    // Detectar se a primeira linha é um header ou uma chave válida
    const firstLine = lines[0]?.trim() || "";
    const hasHeader = !validateAccessKey(firstLine);
    console.log(`[DownloadProcessor] First line: "${firstLine}"`);
    console.log(`[DownloadProcessor] Has header: ${hasHeader}`);
    
    const dataLines = hasHeader ? lines.slice(1) : lines;
    console.log(`[DownloadProcessor] Data lines to process: ${dataLines.length}`);
    
    const accessKeys = dataLines
      .map(line => {
        // Extrair a primeira coluna do CSV (chave de acesso)
        // Remove aspas e pega tudo antes da primeira vírgula
        const firstColumn = line.split(',')[0].replace(/"/g, '').trim();
        return firstColumn;
      })
      .filter(key => key.length > 0) // Filter empty lines
      .filter(key => {
        const valid = validateAccessKey(key);
        if (!valid) {
          console.warn(`[DownloadProcessor] Invalid key format: '${key}' (length: ${key.length})`);
        }
        return valid;
      });

    console.log(`[DownloadProcessor] Valid access keys: ${accessKeys.length}`);

    // Obter certificado do S3
    const certUrl = await storageGet(certificate.certificateKey, 3600);
    const certBuffer = await fetch(certUrl.url).then(r => r.arrayBuffer()).then(b => Buffer.from(b));
    const certPem = certBuffer.toString('base64');

    // Processar cada chave
    let successCount = 0;
    let failureCount = 0;
    console.log(`[DownloadProcessor] Starting to process ${accessKeys.length} keys...`);

    for (const accessKey of accessKeys) {
      try {
        console.log(`[DownloadProcessor] ========================================`);
        console.log(`[DownloadProcessor] Processing key: ${accessKey}`);
        console.log(`[DownloadProcessor] ========================================`);
        
        // Usar serviço híbrido (SOAP + Portal API)
        const downloadResult = await downloadNfceXml({
          accessKey,
          certificatePem: certPem,
          certificatePassword: certificate.certificatePassword,
          apiKey: certificate.apiKey,
          environment: 'production',
        });

        console.log(`[DownloadProcessor] Download Result - Success: ${downloadResult.success}`);
        console.log(`[DownloadProcessor] Method: ${downloadResult.method}`);
        console.log(`[DownloadProcessor] Protocol: ${downloadResult.protocolNumber}`);
        console.log(`[DownloadProcessor] Status: ${downloadResult.status}`);
        console.log(`[DownloadProcessor] Has XML: ${!!downloadResult.xmlContent}`);
        
        if (!downloadResult.success || !downloadResult.xmlContent) {
          const statusMsg = downloadResult.status ? ` (Status: ${downloadResult.status})` : '';
          throw new Error(`Download error: ${downloadResult.errorMessage || 'XML not found'}${statusMsg}`);
        }

        const xmlContent = downloadResult.xmlContent;

        // Salvar XML no S3
        const xmlFileName = `downloads/${session.userId}/${sessionId}/${accessKey}.xml`;
        const { key, url } = await storagePut(
          xmlFileName,
          xmlContent,
          "application/xml"
        );

        console.log(`[DownloadProcessor] XML saved to S3: ${key}`);
        console.log(`[DownloadProcessor] XML URL: ${url}`);

        // Registrar sucesso
        await createDownloadRecord({
          id: uuidv4(),
          userId: session.userId,
          csvUploadId: session.csvUploadId,
          certificateId: session.certificateId,
          accessKey,
          status: "success",
          xmlKey: key,
          xmlUrl: url,
          downloadedAt: new Date(),
        });

        successCount++;
        console.log(`[DownloadProcessor] ✅ Successfully processed key: ${accessKey}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[DownloadProcessor] ❌ Error processing key ${accessKey}:`, errorMsg);

        await createDownloadRecord({
          id: uuidv4(),
          userId: session.userId,
          csvUploadId: session.csvUploadId,
          certificateId: session.certificateId,
          accessKey,
          status: "failed",
          errorMessage: errorMsg,
        });

        failureCount++;
      }

      // Atualizar progresso da sessao
      const processed = successCount + failureCount;
      console.log(`[DownloadProcessor] Progress - Processed: ${processed}/${accessKeys.length}`);
      await updateDownloadSession(sessionId, {
        processedKeys: processed,
        successCount,
        failureCount,
      });
    }

    // Marcar sessao como concluida
    console.log(`[DownloadProcessor] ========== SESSION COMPLETED ==========`);
    console.log(`[DownloadProcessor] Session: ${sessionId}`);
    console.log(`[DownloadProcessor] Total Keys: ${accessKeys.length}`);
    console.log(`[DownloadProcessor] Success: ${successCount}`);
    console.log(`[DownloadProcessor] Failures: ${failureCount}`);
    console.log(`[DownloadProcessor] ========================================`);
    await updateDownloadSession(sessionId, {
      status: "completed",
      completedAt: new Date(),
      successCount,
      failureCount,
    });
  } catch (error) {
    console.error("[DownloadProcessor] ========== FATAL ERROR ==========");
    console.error("[DownloadProcessor] Session:", sessionId);
    console.error("[DownloadProcessor] Error:", error);
    if (error instanceof Error) {
      console.error("[DownloadProcessor] Stack:", error.stack);
    }
    console.error("[DownloadProcessor] ======================================");
    
    try {
      await updateDownloadSession(sessionId, {
        status: "failed",
        completedAt: new Date(),
      });
    } catch (updateError) {
      console.error("[DownloadProcessor] Failed to update session:", updateError);
    }
  }
}

/**
 * Processa múltiplas sessões de download
 */
export async function processPendingSessions(): Promise<void> {
  // TODO: Implementar fila de processamento
  // Por enquanto, as sessões são processadas sob demanda
}


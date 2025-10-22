import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { v4 as uuidv4 } from "uuid";
import {
  createDownloadSession,
  getDownloadSessionById,
  updateDownloadSession,
  getUserDownloadSessions,
  createDownloadRecord,
  getUserDownloadHistory,
  getCsvUploadById,
  getCertificateById,
  getDb,
} from "./db";
import { downloadHistory } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { processDownloadSession } from "./downloadProcessor";

export const downloadRouter = router({
  startSession: protectedProcedure
    .input(
      z.object({
        csvUploadId: z.string(),
        certificateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const csvUpload = await getCsvUploadById(input.csvUploadId);
      const cert = await getCertificateById(input.certificateId);

      if (!csvUpload || csvUpload.userId !== ctx.user.id) {
        throw new Error("CSV upload not found");
      }
      if (!cert || cert.userId !== ctx.user.id) {
        throw new Error("Certificate not found");
      }

      // Create download session
      const sessionId = uuidv4();
      const session = await createDownloadSession({
        id: sessionId,
        userId: ctx.user.id,
        csvUploadId: input.csvUploadId,
        certificateId: input.certificateId,
        totalKeys: csvUpload.totalKeys,
        processedKeys: 0,
        successCount: 0,
        failureCount: 0,
        status: "in_progress",
      });

      // Start processing in background (non-blocking)
      // TODO: Implementar fila de processamento (Bull, RabbitMQ, etc)
      console.log(`[DownloadRouter] Starting background processing for session: ${sessionId}`);
      processDownloadSession(sessionId)
        .then(() => {
          console.log(`[DownloadRouter] Background processing completed for session: ${sessionId}`);
        })
        .catch((error) => {
          console.error(`[DownloadRouter] Background processing error for session ${sessionId}:`, error);
          if (error instanceof Error) {
            console.error(`[DownloadRouter] Error stack:`, error.stack);
          }
        });

      return session;
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await getDownloadSessionById(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }
      return session;
    }),

  listSessions: protectedProcedure.query(async ({ ctx }) => {
    return await getUserDownloadSessions(ctx.user.id);
  }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return await getUserDownloadHistory(ctx.user.id);
  }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    
    // Delete all download records for the user
    await db.delete(downloadHistory).where(eq(downloadHistory.userId, ctx.user.id));
    
    return { success: true };
  }),

  debugSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getDownloadSessionById(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      console.log("[DEBUG] Manually triggering processDownloadSession");
      console.log("[DEBUG] Session ID:", input.sessionId);
      
      // Trigger processing manually
      processDownloadSession(input.sessionId)
        .then(() => {
          console.log("[DEBUG] Processing completed successfully");
        })
        .catch((error) => {
          console.error("[DEBUG] Processing failed:", error);
        });

      return { success: true, message: "Processing triggered" };
    }),

  recordDownload: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        accessKey: z.string(),
        status: z.enum(["success", "failed", "not_found"]),
        xmlKey: z.string().optional(),
        xmlUrl: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await getDownloadSessionById(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      // Create download record
      const recordId = uuidv4();
      await createDownloadRecord({
        id: recordId,
        userId: ctx.user.id,
        csvUploadId: session.csvUploadId,
        certificateId: session.certificateId,
        accessKey: input.accessKey,
        status: input.status,
        xmlKey: input.xmlKey,
        xmlUrl: input.xmlUrl,
        errorMessage: input.errorMessage,
        downloadedAt: input.status === "success" ? new Date() : undefined,
      });

      // Update session progress
      const newProcessed = (session.processedKeys ?? 0) + 1;
      const newSuccess =
        input.status === "success"
          ? (session.successCount ?? 0) + 1
          : (session.successCount ?? 0);
      const newFailure =
        input.status !== "success"
          ? (session.failureCount ?? 0) + 1
          : (session.failureCount ?? 0);
      const isComplete = newProcessed >= session.totalKeys;

      await updateDownloadSession(input.sessionId, {
        processedKeys: newProcessed,
        successCount: newSuccess,
        failureCount: newFailure,
        status: isComplete ? "completed" : "in_progress",
        completedAt: isComplete ? new Date() : undefined,
      });

      return { success: true };
    }),

  downloadZip: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getDownloadSessionById(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      // Buscar todos os downloads bem-sucedidos desta sessão
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const downloads = await db
        .select()
        .from(downloadHistory)
        .where(eq(downloadHistory.csvUploadId, input.sessionId));

      const successfulDownloads = downloads.filter(d => d.status === 'success' && d.xmlUrl);

      if (successfulDownloads.length === 0) {
        throw new Error("Nenhum XML encontrado para download");
      }

      // Criar ZIP
      const archiver = (await import('archiver')).default;
      const { storagePut } = await import('./storage');

      console.log('[ZIP] Iniciando criação de ZIP para sessão:', input.sessionId);
      console.log('[ZIP] Número de XMLs:', successfulDownloads.length);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      const chunks: Buffer[] = [];
      
      // Coletar chunks do stream
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Adicionar cada XML ao ZIP
      for (const download of successfulDownloads) {
        try {
          console.log('[ZIP] Baixando XML:', download.accessKey);
          const response = await fetch(download.xmlUrl!);
          if (!response.ok) {
            console.error(`[ZIP] Erro HTTP ${response.status} ao baixar XML ${download.accessKey}`);
            continue;
          }
          const xmlContent = await response.text();
          archive.append(xmlContent, { name: `${download.accessKey}.xml` });
          console.log('[ZIP] XML adicionado ao ZIP:', download.accessKey);
        } catch (error) {
          console.error(`[ZIP] Erro ao baixar XML ${download.accessKey}:`, error);
        }
      }

      console.log('[ZIP] Finalizando arquivo ZIP...');
      archive.finalize();

      // Aguardar finalização do ZIP
      await new Promise((resolve, reject) => {
        archive.on('end', resolve);
        archive.on('error', reject);
      });

      console.log('[ZIP] ZIP finalizado, total de chunks:', chunks.length);

      // Fazer upload do ZIP para o storage
      const zipBuffer = Buffer.concat(chunks);
      console.log('[ZIP] Tamanho do ZIP:', zipBuffer.length, 'bytes');
      
      const zipKey = `downloads/${ctx.user.id}/${input.sessionId}.zip`;
      const { url } = await storagePut(zipKey, zipBuffer, 'application/zip');
      
      console.log('[ZIP] ZIP enviado para storage:', url);

      return {
        success: true,
        zipUrl: url,
        fileCount: successfulDownloads.length,
      };
    }),
});


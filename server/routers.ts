import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { downloadRouter } from "./downloadRouter";
import {
  createCertificate,
  getUserCertificates,
  getCertificateById,
  deleteCertificate,
  createCsvUpload,
  getUserCsvUploads,
  getCsvUploadById,
  deleteCsvUpload,
  updateCsvUploadProgress,
  createDownloadSession,
  getDownloadSessionById,
  updateDownloadSession,
  getUserDownloadSessions,
  createDownloadRecord,
  updateDownloadRecord,
  getUserDownloadHistory,
} from "./db";
import { storagePut, storageGet } from "./storage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ CERTIFICATE MANAGEMENT ============
  certificates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCertificates(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          certificateName: z.string().min(1),
          certificateData: z.string(), // Base64 encoded .pfx/.p12
          certificatePassword: z.string(),
          cnpj: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = uuidv4();
        const fileName = `certificates/${ctx.user.id}/${id}.pfx`;

        // Upload certificate to S3
        const certificateBuffer = Buffer.from(input.certificateData, "base64");
        const { key, url } = await storagePut(fileName, certificateBuffer, "application/octet-stream");

        // Create certificate record
        const cert = await createCertificate({
          id,
          userId: ctx.user.id,
          certificateName: input.certificateName,
          certificateKey: key,
          certificateUrl: url,
          certificatePassword: input.certificatePassword, // TODO: Encrypt this
          cnpj: input.cnpj,
        });

        return cert;
      }),

    updateApiKey: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          apiKey: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Importar função de validação
        const { validateApiKey } = await import('./portalCfeApi');
        
        // Validar apiKey
        const validation = validateApiKey(input.apiKey);
        if (!validation.valid) {
          throw new Error(validation.error || 'ApiKey inválido');
        }
        
        if (!validation.expiresAt) {
          throw new Error('ApiKey não possui data de expiração');
        }
        
        // Importar função de update
        const { updateCertificateApiKey } = await import('./db');
        
        // Atualizar apiKey no banco
        await updateCertificateApiKey(
          input.id,
          ctx.user.id,
          input.apiKey,
          validation.expiresAt
        );
        
        return {
          success: true,
          expiresAt: validation.expiresAt,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCertificate(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ CSV UPLOAD MANAGEMENT ============
  csvUploads: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserCsvUploads(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          csvData: z.string(), // Base64 encoded CSV
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = uuidv4();
        const fileKey = `csv-uploads/${ctx.user.id}/${id}.csv`;

        // Upload CSV to S3
        const csvBuffer = Buffer.from(input.csvData, "base64");
        const { key, url } = await storagePut(fileKey, csvBuffer, "text/csv");

        // Parse CSV to count keys
        const csvContent = csvBuffer.toString("utf-8");
        const lines = csvContent.split("\n").filter(line => line.trim());
        const totalKeys = Math.max(0, lines.length - 1); // Subtract header

        // Create CSV upload record
        const upload = await createCsvUpload({
          id,
          userId: ctx.user.id,
          fileName: input.fileName,
          csvKey: key,
          csvUrl: url,
          totalKeys,
          processedKeys: 0,
        });

        return upload;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const upload = await getCsvUploadById(input.id);
        if (!upload || upload.userId !== ctx.user.id) {
          throw new Error("CSV upload not found");
        }
        return upload;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCsvUpload(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ DOWNLOAD MANAGEMENT ============
  download: downloadRouter,

  // ============ ACCESS CONFIG MANAGEMENT ============
  accessConfig: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { listAccessConfigs } = await import('./accessConfigDb');
      return await listAccessConfigs(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          portalUrl: z.string().url(),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { parsePortalUrl, validateApiKey } = await import('./urlParser');
        const { createAccessConfig, getAccessConfigByCnpj } = await import('./accessConfigDb');

        // Fazer parse da URL
        const parsed = parsePortalUrl(input.portalUrl);
        
        if (!parsed.success) {
          throw new Error(parsed.errorMessage || 'Erro ao processar URL');
        }

        // Validar ApiKey
        const validation = validateApiKey(parsed.apiKey!);
        if (!validation.valid) {
          throw new Error(validation.errorMessage || 'ApiKey inválido');
        }

        // Verificar se já existe configuração para este CNPJ
        const existing = await getAccessConfigByCnpj(ctx.user.id, parsed.cnpj!);
        if (existing) {
          // Atualizar existente
          const { updateAccessConfig } = await import('./accessConfigDb');
          await updateAccessConfig(existing.id, {
            apiKey: parsed.apiKey!,
            apiKeyExpiresAt: validation.expiresAt,
            name: input.name || existing.name,
          });
          return { id: existing.id, updated: true };
        }

        // Criar nova configuração
        const id = uuidv4();
        await createAccessConfig({
          id,
          userId: ctx.user.id,
          name: input.name || `CNPJ ${parsed.cnpj}`,
          cnpj: parsed.cnpj!,
          apiKey: parsed.apiKey!,
          apiKeyExpiresAt: validation.expiresAt,
        });

        return { id, updated: false };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getAccessConfigById, deleteAccessConfig } = await import('./accessConfigDb');
        
        const config = await getAccessConfigById(input.id);
        if (!config || config.userId !== ctx.user.id) {
          throw new Error('Configuração não encontrada');
        }

        await deleteAccessConfig(input.id);
        return { success: true };
      }),
  }),

  // ============ SEARCH BY PERIOD ============
  searchByPeriod: router({
    execute: protectedProcedure
      .input(
        z.object({
          accessConfigId: z.string(),
          dataInicio: z.string(), // YYYY-MM-DD
          dataFim: z.string(), // YYYY-MM-DD
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Buscar configuração de acesso para obter CNPJ e ApiKey
        const { getAccessConfigById } = await import('./accessConfigDb');
        const config = await getAccessConfigById(input.accessConfigId);
        
        if (!config || config.userId !== ctx.user.id) {
          throw new Error('Configuração de acesso não encontrada');
        }

        // Importar serviço de busca
        const { searchAndDownloadByPeriod } = await import('./portalSearchService');

        // Executar busca e download
        const result = await searchAndDownloadByPeriod({
          dataInicio: input.dataInicio,
          dataFim: input.dataFim,
          apiKey: config.apiKey,
          cnpj: config.cnpj,
        });

        if (!result.success) {
          throw new Error(result.errorMessage || 'Erro ao buscar e baixar XMLs');
        }

        // Criar sessão de download
        const sessionId = uuidv4();
        await createDownloadSession({
          id: sessionId,
          userId: ctx.user.id,
          csvUploadId: sessionId, // Usar sessionId como referência (busca por período não tem CSV)
          certificateId: input.accessConfigId,
          totalKeys: result.nfcesFound || 0,
          processedKeys: result.nfcesFound || 0,
          successCount: result.xmlsDownloaded || 0,
          failureCount: (result.errors?.length || 0),
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
        });

        // Salvar XMLs individualmente no storage
        if (result.xmls && result.xmls.length > 0) {
          for (const xml of result.xmls) {
            const xmlFileName = `downloads/${ctx.user.id}/${sessionId}/${xml.chaveAcesso}.xml`;
            const { key, url } = await storagePut(
              xmlFileName,
              xml.xmlContent,
              'application/xml'
            );

            // Registrar download
            await createDownloadRecord({
              id: uuidv4(),
              userId: ctx.user.id,
              csvUploadId: sessionId, // Usar sessionId como referência
              certificateId: input.accessConfigId,
              accessKey: xml.chaveAcesso,
              status: 'success',
              xmlKey: key,
              xmlUrl: url,
              downloadedAt: new Date(),
            });
          }
        }

        // Registrar erros
        if (result.errors && result.errors.length > 0) {
          for (const error of result.errors) {
            await createDownloadRecord({
              id: uuidv4(),
              userId: ctx.user.id,
              csvUploadId: sessionId, // Usar sessionId como referência
              certificateId: input.accessConfigId,
              accessKey: error.chaveAcesso,
              status: 'failed',
              errorMessage: error.error,
            });
          }
        }

        return {
          success: true,
          sessionId,
          nfcesFound: result.nfcesFound,
          xmlsDownloaded: result.xmlsDownloaded,
          errors: result.errors,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;


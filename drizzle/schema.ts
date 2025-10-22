import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Certificados digitais armazenados pelos usuários
 */
export const certificates = mysqlTable("certificates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  certificateName: varchar("certificateName", { length: 255 }).notNull(),
  certificateKey: text("certificateKey").notNull(), // Chave S3 do arquivo .pfx/.p12
  certificateUrl: text("certificateUrl").notNull(), // URL pressinada do S3
  certificatePassword: text("certificatePassword").notNull(), // Senha criptografada
  cnpj: varchar("cnpj", { length: 14 }), // CNPJ do certificado
  apiKey: text("apiKey"), // ApiKey do Portal CFe (JWT token)
  apiKeyExpiresAt: timestamp("apiKeyExpiresAt"), // Data de expiração do apiKey
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Uploads de arquivos CSV com chaves de NFC-e
 */
export const csvUploads = mysqlTable("csvUploads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  csvKey: text("csvKey").notNull(), // Chave S3 do arquivo CSV
  csvUrl: text("csvUrl").notNull(), // URL pressinada do S3
  totalKeys: int("totalKeys").notNull(), // Número total de chaves no CSV
  processedKeys: int("processedKeys").default(0), // Chaves já processadas
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertCsvUpload = typeof csvUploads.$inferInsert;

/**
 * Histórico de downloads de XMLs
 */
export const downloadHistory = mysqlTable("downloadHistory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  csvUploadId: varchar("csvUploadId", { length: 64 }).notNull(),
  certificateId: varchar("certificateId", { length: 64 }).notNull(),
  accessKey: varchar("accessKey", { length: 44 }).notNull(), // Chave de acesso da NFC-e
  status: mysqlEnum("status", ["pending", "success", "failed", "not_found"]).default("pending").notNull(),
  xmlKey: text("xmlKey"), // Chave S3 do XML baixado
  xmlUrl: text("xmlUrl"), // URL pressinada do S3
  errorMessage: text("errorMessage"), // Mensagem de erro se falhar
  downloadedAt: timestamp("downloadedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type InsertDownloadHistory = typeof downloadHistory.$inferInsert;

/**
 * Sessões de download em andamento
 */
export const downloadSessions = mysqlTable("downloadSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  csvUploadId: varchar("csvUploadId", { length: 64 }).notNull(),
  certificateId: varchar("certificateId", { length: 64 }).notNull(),
  totalKeys: int("totalKeys").notNull(),
  processedKeys: int("processedKeys").default(0),
  successCount: int("successCount").default(0),
  failureCount: int("failureCount").default(0),
  status: mysqlEnum("status", ["in_progress", "completed", "failed"]).default("in_progress").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type DownloadSession = typeof downloadSessions.$inferSelect;
export type InsertDownloadSession = typeof downloadSessions.$inferInsert;

/**
 * Configuração de acesso ao portal da SEFAZ-CE
 * Armazena CNPJ e ApiKey extraídos da URL do portal
 */
export const accessConfigs = mysqlTable("accessConfigs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Nome amigável para identificar a configuração
  cnpj: varchar("cnpj", { length: 14 }).notNull(),
  apiKey: text("apiKey").notNull(), // JWT token do portal
  apiKeyExpiresAt: timestamp("apiKeyExpiresAt"), // Data de expiração do apiKey
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type AccessConfig = typeof accessConfigs.$inferSelect;
export type InsertAccessConfig = typeof accessConfigs.$inferInsert;


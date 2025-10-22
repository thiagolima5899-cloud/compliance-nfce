import { getDb } from "./db";
import { accessConfigs, type AccessConfig, type InsertAccessConfig } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Cria uma nova configuração de acesso
 */
export async function createAccessConfig(data: InsertAccessConfig): Promise<AccessConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(accessConfigs).values(data);
  const result = await db.select().from(accessConfigs).where(eq(accessConfigs.id, data.id));
  return result[0];
}

/**
 * Lista todas as configurações de acesso de um usuário
 */
export async function listAccessConfigs(userId: string): Promise<AccessConfig[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(accessConfigs).where(eq(accessConfigs.userId, userId));
}

/**
 * Busca uma configuração de acesso por ID
 */
export async function getAccessConfigById(id: string): Promise<AccessConfig | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(accessConfigs).where(eq(accessConfigs.id, id));
  return result[0];
}

/**
 * Atualiza uma configuração de acesso
 */
export async function updateAccessConfig(
  id: string,
  data: Partial<Omit<AccessConfig, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(accessConfigs).set(data).where(eq(accessConfigs.id, id));
}

/**
 * Deleta uma configuração de acesso
 */
export async function deleteAccessConfig(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(accessConfigs).where(eq(accessConfigs.id, id));
}

/**
 * Busca configuração por CNPJ do usuário
 */
export async function getAccessConfigByCnpj(userId: string, cnpj: string): Promise<AccessConfig | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(accessConfigs)
    .where(and(eq(accessConfigs.userId, userId), eq(accessConfigs.cnpj, cnpj)));
  return result[0];
}


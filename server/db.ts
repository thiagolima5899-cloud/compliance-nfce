import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  certificates, 
  InsertCertificate,
  csvUploads,
  InsertCsvUpload,
  downloadHistory,
  InsertDownloadHistory,
  downloadSessions,
  InsertDownloadSession,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CERTIFICATE FUNCTIONS ============

export async function createCertificate(cert: InsertCertificate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(certificates).values(cert);
  return cert;
}

export async function getUserCertificates(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(certificates).where(eq(certificates.userId, userId));
}

export async function getCertificateById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCertificateApiKey(
  id: string,
  userId: string,
  apiKey: string,
  apiKeyExpiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(certificates)
    .set({ apiKey, apiKeyExpiresAt, updatedAt: new Date() })
    .where(and(eq(certificates.id, id), eq(certificates.userId, userId)));
}

export async function deleteCertificate(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(certificates).where(
    and(eq(certificates.id, id), eq(certificates.userId, userId))
  );
}

// ============ CSV UPLOAD FUNCTIONS ============

export async function createCsvUpload(upload: InsertCsvUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(csvUploads).values(upload);
  return upload;
}

export async function getUserCsvUploads(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(csvUploads).where(eq(csvUploads.userId, userId));
}

export async function getCsvUploadById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(csvUploads).where(eq(csvUploads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteCsvUpload(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const upload = await getCsvUploadById(id);
  if (!upload || upload.userId !== userId) {
    throw new Error("CSV upload not found or unauthorized");
  }

  await db.delete(csvUploads).where(eq(csvUploads.id, id));
}

export async function updateCsvUploadProgress(id: string, processedKeys: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(csvUploads)
    .set({ processedKeys, updatedAt: new Date() })
    .where(eq(csvUploads.id, id));
}

// ============ DOWNLOAD HISTORY FUNCTIONS ============

export async function createDownloadRecord(record: InsertDownloadHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(downloadHistory).values(record);
  return record;
}

export async function updateDownloadRecord(
  id: string,
  updates: Partial<InsertDownloadHistory>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(downloadHistory)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(downloadHistory.id, id));
}

export async function getDownloadHistoryBySession(sessionId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(downloadHistory).where(
    eq(downloadHistory.id, sessionId)
  );
}

export async function getUserDownloadHistory(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(downloadHistory).where(
    eq(downloadHistory.userId, userId)
  );
}

// ============ DOWNLOAD SESSION FUNCTIONS ============

export async function createDownloadSession(session: InsertDownloadSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(downloadSessions).values(session);
  return session;
}

export async function getDownloadSessionById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(downloadSessions).where(
    eq(downloadSessions.id, id)
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDownloadSession(
  id: string,
  updates: Partial<InsertDownloadSession>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(downloadSessions)
    .set(updates)
    .where(eq(downloadSessions.id, id));
}

export async function getUserDownloadSessions(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(downloadSessions).where(
    eq(downloadSessions.userId, userId)
  );
}


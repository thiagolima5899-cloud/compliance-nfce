import { consultaProtocoloNFCe } from "./server/sefaz";
import { getDb } from "./server/db";
import { certificates } from "./drizzle/schema";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

async function test() {
  console.log("=== TESTE COMPLETO DE INTEGRAÇÃO ===\n");
  
  // 1. Buscar certificado do banco
  console.log("1. Buscando certificado...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Banco não disponível");
    return;
  }
  
  const certs = await db.select().from(certificates).limit(1);
  if (!certs || certs.length === 0) {
    console.error("❌ Nenhum certificado encontrado");
    return;
  }
  
  const cert = certs[0];
  console.log(`✓ Certificado: ${cert.certificateName}`);
  
  // 2. Baixar PFX do S3
  console.log("\n2. Baixando PFX do S3...");
  const s3 = new S3Client({ region: "us-east-1" });
  const s3Key = cert.s3Key;
  const bucket = process.env.S3_BUCKET || "manus-webdev-user-uploads";
  
  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: s3Key })
  );
  
  const pfxBuffer = await response.Body?.transformToByteArray();
  if (!pfxBuffer) {
    console.error("❌ Erro ao baixar PFX");
    return;
  }
  
  const pfxBase64 = Buffer.from(pfxBuffer).toString("base64");
  console.log(`✓ PFX baixado: ${pfxBuffer.length} bytes`);
  
  // 3. Testar consulta
  console.log("\n3. Consultando SEFAZ...");
  const chave = "23250934880879000125592300727510326146389917";
  
  try {
    const result = await consultaProtocoloNFCe({
      accessKey: chave,
      nfCertificatePem: pfxBase64,
      nfCertificatePassword: cert.certificatePassword || "",
      tpAmb: "1",
    });
    
    console.log("\n✅ SUCESSO!");
    console.log("Status:", result.cStat);
    console.log("Motivo:", result.xMotivo);
    
    if (result.xmlContent) {
      console.log("\n📄 XML Retornado:");
      console.log(result.xmlContent.substring(0, 500) + "...");
    }
  } catch (error: any) {
    console.log("\n❌ ERRO:", error.message);
  }
}

test().catch(console.error);

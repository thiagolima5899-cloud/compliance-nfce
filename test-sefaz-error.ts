import { consultaProtocoloNFCe } from "./server/sefaz";
import { getCertificateById } from "./server/db";
import { storageGet } from "./server/storage";
import fs from "fs";

async function testSefazError() {
  console.log("=== Teste de Erro SEFAZ ===\n");
  
  // Usar o certificado mais recente
  const certId = "5df4790d8-5988-44e7-8a4b-7bfee2c9f0a5";
  const cert = await getCertificateById(certId);
  
  if (!cert) {
    console.error("Certificado não encontrado");
    return;
  }
  
  console.log("Certificado encontrado:", cert.name);
  console.log("CNPJ:", cert.cnpj);
  
  // Baixar certificado do S3
  const { url: certUrl } = await storageGet(cert.pfxKey);
  const certResponse = await fetch(certUrl);
  const certBuffer = Buffer.from(await certResponse.arrayBuffer());
  const certBase64 = certBuffer.toString('base64');
  
  console.log("Certificado baixado do S3");
  
  // Testar com uma chave real
  const testKey = "23250934880879000125592300727510326117505041";
  
  console.log("\nTestando chave:", testKey);
  console.log("Ambiente: produção (tpAmb=1)");
  
  try {
    const result = await consultaProtocoloNFCe({
      accessKey: testKey,
      nfCertificatePem: certBase64,
      nfCertificatePassword: cert.password || "",
      environment: "production",
    });
    
    console.log("\n✅ Sucesso!");
    console.log("Status:", result.status);
    console.log("Protocolo:", result.protocolNumber);
    console.log("XML encontrado:", result.xmlContent ? "SIM" : "NÃO");
    
  } catch (error: any) {
    console.error("\n❌ Erro:", error.message);
    
    if (error.response) {
      console.error("\nDetalhes do erro HTTP:");
      console.error("Status:", error.response.status);
      console.error("Headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("\nCorpo da resposta:");
      console.error(error.response.data);
    }
  }
}

testSefazError().catch(console.error);


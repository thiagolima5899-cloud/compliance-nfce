import { consultarProtocolo } from "./server/sefaz";

async function test() {
  console.log("=== TESTE SIMPLES DE CONSULTA SEFAZ ===\n");
  
  const chave = "23250934880879000125592300727510326146389917";
  
  try {
    const result = await consultarProtocolo({
      accessKey: chave,
      nfCertificatePem: "", // Vazio para testar sem certificado primeiro
      nfCertificatePassword: "",
      tpAmb: "1",
    });
    
    console.log("✅ SUCESSO!");
    console.log("Resultado:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log("❌ ERRO:", error.message);
    if (error.response) {
      console.log("Resposta:", error.response);
    }
  }
}

test().catch(console.error);

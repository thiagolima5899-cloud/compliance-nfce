/**
 * Script de diagnóstico detalhado para o problema de certificado mTLS
 */

import https from "https";
import { convertPfxToPem } from "./server/sefaz";
import { getCertificateById, getCsvUploadById } from "./server/db";
import { storageGet } from "./server/storage";

async function testCertificateDebug() {
  console.log("========================================");
  console.log("DIAGNÓSTICO DETALHADO - CERTIFICADO mTLS");
  console.log("========================================\n");

  try {
    // Buscar certificado do banco de dados
    console.log("1. Buscando certificado no banco de dados...");
    
    // Buscar pelo userId do usuário logado (Marcos Lima)
    const db = await import("./server/db").then(m => m.getDb());
    if (!db) {
      console.error("❌ Banco de dados não disponível!");
      process.exit(1);
    }
    
    const { certificates: certsTable } = await import("./drizzle/schema");
    const allCerts = await db.select().from(certsTable).limit(1);
    
    if (!allCerts || allCerts.length === 0) {
      console.error("❌ Nenhum certificado encontrado no banco!");
      process.exit(1);
    }
    
    const certificates = allCerts[0];
    
    console.log(`✓ Certificado encontrado: ${certificates.certificateName}`);
    console.log(`  ID: ${certificates.id}`);
    console.log(`  Senha definida: ${!!certificates.certificatePassword}\n`);

    // Baixar certificado do S3
    console.log("2. Baixando certificado do S3...");
    const certUrl = await storageGet(certificates.certificateKey, 3600);
    const certBuffer = await fetch(certUrl.url)
      .then(r => r.arrayBuffer())
      .then(b => Buffer.from(b));
    
    console.log(`✓ Certificado baixado: ${certBuffer.length} bytes\n`);

    // Converter PFX para PEM
    console.log("3. Convertendo PFX para PEM...");
    const { cert, key, ca } = await convertPfxToPem(
      certBuffer,
      certificates.certificatePassword
    );
    
    console.log(`✓ Conversão concluída!`);
    console.log(`  Certificado PEM: ${cert.length} bytes`);
    console.log(`  Chave privada PEM: ${key.length} bytes`);
    console.log(`  CA chain: ${ca.length} certificados\n`);

    // Mostrar primeiros caracteres
    console.log("4. Validando formato PEM...");
    console.log(`  Certificado começa com: ${cert.substring(0, 50)}`);
    console.log(`  Chave privada começa com: ${key.substring(0, 50)}`);
    
    if (!cert.includes("-----BEGIN CERTIFICATE-----")) {
      console.error("❌ Certificado não está em formato PEM válido!");
      process.exit(1);
    }
    
    if (!key.includes("-----BEGIN") || !key.includes("PRIVATE KEY-----")) {
      console.error("❌ Chave privada não está em formato PEM válido!");
      process.exit(1);
    }
    
    console.log(`✓ Formato PEM válido!\n`);

    // Testar conexão HTTPS com SEFAZ-CE
    console.log("5. Testando conexão HTTPS com SEFAZ-CE...");
    const testUrl = "https://nfce.sefaz.ce.gov.br/nfce/services/NFeConsultaProtocolo4";
    const url = new URL(testUrl);
    
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsulta4">
      <consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <tpAmb>1</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>23250934880879000125592300727510326151565590</chNFe>
      </consSitNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    console.log(`  URL: ${testUrl}`);
    console.log(`  Hostname: ${url.hostname}`);
    console.log(`  Port: ${url.port || 443}`);
    console.log(`  Path: ${url.pathname}\n`);

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapBody),
        'SOAPAction': '',
      },
      cert: cert,
      key: key,
      ca: ca.length > 0 ? ca : undefined,
      rejectUnauthorized: false,
    };

    console.log("6. Opções HTTPS configuradas:");
    console.log(`  - cert presente: ${!!options.cert}`);
    console.log(`  - key presente: ${!!options.key}`);
    console.log(`  - ca presente: ${!!options.ca}`);
    console.log(`  - rejectUnauthorized: ${options.rejectUnauthorized}\n`);

    console.log("7. Enviando requisição SOAP...\n");

    const responseData = await new Promise<string>((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`✓ Resposta recebida!`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Headers:`, JSON.stringify(res.headers, null, 2));
        
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`\n  Tamanho da resposta: ${data.length} bytes`);
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        console.error(`\n❌ Erro na requisição HTTPS:`);
        console.error(`  Mensagem: ${error.message}`);
        console.error(`  Código: ${(error as any).code}`);
        console.error(`  Stack:`, error.stack);
        reject(error);
      });
      
      req.on('socket', (socket) => {
        console.log(`  Socket criado`);
        
        socket.on('secureConnect', () => {
          console.log(`  ✓ TLS handshake concluído com sucesso!`);
          console.log(`  Protocolo: ${(socket as any).getProtocol()}`);
          console.log(`  Cipher: ${JSON.stringify((socket as any).getCipher())}`);
        });
        
        socket.on('error', (err) => {
          console.error(`  ❌ Erro no socket: ${err.message}`);
        });
      });
      
      req.write(soapBody);
      req.end();
    });

    console.log("\n8. Analisando resposta SOAP...");
    console.log(`  Primeiros 500 caracteres:`);
    console.log(responseData.substring(0, 500));
    
    // Verificar se há erro na resposta
    if (responseData.includes("<cStat>")) {
      const match = responseData.match(/<cStat>(.*?)<\/cStat>/);
      const status = match ? match[1] : "desconhecido";
      console.log(`\n  Status SEFAZ: ${status}`);
    }

    console.log("\n========================================");
    console.log("✓ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("========================================\n");

  } catch (error) {
    console.error("\n========================================");
    console.error("❌ TESTE FALHOU!");
    console.error("========================================");
    console.error(error);
    process.exit(1);
  }
}

testCertificateDebug();


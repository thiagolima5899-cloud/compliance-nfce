import { downloadXmlFromPortal, validateApiKey } from './server/portalCfeApi';
import fs from 'fs';

async function testPortalDownload() {
  console.log('=== Teste de Download via API do Portal CFe ===\n');

  // ApiKey válido
  const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5NDAyOSwiZXhwIjoxNzYxMTgwNDI5LCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.un9h5pd_l-xw1nWIN28jDeLt9Y16FfjC5r5jSDox4MY';

  // Valida apiKey
  console.log('1. Validando ApiKey...');
  const validation = validateApiKey(apiKey);
  console.log('   Válido:', validation.valid);
  if (validation.expiresAt) {
    console.log('   Expira em:', validation.expiresAt.toLocaleString('pt-BR'));
  }
  if (validation.error) {
    console.log('   Erro:', validation.error);
  }

  if (!validation.valid) {
    console.log('\n❌ ApiKey inválido ou expirado. Forneça um apiKey válido.');
    return;
  }

  console.log('\n2. Testando download de XML...');
  
  // Dados de exemplo (do link que você forneceu)
  const result = await downloadXmlFromPortal({
    protocolo: '223250158063531',
    chaveAcesso: '23251034880879000125650010000152571722108538',
    apiKey: apiKey,
  });

  console.log('\n=== Resultado ===');
  console.log('Success:', result.success);
  console.log('Status Code:', result.statusCode);
  
  if (result.success && result.xmlContent) {
    console.log('XML Length:', result.xmlContent.length, 'bytes');
    console.log('XML Preview:', result.xmlContent.substring(0, 200) + '...');
    
    // Salva XML em arquivo
    fs.writeFileSync('/home/ubuntu/teste-download.xml', result.xmlContent);
    console.log('\n✅ XML salvo em /home/ubuntu/teste-download.xml');
  } else {
    console.log('❌ Erro:', result.errorMessage);
  }
}

testPortalDownload();


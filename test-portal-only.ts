import { downloadXmlFromPortal, validateApiKey } from './server/portalCfeApi';
import fs from 'fs';

async function testPortalOnly() {
  console.log('========================================');
  console.log('TESTE DE DOWNLOAD VIA PORTAL API');
  console.log('========================================\n');

  // ApiKey válido (pode estar expirado, ajuste conforme necessário)
  const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5NDAyOSwiZXhwIjoxNzYxMTgwNDI5LCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.un9h5pd_l-xw1nWIN28jDeLt9Y16FfjC5r5jSDox4MY';

  console.log('1️⃣ Validando ApiKey...');
  const validation = validateApiKey(apiKey);
  
  console.log('   ✓ Válido:', validation.valid);
  if (validation.expiresAt) {
    console.log('   ✓ Expira em:', validation.expiresAt.toLocaleString('pt-BR'));
    
    const now = new Date();
    const diffMs = validation.expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMs < 0) {
      console.log('   ⚠️ ATENÇÃO: ApiKey EXPIRADO!');
      console.log('   ℹ️ Por favor, obtenha um novo apiKey do portal SEFAZ-CE');
      return;
    } else {
      console.log('   ✓ Tempo restante:', diffHours, 'horas');
    }
  }
  if (validation.error) {
    console.log('   ✗ Erro:', validation.error);
    return;
  }

  console.log('\n2️⃣ Testando download de XML via Portal API...');
  
  // Dados de exemplo (protocolo e chave conhecidos)
  const result = await downloadXmlFromPortal({
    protocolo: '223250158063531',
    chaveAcesso: '23251034880879000125650010000152571722108538',
    apiKey: apiKey,
  });

  console.log('\n========================================');
  console.log('RESULTADO DO TESTE');
  console.log('========================================\n');

  console.log('✅ Sucesso:', result.success);
  console.log('📊 Status HTTP:', result.statusCode);
  
  if (result.success && result.xmlContent) {
    console.log('📏 Tamanho do XML:', result.xmlContent.length, 'bytes');
    console.log('\n📄 Preview do XML (primeiros 300 chars):');
    console.log(result.xmlContent.substring(0, 300) + '...');
    
    // Salvar XML em arquivo
    const outputPath = '/home/ubuntu/teste-portal-only.xml';
    fs.writeFileSync(outputPath, result.xmlContent);
    console.log('\n💾 XML salvo em:', outputPath);
    
    console.log('\n========================================');
    console.log('✅ TESTE PASSOU - Portal API funcionando!');
    console.log('========================================\n');
  } else {
    console.log('❌ Erro:', result.errorMessage);
    console.log('\n========================================');
    console.log('❌ TESTE FALHOU - Verificar erro acima');
    console.log('========================================\n');
  }
}

testPortalOnly();


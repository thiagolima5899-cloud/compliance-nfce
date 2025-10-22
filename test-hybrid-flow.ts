import { downloadNfceXml } from './server/nfceDownloadService';
import fs from 'fs';

async function testHybridFlow() {
  console.log('========================================');
  console.log('TESTE DE FLUXO HÍBRIDO NFC-e');
  console.log('========================================\n');

  // Dados de teste
  const accessKey = '23251034880879000125650010000152571722108538';
  const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5NDAyOSwiZXhwIjoxNzYxMTgwNDI5LCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.un9h5pd_l-xw1nWIN28jDeLt9Y16FfjC5r5jSDox4MY';
  
  // Certificado de teste (você precisará fornecer um certificado válido)
  const certPath = '/home/ubuntu/upload/certificado.pfx';
  
  if (!fs.existsSync(certPath)) {
    console.error('❌ Certificado não encontrado em:', certPath);
    console.log('\nPor favor, faça upload de um certificado válido para testar.');
    return;
  }

  const certBuffer = fs.readFileSync(certPath);
  const certPem = certBuffer.toString('base64');
  const certPassword = 'senha_do_certificado'; // Ajuste conforme necessário

  console.log('📋 Dados do teste:');
  console.log('  - Chave de acesso:', accessKey);
  console.log('  - Certificado:', certPath);
  console.log('  - ApiKey (primeiros 50 chars):', apiKey.substring(0, 50) + '...');
  console.log('  - Ambiente: production\n');

  console.log('🚀 Iniciando download híbrido...\n');

  try {
    const result = await downloadNfceXml({
      accessKey,
      certificatePem: certPem,
      certificatePassword: certPassword,
      apiKey,
      environment: 'production',
    });

    console.log('\n========================================');
    console.log('RESULTADO DO TESTE');
    console.log('========================================\n');

    console.log('✅ Sucesso:', result.success);
    console.log('📊 Método usado:', result.method);
    console.log('🔢 Número do protocolo:', result.protocolNumber);
    console.log('📄 Status SEFAZ:', result.status);
    console.log('📦 XML obtido:', result.xmlContent ? 'SIM' : 'NÃO');

    if (result.xmlContent) {
      console.log('📏 Tamanho do XML:', result.xmlContent.length, 'bytes');
      console.log('\n📄 Preview do XML (primeiros 500 chars):');
      console.log(result.xmlContent.substring(0, 500) + '...');

      // Salvar XML em arquivo
      const outputPath = '/home/ubuntu/teste-hybrid-flow.xml';
      fs.writeFileSync(outputPath, result.xmlContent);
      console.log('\n💾 XML salvo em:', outputPath);
    }

    if (result.errorMessage) {
      console.log('❌ Erro:', result.errorMessage);
    }

    console.log('\n========================================');
    
    if (result.success && result.xmlContent) {
      console.log('✅ TESTE PASSOU - Fluxo híbrido funcionando!');
    } else {
      console.log('❌ TESTE FALHOU - Verificar logs acima');
    }
    
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ ERRO NO TESTE');
    console.error('========================================\n');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n========================================\n');
  }
}

// Executar teste
testHybridFlow();


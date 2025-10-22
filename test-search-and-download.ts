import { searchAndDownloadByPeriod } from './server/portalSearchService';
import fs from 'fs';
import path from 'path';

async function testSearchAndDownload() {
  console.log('========================================');
  console.log('TESTE DE BUSCA E DOWNLOAD POR PERÍODO');
  console.log('========================================\n');

  // Dados de teste
  const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5NzA3MSwiZXhwIjoxNzYxMTgzNDcxLCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.i_VloBtleWhgbmp_IWI0KL3HVFKFQojQL0yyAO36n6k';
  const cnpj = '34880879000125';
  
  console.log('📋 Dados do teste:');
  console.log('  - CNPJ:', cnpj);
  console.log('  - Período: 01/10/2025 a 02/10/2025 (limitado para teste)');
  console.log('  - ApiKey (primeiros 50 chars):', apiKey.substring(0, 50) + '...\n');

  console.log('🚀 Iniciando busca e download...\n');

  try {
    const result = await searchAndDownloadByPeriod({
      dataInicio: '2025-10-01',
      dataFim: '2025-10-02', // Período curto para teste
      apiKey,
      cnpj,
      count: 10, // Limitar a 10 para teste
    });

    console.log('\n========================================');
    console.log('RESULTADO DO TESTE');
    console.log('========================================\n');

    console.log('✅ Sucesso:', result.success);
    console.log('🔍 NFC-es encontradas:', result.nfcesFound);
    console.log('📥 XMLs baixados:', result.xmlsDownloaded);
    console.log('❌ Erros:', result.errors?.length || 0);

    if (result.xmls && result.xmls.length > 0) {
      console.log('\n📄 XMLs baixados com sucesso:');
      
      // Criar diretório para salvar XMLs de teste
      const testDir = path.join(__dirname, 'test-xmls');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      result.xmls.forEach((xml, index) => {
        console.log(`  ${index + 1}. ${xml.chaveAcesso}`);
        console.log(`     Tamanho: ${xml.xmlContent.length} bytes`);
        
        // Salvar XML para verificação
        const xmlPath = path.join(testDir, `${xml.chaveAcesso}.xml`);
        fs.writeFileSync(xmlPath, xml.xmlContent, 'utf-8');
        console.log(`     Salvo em: ${xmlPath}`);
      });

      console.log('\n========================================');
      console.log('✅ TESTE PASSOU - Busca e download funcionando!');
      console.log('========================================\n');
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.chaveAcesso}`);
        console.log(`     Erro: ${error.error}`);
      });
    }

    if (result.errorMessage) {
      console.log('❌ Erro geral:', result.errorMessage);
      console.log('\n========================================');
      console.log('❌ TESTE FALHOU - Verificar erro acima');
      console.log('========================================\n');
    }

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ ERRO NO TESTE');
    console.error('========================================\n');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n========================================\n');
  }
}

testSearchAndDownload();


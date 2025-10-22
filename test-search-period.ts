import { searchNfceByPeriod } from './server/portalSearchService';

async function testSearchByPeriod() {
  console.log('========================================');
  console.log('TESTE DE BUSCA POR PERÍODO');
  console.log('========================================\n');

  // Dados de teste
  const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5NzA3MSwiZXhwIjoxNzYxMTgzNDcxLCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.i_VloBtleWhgbmp_IWI0KL3HVFKFQojQL0yyAO36n6k';
  const cnpj = '34880879000125';
  
  console.log('📋 Dados do teste:');
  console.log('  - CNPJ:', cnpj);
  console.log('  - Período: 01/10/2025 a 10/10/2025');
  console.log('  - ApiKey (primeiros 50 chars):', apiKey.substring(0, 50) + '...\n');

  console.log('🚀 Iniciando busca...\n');

  try {
    const result = await searchNfceByPeriod({
      dataInicio: '2025-10-01',
      dataFim: '2025-10-10',
      apiKey,
      cnpj,
      count: 100,
    });

    console.log('\n========================================');
    console.log('RESULTADO DO TESTE');
    console.log('========================================\n');

    console.log('✅ Sucesso:', result.success);
    console.log('📊 Status HTTP:', result.statusCode);
    console.log('📦 Total encontrado:', result.totalFound);
    console.log('📋 NFC-es retornadas:', result.nfces?.length || 0);

    if (result.success && result.nfces && result.nfces.length > 0) {
      console.log('\n📄 Primeiras 5 NFC-es encontradas:');
      result.nfces.slice(0, 5).forEach((nfce, index) => {
        console.log(`\n  ${index + 1}. Chave: ${nfce.chaveAcesso}`);
        console.log(`     Data: ${nfce.dataEmissao}`);
        console.log(`     Doc: ${nfce.numeroDocFiscal} / Série: ${nfce.numSerieNfce}`);
      });

      console.log('\n========================================');
      console.log('✅ TESTE PASSOU - Busca funcionando!');
      console.log('========================================\n');
    } else if (result.errorMessage) {
      console.log('❌ Erro:', result.errorMessage);
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

testSearchByPeriod();


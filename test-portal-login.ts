import { SefazPortalAutomation } from './server/sefazPortalAutomation';

async function testLogin() {
  const automation = new SefazPortalAutomation();

  try {
    console.log('=== Teste de Login no Portal CFe ===\n');

    // Inicializa browser
    await automation.init();

    // Faz login
    const result = await automation.login({
      cpf: '60054541379',
      senha: 'CGE@3232',
      tipoVinculo: '3', // CONTADOR
    });

    console.log('\n=== Resultado do Login ===');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('ApiKey:', result.apiKey?.substring(0, 50) + '...');
      console.log('CNPJ:', result.cnpj);
      console.log('Expira em:', result.expiresAt);
      
      // Salva apiKey em arquivo para uso posterior
      const fs = require('fs');
      fs.writeFileSync(
        '/home/ubuntu/apikey.txt',
        JSON.stringify({
          apiKey: result.apiKey,
          cnpj: result.cnpj,
          expiresAt: result.expiresAt,
          obtainedAt: new Date().toISOString(),
        }, null, 2)
      );
      console.log('\n✅ ApiKey salvo em /home/ubuntu/apikey.txt');
    } else {
      console.error('❌ Erro:', result.error);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    // Fecha browser
    await automation.close();
  }
}

testLogin();


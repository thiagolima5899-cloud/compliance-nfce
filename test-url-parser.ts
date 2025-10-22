import { parsePortalUrl, validateApiKey } from './server/urlParser';

const testUrl = 'https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/223250158063531?chaveAcesso=23251034880879000125650010000152571722108538&apiKey=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzNDg4MDg3OTAwMDEyNSIsImlhdCI6MTc2MTA5ODYwMywiZXhwIjoxNzYxMTg1MDAzLCIzNDg4MDg3OTAwMDEyNSI6IkNPTlRSSUJVSU5URSJ9.oO0BwPbapH7dvp8OkzfYfL4WHvga_PLmHoPu8JdhHYY';

console.log('========================================');
console.log('TESTE DE PARSER DE URL');
console.log('========================================\n');

console.log('URL de teste:');
console.log(testUrl);
console.log('');

const result = parsePortalUrl(testUrl);

console.log('========================================');
console.log('RESULTADO');
console.log('========================================\n');

console.log('Sucesso:', result.success);
console.log('CNPJ:', result.cnpj);
console.log('ApiKey (primeiros 50 chars):', result.apiKey?.substring(0, 50) + '...');

if (result.errorMessage) {
  console.log('Erro:', result.errorMessage);
}

if (result.apiKey) {
  console.log('\n========================================');
  console.log('VALIDAÇÃO DA APIKEY');
  console.log('========================================\n');

  const validation = validateApiKey(result.apiKey);
  console.log('Válido:', validation.valid);
  console.log('Expira em:', validation.expiresAt);
  
  if (validation.expiresAt) {
    const now = new Date();
    const hoursRemaining = (validation.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    console.log('Horas restantes:', hoursRemaining.toFixed(2));
  }

  if (validation.errorMessage) {
    console.log('Erro:', validation.errorMessage);
  }
}

console.log('\n========================================');
console.log(result.success ? '✅ TESTE PASSOU' : '❌ TESTE FALHOU');
console.log('========================================\n');


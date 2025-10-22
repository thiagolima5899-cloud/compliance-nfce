/**
 * Página de Configuração Simplificada
 * Permite colar URL do portal para extrair ApiKey e CNPJ
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { parsePortalUrl, formatCNPJ, getTimeUntilExpiration } from '../services/urlParser';
import { saveAccessConfig, getAccessConfig, clearAccessConfig } from '../storage/localStorage';

export default function ConfigSimple() {
  const navigate = useNavigate();
  const [portalUrl, setPortalUrl] = useState('');
  const [configName, setConfigName] = useState('Minha Configuração');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Carregar configuração existente
  const existingConfig = getAccessConfig();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // Validar URL
      if (!portalUrl.trim()) {
        throw new Error('Cole a URL do portal da SEFAZ-CE');
      }
      
      // Extrair ApiKey e CNPJ
      const { apiKey, cnpj, expiresAt } = parsePortalUrl(portalUrl);
      
      // Salvar no LocalStorage
      saveAccessConfig({
        name: configName || 'Minha Configuração',
        cnpj,
        apiKey,
        apiKeyExpiresAt: expiresAt.toISOString(),
      });
      
      setSuccess(`✅ Configuração salva! CNPJ: ${formatCNPJ(cnpj)}`);
      
      // Redirecionar para página de download após 2 segundos
      setTimeout(() => {
        navigate('/download-simple');
      }, 2000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar URL';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClear = () => {
    if (confirm('Tem certeza que deseja remover a configuração?')) {
      clearAccessConfig();
      setSuccess('Configuração removida');
      setPortalUrl('');
      setConfigName('Minha Configuração');
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuração de Acesso</h1>
        <p className="text-muted-foreground mt-2">
          Cole a URL do portal da SEFAZ-CE para configurar o acesso
        </p>
      </div>
      
      {/* Configuração Existente */}
      {existingConfig && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Configuração Ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Nome:</span> {existingConfig.name}
              </div>
              <div>
                <span className="font-semibold">CNPJ:</span> {formatCNPJ(existingConfig.cnpj)}
              </div>
              <div>
                <span className="font-semibold">Expira em:</span>{' '}
                {getTimeUntilExpiration(new Date(existingConfig.apiKeyExpiresAt))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate('/download-simple')} variant="default">
                Ir para Download
              </Button>
              <Button onClick={handleClear} variant="outline">
                Remover Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulário de Nova Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>
            {existingConfig ? 'Atualizar Configuração' : 'Nova Configuração'}
          </CardTitle>
          <CardDescription>
            Siga os passos abaixo para configurar o acesso ao portal da SEFAZ-CE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instruções */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Como obter a URL:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse o portal: <a href="https://cfe.sefaz.ce.gov.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://cfe.sefaz.ce.gov.br</a></li>
                    <li>Faça login com seu CPF e senha</li>
                    <li>Vá em "Consulta NFC-e" e busque por qualquer período</li>
                    <li>Clique em qualquer NFC-e para visualizar</li>
                    <li>Copie a URL completa da barra de endereço</li>
                    <li>Cole abaixo</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
            
            {/* Nome da Configuração */}
            <div className="space-y-2">
              <Label htmlFor="configName">Nome da Configuração (opcional)</Label>
              <Input
                id="configName"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Ex: Empresa XPTO"
              />
            </div>
            
            {/* URL do Portal */}
            <div className="space-y-2">
              <Label htmlFor="portalUrl">URL do Portal da SEFAZ-CE *</Label>
              <Input
                id="portalUrl"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/..."
                required
              />
              <p className="text-sm text-muted-foreground">
                Cole a URL completa que aparece na barra de endereço do navegador
              </p>
            </div>
            
            {/* Mensagens */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}
            
            {/* Botões */}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processando...' : 'Salvar Configuração'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Voltar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


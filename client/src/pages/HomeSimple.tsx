/**
 * Página Inicial Simplificada
 * Apenas 2 opções: Configurar e Baixar
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { getAccessConfig, hasValidConfig } from '../storage/localStorage';
import { formatCNPJ, getTimeUntilExpiration } from '../services/urlParser';

export default function HomeSimple() {
  const navigate = useNavigate();
  const config = getAccessConfig();
  const isConfigured = hasValidConfig();
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">NFC-e Downloader</h1>
        <p className="text-xl text-muted-foreground">
          Baixe XMLs de NFC-e do portal da SEFAZ-CE de forma simples e rápida
        </p>
      </div>
      
      {/* Status da Configuração */}
      {isConfigured && config ? (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-green-700">✅ Sistema Configurado</p>
                <p className="text-sm">
                  CNPJ: {formatCNPJ(config.cnpj)} | 
                  Expira em: {getTimeUntilExpiration(new Date(config.apiKeyExpiresAt))}
                </p>
              </div>
              <Button onClick={() => navigate('/download-simple')} size="sm">
                Ir para Download
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-yellow-700">⚠️ Sistema Não Configurado</p>
                <p className="text-sm">Configure o acesso ao portal para começar a baixar XMLs</p>
              </div>
              <Button onClick={() => navigate('/config-simple')} size="sm">
                Configurar Agora
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Cards de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Card de Configuração */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              Configuração
            </CardTitle>
            <CardDescription>
              Configure o acesso ao portal da SEFAZ-CE
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cole a URL do portal para extrair automaticamente o ApiKey e CNPJ.
              A configuração é salva localmente no seu navegador.
            </p>
            <Button onClick={() => navigate('/config-simple')} className="w-full">
              {isConfigured ? 'Atualizar Configuração' : 'Configurar Agora'}
            </Button>
          </CardContent>
        </Card>
        
        {/* Card de Download */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📥</span>
              Download de XMLs
            </CardTitle>
            <CardDescription>
              Busque e baixe XMLs de NFC-e por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Informe o período (data início e fim) e o sistema buscará automaticamente
              todas as NFC-es e baixará os XMLs em um arquivo ZIP.
            </p>
            <Button 
              onClick={() => navigate('/download-simple')} 
              className="w-full"
              disabled={!isConfigured}
            >
              {isConfigured ? 'Baixar XMLs' : 'Configure Primeiro'}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Como Usar */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Configure o Acesso</h3>
                <p className="text-sm text-muted-foreground">
                  Faça login no portal da SEFAZ-CE, abra qualquer NFC-e e copie a URL completa.
                  Cole na página de Configuração.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Informe o Período</h3>
                <p className="text-sm text-muted-foreground">
                  Na página de Download, informe a data de início e fim do período que deseja buscar.
                  Recomendamos períodos de até 7 dias para melhor performance.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Baixe o ZIP</h3>
                <p className="text-sm text-muted-foreground">
                  Clique em "Buscar e Baixar XMLs". O sistema buscará todas as NFC-es do período,
                  baixará os XMLs e gerará automaticamente um arquivo ZIP para download.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Informações Adicionais */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>
          ℹ️ Os dados são armazenados localmente no seu navegador. 
          Nenhuma informação é enviada para servidores externos.
        </p>
        <p className="mt-2">
          🔒 Seus XMLs são baixados diretamente do portal da SEFAZ-CE e 
          salvos apenas no seu computador.
        </p>
      </div>
    </div>
  );
}


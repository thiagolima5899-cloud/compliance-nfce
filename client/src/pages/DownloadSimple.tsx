/**
 * Página de Download Simplificada
 * Busca NFC-es por período e baixa ZIP automaticamente
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { getAccessConfig } from '../storage/localStorage';
import { searchAndDownloadXMLs, type DownloadProgress } from '../services/portalApi';
import { generateAndDownloadZip, generateFileName, estimateZipSize } from '../services/zipGenerator';
import { formatCNPJ } from '../services/urlParser';

export default function DownloadSimple() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const config = getAccessConfig();
  
  // Redirecionar para config se não tiver configuração
  if (!config) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>
            Você precisa configurar o acesso primeiro.
            <Button onClick={() => navigate('/config-simple')} className="ml-4">
              Ir para Configuração
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setProgress(null);
    
    try {
      // Validar datas
      if (!startDate || !endDate) {
        throw new Error('Informe as datas de início e fim');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new Error('Data de início deve ser anterior à data de fim');
      }
      
      // Verificar se período não é muito grande (máximo 31 dias)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 31) {
        throw new Error('Período máximo: 31 dias. Divida em períodos menores.');
      }
      
      console.log('[Download] Iniciando busca e download...', { startDate, endDate });
      
      // Buscar e baixar XMLs
      const xmls = await searchAndDownloadXMLs(
        config.cnpj,
        config.apiKey,
        startDate,
        endDate,
        (prog) => setProgress(prog)
      );
      
      if (xmls.length === 0) {
        setError('Nenhuma NFC-e encontrada no período informado');
        return;
      }
      
      console.log(`[Download] ${xmls.length} XMLs baixados, gerando ZIP...`);
      
      // Estimar tamanho do ZIP
      const { mb } = estimateZipSize(xmls);
      console.log(`[Download] Tamanho estimado do ZIP: ${mb} MB`);
      
      // Gerar e baixar ZIP
      const fileName = generateFileName(startDate, endDate);
      await generateAndDownloadZip(xmls, { fileName });
      
      setSuccess(`✅ ${xmls.length} XMLs baixados com sucesso! Arquivo: ${fileName}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao baixar XMLs';
      setError(errorMessage);
      console.error('[Download] Erro:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };
  
  const getProgressText = () => {
    if (!progress) return '';
    
    switch (progress.status) {
      case 'searching':
        return 'Buscando NFC-es no portal...';
      case 'downloading':
        return `Baixando XML ${progress.current} de ${progress.total}...`;
      case 'completed':
        return 'Download concluído!';
      case 'error':
        return 'Erro no download';
      default:
        return '';
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Download de NFC-e</h1>
        <p className="text-muted-foreground mt-2">
          Busque e baixe XMLs de NFC-e por período
        </p>
      </div>
      
      {/* Informações da Configuração */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">Configuração Ativa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p><span className="font-semibold">Nome:</span> {config.name}</p>
              <p><span className="font-semibold">CNPJ:</span> {formatCNPJ(config.cnpj)}</p>
            </div>
            <Button onClick={() => navigate('/config-simple')} variant="outline" size="sm">
              Alterar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Formulário de Download */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar e Baixar XMLs</CardTitle>
          <CardDescription>
            Informe o período para buscar automaticamente todas as NFC-es e baixar os XMLs em um arquivo ZIP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDownload} className="space-y-6">
            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Fim *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                <p className="text-sm">
                  <strong>Dica:</strong> Para melhores resultados, use períodos de até 7 dias.
                  Períodos muito longos podem demorar mais tempo para processar.
                </p>
              </AlertDescription>
            </Alert>
            
            {/* Progresso */}
            {loading && progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{getProgressText()}</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} />
                {progress.currentChave && (
                  <p className="text-xs text-muted-foreground">
                    Chave: {progress.currentChave}
                  </p>
                )}
              </div>
            )}
            
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
                {loading ? 'Processando...' : 'Buscar e Baixar XMLs'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
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


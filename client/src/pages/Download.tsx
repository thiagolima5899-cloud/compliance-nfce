import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Download, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function DownloadPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [accessConfigId, setAccessConfigId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    sessionId?: string;
    nfcesFound?: number;
    xmlsDownloaded?: number;
  } | null>(null);

  const { data: accessConfigs, isLoading: loadingConfigs } = trpc.accessConfig.list.useQuery();
  const searchMutation = trpc.searchByPeriod.execute.useMutation();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessConfigId || !dataInicio || !dataFim) {
      setResult({
        success: false,
        message: "Por favor, preencha todos os campos",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await searchMutation.mutateAsync({
        accessConfigId,
        dataInicio,
        dataFim,
      });

      setResult({
        success: true,
        message: `Download concluído com sucesso!`,
        sessionId: response.sessionId,
        nfcesFound: response.nfcesFound,
        xmlsDownloaded: response.xmlsDownloaded,
      });

      // Redirecionar para histórico após 2 segundos
      setTimeout(() => {
        navigate("/history");
      }, 2000);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Erro ao processar download",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedConfig = accessConfigs?.find(c => c.id === accessConfigId);
  const canSubmit = accessConfigId && dataInicio && dataFim && !isProcessing;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Download de NFC-e</h1>
              <p className="text-sm text-gray-600 mt-1">
                Busque e baixe XMLs automaticamente por período
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Buscar e Baixar XMLs por Período
            </CardTitle>
            <CardDescription>
              Selecione a configuração de ApiKey e o período para buscar automaticamente todas as NFC-es e baixar os XMLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ApiKey Selection */}
              <div className="space-y-2">
                <Label htmlFor="apikey">Configuração de ApiKey</Label>
                <Select value={accessConfigId} onValueChange={setAccessConfigId} disabled={loadingConfigs || isProcessing}>
                  <SelectTrigger id="apikey">
                    <SelectValue placeholder="Selecione uma configuração" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessConfigs?.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name} ({config.cnpj})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!accessConfigs || accessConfigs.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma configuração encontrada. Crie uma nova configuração na página de Configurações.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    disabled={isProcessing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    disabled={isProcessing}
                    required
                  />
                </div>
              </div>

              {/* Result Message */}
              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {result.message}
                    {result.success && result.nfcesFound !== undefined && (
                      <div className="mt-2 text-sm">
                        <p>NFC-es encontradas: <strong>{result.nfcesFound}</strong></p>
                        <p>XMLs baixados: <strong>{result.xmlsDownloaded}</strong></p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!canSubmit}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Buscar e Baixar XMLs
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 text-lg">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2 text-sm">
            <p>1. O sistema consulta o portal da SEFAZ-CE para buscar todas as NFC-es do período informado</p>
            <p>2. Para cada NFC-e encontrada, o XML completo é baixado automaticamente</p>
            <p>3. Os XMLs ficam disponíveis na página de Histórico para download</p>
            <p className="font-semibold mt-4">⚠️ Importante: Certifique-se de que o certificado possui CNPJ e ApiKey configurados</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Link as LinkIcon, AlertCircle, CheckCircle2, Trash2, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AccessConfigPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [portalUrl, setPortalUrl] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: configs, isLoading, refetch } = trpc.accessConfig.list.useQuery();
  const createMutation = trpc.accessConfig.create.useMutation();
  const deleteMutation = trpc.accessConfig.delete.useMutation();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!portalUrl) {
      setResult({
        success: false,
        message: "Por favor, cole a URL do portal",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await createMutation.mutateAsync({
        portalUrl,
        name: name || undefined,
      });

      setResult({
        success: true,
        message: response.updated 
          ? "Configuração atualizada com sucesso!" 
          : "Configuração criada com sucesso!",
      });

      setPortalUrl("");
      setName("");
      refetch();
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Erro ao processar configuração",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta configuração?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
    } catch (error: any) {
      alert("Erro ao deletar configuração: " + error.message);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("pt-BR");
  };

  const isExpired = (date: Date | null | undefined) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Configurações de Acesso</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gerencie suas configurações de acesso ao portal da SEFAZ-CE
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Add New Config Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Nova Configuração
            </CardTitle>
            <CardDescription>
              Cole a URL do portal da SEFAZ-CE para extrair automaticamente o ApiKey e CNPJ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portalUrl">URL do Portal da SEFAZ-CE</Label>
                <Input
                  id="portalUrl"
                  type="url"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://cfe.sefaz.ce.gov.br:8443/portalcfews/nfce/fiscal-coupons/xml/..."
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-gray-500">
                  Faça login no portal, clique em qualquer NFC-e para visualizar o XML e copie a URL completa da barra de endereço
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Empresa Principal"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">
                  Nome amigável para identificar esta configuração
                </p>
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Processando..." : "Adicionar Configuração"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Configs */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Salvas</CardTitle>
            <CardDescription>
              Suas configurações de acesso ao portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Carregando...</p>
            ) : !configs || configs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhuma configuração cadastrada
              </p>
            ) : (
              <div className="space-y-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="border rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        CNPJ: {config.cnpj}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          ApiKey expira em: {formatDate(config.apiKeyExpiresAt)}
                        </p>
                        {isExpired(config.apiKeyExpiresAt) && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Expirado
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 text-lg">Como obter a URL?</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2 text-sm">
            <p>1. Acesse o portal da SEFAZ-CE: <strong>https://cfe.sefaz.ce.gov.br</strong></p>
            <p>2. Faça login com seu CPF e senha</p>
            <p>3. Vá em <strong>Consulta NFC-e</strong> e busque qualquer NFC-e</p>
            <p>4. Clique em uma NFC-e para visualizar o XML</p>
            <p>5. <strong>Copie a URL completa</strong> da barra de endereço do navegador</p>
            <p>6. Cole aqui e clique em "Adicionar Configuração"</p>
            <p className="font-semibold mt-4">⚠️ O ApiKey tem validade de 24 horas. Após expirar, cole uma nova URL para atualizar.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Lock, ArrowLeft, Key, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Certificates() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  
  const [formData, setFormData] = useState({
    certificateName: "",
    certificateFile: null as File | null,
    certificatePassword: "",
    cnpj: "",
  });

  const utils = trpc.useUtils();
  const { data: certificates, isLoading } = trpc.certificates.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.certificates.create.useMutation({
    onSuccess: () => {
      setFormData({
        certificateName: "",
        certificateFile: null,
        certificatePassword: "",
        cnpj: "",
      });
      setIsOpen(false);
      utils.certificates.list.invalidate();
    },
  });

  const deleteMutation = trpc.certificates.delete.useMutation({
    onSuccess: () => {
      utils.certificates.list.invalidate();
    },
  });

  const updateApiKeyMutation = trpc.certificates.updateApiKey.useMutation({
    onSuccess: () => {
      setApiKeyDialogOpen(false);
      setApiKeyInput("");
      setSelectedCertId("");
      utils.certificates.list.invalidate();
      alert("ApiKey atualizado com sucesso!");
    },
    onError: (error) => {
      alert(`Erro ao atualizar ApiKey: ${error.message}`);
    },
  });

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, certificateFile: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.certificateFile) {
      alert("Por favor, selecione um arquivo de certificado");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      try {
        await createMutation.mutateAsync({
          certificateName: formData.certificateName,
          certificateData: base64,
          certificatePassword: formData.certificatePassword,
          cnpj: formData.cnpj || undefined,
        });
      } catch (error) {
        alert("Erro ao fazer upload do certificado");
        console.error(error);
      }
    };
    reader.readAsDataURL(formData.certificateFile);
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertId || !apiKeyInput) {
      alert("Por favor, forneça o ApiKey");
      return;
    }

    await updateApiKeyMutation.mutateAsync({
      id: selectedCertId,
      apiKey: apiKeyInput,
    });
  };

  const openApiKeyDialog = (certId: string) => {
    setSelectedCertId(certId);
    setApiKeyDialogOpen(true);
  };

  const isApiKeyExpired = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return false;
    return new Date() >= new Date(expiresAt);
  };

  const getExpirationStatus = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return { text: "Expirado", color: "text-red-600", bgColor: "bg-red-50" };
    } else if (diffHours < 2) {
      return { 
        text: `Expira em ${diffMinutes}m`, 
        color: "text-orange-600", 
        bgColor: "bg-orange-50" 
      };
    } else {
      return { 
        text: `Expira em ${diffHours}h`, 
        color: "text-green-600", 
        bgColor: "bg-green-50" 
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Certificados Digitais</h1>
            <div className="flex gap-2">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Certificado
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Certificado Digital</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome do Certificado</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Certificado Empresa XYZ"
                        value={formData.certificateName}
                        onChange={(e) =>
                          setFormData({ ...formData, certificateName: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={formData.cnpj}
                        onChange={(e) =>
                          setFormData({ ...formData, cnpj: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="file">Arquivo de Certificado (.pfx/.p12)</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleFileChange}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Senha do Certificado</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha do certificado"
                        value={formData.certificatePassword}
                        onChange={(e) =>
                          setFormData({ ...formData, certificatePassword: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Enviando..." : "Adicionar Certificado"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Info Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Para baixar XMLs de NFC-e, você precisa configurar um ApiKey do Portal CFe da SEFAZ-CE. 
            O ApiKey tem validade de 24 horas e deve ser renovado manualmente.
            {" "}
            <a 
              href="https://cfe.sefaz.ce.gov.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Acesse o portal para obter seu ApiKey →
            </a>
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando certificados...</p>
          </div>
        ) : certificates && certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => {
              const expirationStatus = getExpirationStatus(cert.apiKeyExpiresAt);
              const hasApiKey = !!cert.apiKey;
              const expired = isApiKeyExpired(cert.apiKeyExpiresAt);

              return (
                <Card key={cert.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Lock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {cert.certificateName}
                        </h3>
                        {cert.cnpj && (
                          <p className="text-sm text-gray-500">{cert.cnpj}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate({ id: cert.id })}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-gray-500">
                      <p>
                        Adicionado em:{" "}
                        {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                      </p>
                    </div>

                    {/* ApiKey Status */}
                    <div className="border-t pt-3">
                      {hasApiKey && expirationStatus ? (
                        <div className={`${expirationStatus.bgColor} p-2 rounded-md mb-2`}>
                          <p className={`text-xs font-medium ${expirationStatus.color}`}>
                            ApiKey: {expirationStatus.text}
                          </p>
                          {cert.apiKeyExpiresAt && (
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(cert.apiKeyExpiresAt).toLocaleString("pt-BR")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-2 rounded-md mb-2">
                          <p className="text-xs font-medium text-yellow-700">
                            ApiKey não configurado
                          </p>
                        </div>
                      )}

                      <Button
                        variant={expired || !hasApiKey ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => openApiKeyDialog(cert.id)}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        {hasApiKey ? "Atualizar ApiKey" : "Configurar ApiKey"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              Nenhum certificado adicionado ainda
            </p>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Certificado
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
      </main>

      {/* ApiKey Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar ApiKey do Portal CFe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="mb-2">Para obter seu ApiKey:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Acesse <a href="https://cfe.sefaz.ce.gov.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">cfe.sefaz.ce.gov.br</a></li>
                  <li>Faça login com seu CPF e senha</li>
                  <li>Abra as ferramentas de desenvolvedor (F12)</li>
                  <li>Vá para a aba "Application" ou "Armazenamento"</li>
                  <li>Procure por "apiKey" no localStorage</li>
                  <li>Copie o valor completo do token JWT</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="apiKey">ApiKey (JWT Token)</Label>
              <Input
                id="apiKey"
                placeholder="eyJhbGciOiJIUzI1NiJ9..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                required
                className="font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole o token JWT completo obtido do portal
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateApiKeyMutation.isPending}
            >
              {updateApiKeyMutation.isPending ? "Salvando..." : "Salvar ApiKey"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


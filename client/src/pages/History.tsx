import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, Download, ArrowLeft, Trash2, FileArchive } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null);

  const { data: history, isLoading, refetch } = trpc.download.getHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const clearHistoryMutation = trpc.download.clearHistory.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const downloadZipMutation = trpc.download.downloadZip.useMutation();

  const handleClearHistory = () => {
    if (window.confirm("Tem certeza que deseja limpar todo o histórico?")) {
      clearHistoryMutation.mutate();
    }
  };

  const handleDownloadZip = async (sessionId: string) => {
    setDownloadingZip(sessionId);
    try {
      const result = await downloadZipMutation.mutateAsync({ sessionId });
      
      console.log('[Frontend] ZIP gerado com sucesso:', result);
      
      // Criar elemento <a> temporário para forçar download
      const link = document.createElement('a');
      link.href = result.zipUrl;
      link.download = `nfce-${sessionId}.zip`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar mensagem de sucesso
      alert(`ZIP gerado com sucesso! ${result.fileCount} XMLs incluídos.`);
    } catch (error: any) {
      console.error('[Frontend] Erro ao gerar ZIP:', error);
      alert("Erro ao gerar ZIP: " + error.message);
    } finally {
      setDownloadingZip(null);
    }
  };

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "not_found":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Sucesso";
      case "failed":
        return "Falha";
      case "not_found":
        return "Não encontrado";
      default:
        return "Pendente";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "not_found":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Agrupar downloads por sessão
  const groupedHistory = history?.reduce((acc: any, record: any) => {
    const sessionId = record.csvUploadId;
    if (!acc[sessionId]) {
      acc[sessionId] = {
        sessionId,
        downloads: [],
        successCount: 0,
        failureCount: 0,
        firstDate: record.createdAt,
      };
    }
    acc[sessionId].downloads.push(record);
    if (record.status === 'success') {
      acc[sessionId].successCount++;
    } else {
      acc[sessionId].failureCount++;
    }
    return acc;
  }, {});

  const sessions = groupedHistory ? Object.values(groupedHistory) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Downloads</h1>
          <div className="flex items-center gap-2">
            {history && history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Histórico
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando histórico...</p>
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-6">
            {sessions.map((session: any) => (
              <Card key={session.sessionId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Sessão de Download
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        Data: {new Date(session.firstDate).toLocaleDateString("pt-BR")} às {new Date(session.firstDate).toLocaleTimeString("pt-BR")}
                      </span>
                      <span className="text-green-600 font-medium">
                        {session.successCount} sucesso(s)
                      </span>
                      {session.failureCount > 0 && (
                        <span className="text-red-600 font-medium">
                          {session.failureCount} falha(s)
                        </span>
                      )}
                    </div>
                  </div>
                  {session.successCount > 0 && (
                    <Button
                      onClick={() => handleDownloadZip(session.sessionId)}
                      disabled={downloadingZip === session.sessionId}
                      className="flex items-center gap-2"
                    >
                      <FileArchive className="w-4 h-4" />
                      {downloadingZip === session.sessionId ? "Gerando ZIP..." : "Baixar ZIP"}
                    </Button>
                  )}
                </div>

                {/* Lista de downloads */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {session.downloads.map((record: any) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(record.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {record.accessKey}
                          </p>
                          {record.errorMessage && (
                            <p className="text-xs text-red-600 truncate">
                              {record.errorMessage}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                      {record.status === "success" && record.xmlUrl && (
                        <a
                          href={record.xmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum download realizado ainda</p>
            <Button onClick={() => navigate("/download")}>
              Fazer Download
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}


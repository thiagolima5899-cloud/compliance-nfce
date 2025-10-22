import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

export default function DownloadProgress() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/download-progress/:sessionId");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const sessionId = params?.sessionId as string;

  const { data: session, isLoading, refetch } = trpc.download.getSession.useQuery(
    { sessionId },
    {
      enabled: isAuthenticated && !!sessionId,
      refetchInterval: autoRefresh ? 500 : false,
    }
  );

  // Log para debug
  useEffect(() => {
    console.log('[DownloadProgress] Session data:', session);
  }, [session]);

  useEffect(() => {
    if (session?.status === "completed" || session?.status === "failed") {
      console.log('[DownloadProgress] Download completed or failed:', session?.status);
      setAutoRefresh(false);
    }
  }, [session?.status]);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (!match) {
    navigate("/download");
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Clock className="w-6 h-6 text-blue-600 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "failed":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "Em progresso";
      case "completed":
        return "Concluído";
      case "failed":
        return "Falha";
      default:
        return "Desconhecido";
    }
  };

  const progressPercentage = session
    ? ((session.processedKeys ?? 0) / session.totalKeys) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Progresso do Download</h1>
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
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando informações...</p>
          </div>
        ) : session ? (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                {getStatusIcon(session.status)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getStatusLabel(session.status)}
                  </h2>
                  <p className="text-gray-600">
                    {session.status === "in_progress"
                      ? "Processando downloads..."
                      : "Operação finalizada"}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progresso geral</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-1">Total de chaves</p>
                <p className="text-2xl font-bold text-gray-900">
                  {session.totalKeys}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-1">Processadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {session.processedKeys}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-1">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">
                  {session.successCount}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-gray-500 mb-1">Falhas</p>
                <p className="text-2xl font-bold text-red-600">
                  {session.failureCount}
                </p>
              </Card>
            </div>

            {/* Info Box */}
            {session.status === "in_progress" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Download em andamento</p>
                  <p>
                    Não feche esta página. O processo continuará em segundo plano.
                  </p>
                </div>
              </div>
            )}

            {session.status === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Download concluído</p>
                  <p>
                    {session.successCount} arquivo(s) baixado(s) com sucesso.
                    Verifique o histórico para mais detalhes.
                  </p>
                </div>
              </div>
            )}

            {session.status === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Download falhou</p>
                  <p>
                    Ocorreu um erro durante o processo. Verifique o histórico para
                    mais detalhes.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/history")}
              >
                Ver Histórico
              </Button>
              <Button onClick={() => navigate("/download")}>
                Novo Download
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Sessão não encontrada</p>
            <Button onClick={() => navigate("/download")}>
              Voltar para Download
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}


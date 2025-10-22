import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function CsvUploads() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: csvUploads, isLoading, refetch } = trpc.csvUploads.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteUploadMutation = trpc.csvUploads.delete.useMutation({
    onSuccess: () => {
      toast.success("Arquivo deletado com sucesso");
      setDeletingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este arquivo?")) {
      return;
    }
    setDeletingId(id);
    deleteUploadMutation.mutate({ id });
  };

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Meus Uploads de CSV</h1>
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
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando uploads...</p>
          </div>
        ) : csvUploads && csvUploads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {csvUploads.map((upload) => (
              <Card key={upload.id} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {upload.fileName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {upload.totalKeys} chaves
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Processadas</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              upload.totalKeys > 0
                                ? ((upload.processedKeys ?? 0) / upload.totalKeys) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">
                        {upload.processedKeys ?? 0}/{upload.totalKeys}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500">Data de envio</p>
                    <p className="font-medium text-gray-900">
                      {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Última atualização</p>
                    <p className="font-medium text-gray-900">
                      {upload.updatedAt ? new Date(upload.updatedAt).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleDelete(upload.id)}
                  disabled={deletingId === upload.id}
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === upload.id ? "Deletando..." : "Deletar"}
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              Nenhum arquivo CSV enviado
            </p>
            <Button
              onClick={() => navigate("/download")}
              className="inline-flex items-center gap-2"
            >
              Ir para Download de NFC-e →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}


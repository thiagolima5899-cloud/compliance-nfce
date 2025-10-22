import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Download, History, Settings, Link as LinkIcon } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // ============================================
  // LOGIN DESABILITADO TEMPORARIAMENTE
  // ============================================
  // TODO: Descomentar para reativar tela de login
  /*
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            {APP_LOGO && (
              <img src={APP_LOGO} alt="Logo" className="h-16 mx-auto mb-4" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{APP_TITLE}</h1>
            <p className="text-gray-600 mb-8">
              Faça download automático de XMLs de NFC-e da SEFAZ Ceará
            </p>
            <a href={getLoginUrl()}>
              <Button className="w-full" size="lg">
                Entrar com Manus
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {APP_LOGO && (
              <img src={APP_LOGO} alt="Logo" className="h-8" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
          </div>
          <div className="text-sm text-gray-600">
            Bem-vindo, <span className="font-semibold">{user?.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Download NFC-e Card */}
          <button
            onClick={() => navigate("/download")}
            className="block group text-left"
          >
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 cursor-pointer h-full border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Download className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Download de NFC-e
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Faça download de XMLs de Notas Fiscais de Consumidor Eletrônicas
                  </p>
                  <div className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                    Começar →
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Access Config Card */}
          <button
            onClick={() => navigate("/access-config")}
            className="block group text-left"
          >
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <LinkIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Configurações
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Configure o acesso ao portal da SEFAZ-CE
                  </p>
                  <div className="text-sm text-purple-600 font-medium group-hover:text-purple-700">
                    Configurar →
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* History Card */}
          <button
            onClick={() => navigate("/history")}
            className="block group text-left"
          >
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <History className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Histórico
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Acompanhe todos os seus downloads realizados
                  </p>
                  <div className="text-sm text-orange-600 font-medium group-hover:text-orange-700">
                    Ver histórico →
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Como usar a aplicação
          </h3>
          <ol className="space-y-2 text-blue-800 list-decimal list-inside">
            <li>Acesse a seção de <strong>Configurações</strong> e cole a URL do portal da SEFAZ</li>
            <li>O sistema extrai automaticamente o <strong>ApiKey</strong> e <strong>CNPJ</strong></li>
            <li>Acesse a seção <strong>Download de NFC-e</strong></li>
            <li>Selecione a configuração e informe o <strong>período</strong> (data início e fim)</li>
            <li>Clique em <strong>Buscar e Baixar</strong> para iniciar o processo automático</li>
            <li>Acompanhe o progresso e baixe os XMLs no <strong>Histórico</strong></li>
          </ol>
        </div>
      </main>
    </div>
  );
}


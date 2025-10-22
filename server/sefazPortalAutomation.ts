import puppeteer, { Browser, Page } from 'puppeteer';

export interface SefazCredentials {
  cpf: string;
  senha: string;
  tipoVinculo?: string; // Default: '3' (CONTADOR)
}

export interface ApiKeyResult {
  success: boolean;
  apiKey?: string;
  cnpj?: string;
  expiresAt?: Date;
  error?: string;
}

export interface NFCeConsultaResult {
  success: boolean;
  notas?: Array<{
    dataEmissao: string;
    numero: string;
    serie: string;
    chave: string;
    protocolo?: string;
    status: string;
  }>;
  error?: string;
}

export class SefazPortalAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private apiKey: string | null = null;
  private cnpj: string | null = null;

  /**
   * Inicializa o browser Puppeteer
   */
  async init(): Promise<void> {
    console.log('[SefazPortal] Inicializando browser...');
    
    this.browser = await puppeteer.launch({
      headless: true, // Mudar para false para debug
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security', // Necessário para SSL inválido
        '--ignore-certificate-errors', // Ignora erros de certificado SSL
      ],
    });

    this.page = await this.browser.newPage();
    
    // Configurar viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Configurar timeout padrão
    this.page.setDefaultTimeout(30000);
    
    console.log('[SefazPortal] Browser inicializado com sucesso');
  }

  /**
   * Faz login no ambiente seguro e extrai o apiKey
   */
  async login(credentials: SefazCredentials): Promise<ApiKeyResult> {
    try {
      if (!this.page) {
        throw new Error('Browser não inicializado. Chame init() primeiro.');
      }

      // Intercepta requisições para capturar apiKey
      let capturedApiKey: string | null = null;
      const allRequests: Array<{ url: string; hasApiKey: boolean }> = [];
      
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const url = request.url();
        const headers = request.headers();
        
        // Log de todas as requisições
        const hasApiKey = url.includes('apiKey=') || !!headers['authorization'];
        allRequests.push({ url: url.substring(0, 100), hasApiKey });
        
        // Procura por apiKey na URL
        if (url.includes('apiKey=')) {
          const match = url.match(/apiKey=([^&]+)/);
          if (match && match[1]) {
            capturedApiKey = decodeURIComponent(match[1]);
            console.log('[SefazPortal] ✅ ApiKey capturado da URL!', url.substring(0, 150));
          }
        }
        
        // Procura por token nos headers
        if (headers['authorization']) {
          capturedApiKey = headers['authorization'].replace(/^Bearer\s+/i, '');
          console.log('[SefazPortal] ✅ ApiKey capturado do header Authorization!');
        }
        
        request.continue();
      });
      
      // Ao final, mostra todas as requisições
      this.page.on('close', () => {
        console.log('[SefazPortal] Total de requisições capturadas:', allRequests.length);
        console.log('[SefazPortal] Requisições com apiKey:', allRequests.filter(r => r.hasApiKey).length);
      });

      console.log('[SefazPortal] Acessando página de login...');
      
      // Acessa página de login
      await this.page.goto(
        'https://servicos.sefaz.ce.gov.br/internet/acessoseguro/servicosenha/logarusuario/login.asp',
        { waitUntil: 'networkidle2', timeout: 60000 }
      );

      console.log('[SefazPortal] Preenchendo formulário de login...');

      // Aguarda formulário carregar
      await this.page.waitForSelector('input[name="txtUsuario"]', { timeout: 10000 });

      // Preenche formulário
      await this.page.type('input[name="txtUsuario"]', credentials.cpf);
      await this.page.type('input[name="txtSenha"]', credentials.senha);
      
      // Seleciona tipo de vínculo (default: CONTADOR = 3)
      await this.page.select('select[name="cboTipoUsuario"]', credentials.tipoVinculo || '3');

      console.log('[SefazPortal] Submetendo formulário...');

      // Submete formulário (procura pelo botão ENTRAR)
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
        this.page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) form.submit();
        }),
      ]);

      console.log('[SefazPortal] Login realizado, acessando Portal CFe...');

      // Navega para o Portal CFe
      await this.page.goto(
        'https://cfe.sefaz.ce.gov.br/mfe/portal',
        { waitUntil: 'networkidle2', timeout: 60000 }
      );

      // Aguarda portal carregar
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('[SefazPortal] Clicando em "Consultar Cupom Fiscal Eletr\u00f4nico"...');
      
      // Clica no menu "Consultar Cupom Fiscal Eletrônico"
      await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const targetLink = links.find(link => link.textContent?.includes('Consultar Cupom Fiscal Eletr'));
        if (targetLink) {
          (targetLink as HTMLElement).click();
        }
      });
      
      // Aguarda página de consulta carregar
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Tira screenshot para debug
      await this.page.screenshot({ path: '/home/ubuntu/portal-loaded.png', fullPage: true });
      console.log('[SefazPortal] Screenshot salvo em /home/ubuntu/portal-loaded.png');

      // Verifica cookies
      const cookies = await this.page.cookies();
      console.log('[SefazPortal] Cookies:', cookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) })));

      console.log('[SefazPortal] Tentando fazer consulta para disparar requisições...');
      
      try {
        // Tenta clicar no botão de consultar para disparar requisições
        await this.page.waitForSelector('button:has-text("Consultar"), input[value="Consultar"]', { timeout: 5000 });
        await this.page.click('button:has-text("Consultar"), input[value="Consultar"]');
        
        // Aguarda requisições serem feitas
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.log('[SefazPortal] Não foi possível clicar em Consultar:', e);
      }

      console.log('[SefazPortal] Extraindo apiKey do localStorage...');

      // Extrai apiKey do localStorage
      const apiKeyData = await this.page.evaluate(() => {
        // Tenta diferentes formas de obter o token
        const possibleKeys = [
          'apiKey',
          'token',
          'authToken',
          'jwt',
          'access_token',
          'Authorization',
        ];

        for (const key of possibleKeys) {
          const value = localStorage.getItem(key);
          if (value) {
            return { key, value };
          }
        }

        // Se não encontrou no localStorage, tenta sessionStorage
        for (const key of possibleKeys) {
          const value = sessionStorage.getItem(key);
          if (value) {
            return { key, value, source: 'sessionStorage' };
          }
        }

        // Retorna todos os itens do localStorage para debug
        const allItems: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            allItems[key] = localStorage.getItem(key) || '';
          }
        }

        return { allItems };
      });

      console.log('[SefazPortal] Dados do localStorage:', JSON.stringify(apiKeyData, null, 2));
      console.log('[SefazPortal] Total de requisições:', allRequests.length);
      console.log('[SefazPortal] Requisições com apiKey:', allRequests.filter(r => r.hasApiKey));
      console.log('[SefazPortal] CapturedApiKey:', capturedApiKey ? (capturedApiKey as string).substring(0, 50) + '...' : 'null');

      // Usa capturedApiKey se não encontrou no localStorage
      const finalApiKey = (apiKeyData && 'value' in apiKeyData && apiKeyData.value) || capturedApiKey;

      // Se encontrou o token
      if (finalApiKey) {
        this.apiKey = finalApiKey;
        
        // Tenta decodificar JWT para obter CNPJ e expiração
        try {
          const payload = this.decodeJWT(this.apiKey);
          this.cnpj = payload.sub || payload.cnpj;
          
          const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;

          console.log('[SefazPortal] ApiKey extraído com sucesso!');
          console.log('[SefazPortal] CNPJ:', this.cnpj);
          console.log('[SefazPortal] Expira em:', expiresAt);

          return {
            success: true,
            apiKey: this.apiKey,
            cnpj: this.cnpj || undefined,
            expiresAt,
          };
        } catch (e) {
          console.warn('[SefazPortal] Erro ao decodificar JWT:', e);
          return {
            success: true,
            apiKey: this.apiKey,
          };
        }
      }

      // Se não encontrou, retorna erro com debug info
      return {
        success: false,
        error: `ApiKey não encontrado. localStorage: ${JSON.stringify(apiKeyData)}`,
      };

    } catch (error) {
      console.error('[SefazPortal] Erro no login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Decodifica JWT (apenas payload, sem validação de assinatura)
   */
  private decodeJWT(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token JWT inválido');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  /**
   * Retorna o apiKey atual
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Retorna o CNPJ atual
   */
  getCNPJ(): string | null {
    return this.cnpj;
  }

  /**
   * Fecha o browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[SefazPortal] Browser fechado');
    }
  }
}


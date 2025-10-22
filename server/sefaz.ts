import axios from "axios";
import https from "https";
import { v4 as uuidv4 } from "uuid";
import forge from "node-forge";

/**
 * Configuração dos webservices SVRS (Sefaz Virtual do Rio Grande do Sul)
 * Ceará (CE) usa SVRS, não tem webservices próprios
 * URLs oficiais do Portal da NF-e (versão 4.0)
 */
const SEFAZ_CONFIG = {
  production: {
    nfeAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    nfeRetAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    nfeConsultaProtocolo: "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    nfeStatusServico: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
  homologacao: {
    nfeAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    nfeRetAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    nfeConsultaProtocolo: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    nfeStatusServico: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
};

interface ConsultaProtocoloRequest {
  nfCertificatePem: string; // Certificado em formato PEM
  nfCertificatePassword: string; // Senha do certificado
  accessKey: string; // Chave de acesso de 44 dígitos
  environment: "production" | "homologacao";
}

interface ConsultaProtocoloResponse {
  success: boolean;
  status?: string;
  protocolNumber?: string;
  xmlContent?: string;
  errorMessage?: string;
}

/**
 * Consulta o protocolo de uma NFC-e na SEFAZ
 * Retorna o XML se disponível
 */
export async function consultaProtocoloNFCe(
  request: ConsultaProtocoloRequest
): Promise<ConsultaProtocoloResponse> {
  try {
    console.log(`[SEFAZ] Iniciando consulta para chave: ${request.accessKey}`);
    console.log(`[SEFAZ] Ambiente: ${request.environment}`);
    
    const config = SEFAZ_CONFIG[request.environment];
    console.log(`[SEFAZ] URL do webservice: ${config.nfeConsultaProtocolo}`);

    // Construir SOAP request
    const tpAmb = request.environment === 'production' ? '1' : '2';
    const soapBody = buildConsultaProtocoloSoapRequest(request.accessKey, tpAmb);
    console.log(`[SEFAZ] SOAP Request construído (${soapBody.length} bytes)`);
    console.log(`[SEFAZ] Tipo de ambiente: ${tpAmb} (${request.environment})`);

    // Converter certificado PFX para PEM
    let clientCert: string | undefined;
    let clientKey: string | undefined;
    let clientCA: string[] | undefined;

    // Adicionar certificado SSL se disponivel
    if (request.nfCertificatePem && request.nfCertificatePassword) {
      try {
        const { cert, key, ca } = await convertPfxToPem(
          Buffer.from(request.nfCertificatePem, 'base64'),
          request.nfCertificatePassword
        );
        
        console.log(`[SEFAZ] Certificado carregado. CA chain: ${ca.length} certificados`);
        console.log(`[SEFAZ] Certificado (primeiros 100 chars): ${cert.substring(0, 100)}`);
        console.log(`[SEFAZ] Chave privada (primeiros 50 chars): ${key.substring(0, 50)}`);
        
        clientCert = cert;
        clientKey = key;
        clientCA = ca.length > 0 ? ca : undefined;
        
        console.log('[SEFAZ] Certificado SSL configurado para mTLS');
      } catch (certError) {
        console.error('[SEFAZ] Erro ao processar certificado:', certError);
        throw new Error(`Falha ao processar certificado: ${certError}`);
      }
    } else {
      throw new Error('Certificado digital não fornecido');
    }

    // Fazer requisicao SOAP usando HTTPS nativo (axios tem problemas com SEFAZ-CE)
    console.log(`[SEFAZ] Enviando requisição SOAP...`);
    
    const responseData = await new Promise<string>((resolve, reject) => {
      const url = new URL(config.nfeConsultaProtocolo);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapBody),
        'User-Agent': 'Mozilla/5.0 (compatible; NFC-e Downloader/1.0)',
        'Accept': 'application/soap+xml, text/xml, */*',
        'Connection': 'keep-alive',
      },
        // Configuração mTLS - certificado do cliente
        cert: clientCert,
        key: clientKey,
        ca: clientCA,
        // Aceitar certificados auto-assinados da SEFAZ
        rejectUnauthorized: false,
      };
      
      console.log('[SEFAZ] Opções HTTPS configuradas:');
      console.log(`  - hostname: ${options.hostname}`);
      console.log(`  - port: ${options.port}`);
      console.log(`  - path: ${options.path}`);
      console.log(`  - cert presente: ${!!options.cert}`);
      console.log(`  - key presente: ${!!options.key}`);
      console.log(`  - ca presente: ${!!options.ca}`);
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`[SEFAZ] Resposta recebida (status: ${res.statusCode})`);
          console.log(`[SEFAZ] Resposta (primeiros 500 chars): ${data.substring(0, 500)}`);
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        console.error(`[SEFAZ] Erro na requisição HTTPS:`, error.message);
        reject(error);
      });
      
      req.write(soapBody);
      req.end();
    });

    // Salvar resposta completa para debug
    console.log(`[SEFAZ] ========== RESPOSTA COMPLETA ==========`);
    console.log(responseData);
    console.log(`[SEFAZ] ========================================`);
    console.log(`[SEFAZ] Tamanho da resposta: ${responseData.length} bytes`);
    
    // Parsear resposta SOAP
    const xmlContent = extractXmlFromResponse(responseData);
    const status = extractStatusFromResponse(responseData);
    const protocolNumber = extractProtocolFromResponse(responseData);
    
    console.log(`[SEFAZ] Status extraído: ${status}`);
    console.log(`[SEFAZ] Protocolo extraído: ${protocolNumber}`);
    console.log(`[SEFAZ] XML extraído: ${xmlContent ? 'SIM' : 'NÃO'}`);

    if (!xmlContent) {
      console.warn(`[SEFAZ] XML não encontrado na resposta`);
    }
    
    return {
      success: true,
      status,
      protocolNumber,
      xmlContent,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[SEFAZ] Erro ao consultar protocolo:", errorMessage);
    
    // Log detalhado em caso de erro HTTP
    if (error.response) {
      console.error("[SEFAZ] Status da resposta:", error.response.status);
      console.error("[SEFAZ] Headers da resposta:", JSON.stringify(error.response.headers));
      console.error("[SEFAZ] Corpo da resposta:", error.response.data);
    }
    if (error instanceof Error && error.stack) {
      console.error("[SEFAZ] Stack trace:", error.stack);
    }

    return {
      success: false,
      errorMessage,
    };
  }
}

/**
 * Constrói o corpo da requisição SOAP para consulta de protocolo
 */
function buildConsultaProtocoloSoapRequest(accessKey: string, tpAmb: '1' | '2' = '1'): string {
  // XML sem identação para evitar problemas com espaços em branco
  const xml = `<?xml version="1.0" encoding="UTF-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeConsulta4"><consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  return xml;
}

/**
 * Extrai o XML da resposta SOAP
 */
function extractXmlFromResponse(soapResponse: string): string | undefined {
  try {
    // Procurar por protNFe na resposta (contém o XML completo da NFC-e)
    const protMatch = soapResponse.match(/<protNFe[^>]*>([\s\S]*?)<\/protNFe>/);
    if (protMatch && protMatch[0]) {
      console.log('[SEFAZ] protNFe encontrado na resposta');
      // Retornar o protNFe completo
      return protMatch[0];
    }
    
    // Se não encontrar protNFe, tentar retConsSitNFe (para casos de erro)
    const retMatch = soapResponse.match(/<retConsSitNFe[^>]*>([\s\S]*?)<\/retConsSitNFe>/);
    if (retMatch && retMatch[0]) {
      console.log('[SEFAZ] retConsSitNFe encontrado (sem protNFe)');
      return retMatch[0];
    }
    
    console.warn('[SEFAZ] Nenhum XML encontrado na resposta');
    return undefined;
  } catch (error) {
    console.error("[SEFAZ] Erro ao extrair XML:", error);
    return undefined;
  }
}

/**
 * Extrai o status da resposta SOAP
 */
function extractStatusFromResponse(soapResponse: string): string | undefined {
  try {
    const match = soapResponse.match(/<cStat>(.*?)<\/cStat>/);
    return match ? match[1] : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Extrai o número do protocolo da resposta SOAP
 */
function extractProtocolFromResponse(soapResponse: string): string | undefined {
  try {
    // Tentar extrair de <nProt> (dentro de <protNFe>)
    let match = soapResponse.match(/<nProt>(.*?)<\/nProt>/);
    if (match && match[1]) {
      console.log('[SEFAZ] Protocolo extraído de <nProt>:', match[1]);
      return match[1];
    }
    
    // Tentar extrair de <infProt> (formato alternativo)
    match = soapResponse.match(/<infProt[^>]*>[\s\S]*?<nProt>(.*?)<\/nProt>[\s\S]*?<\/infProt>/);
    if (match && match[1]) {
      console.log('[SEFAZ] Protocolo extraído de <infProt>:', match[1]);
      return match[1];
    }
    
    console.warn('[SEFAZ] Número do protocolo não encontrado na resposta');
    console.warn('[SEFAZ] Resposta (primeiros 1000 chars):', soapResponse.substring(0, 1000));
    return undefined;
  } catch (error) {
    console.error('[SEFAZ] Erro ao extrair protocolo:', error);
    return undefined;
  }
}

/**
 * Converte certificado PFX/P12 para PEM usando node-forge
 */
export async function convertPfxToPem(
  pfxBuffer: Buffer,
  password: string
): Promise<{ cert: string; key: string; ca: string[] }> {
  try {

    // Converter buffer para string binary
    const pfxData = pfxBuffer.toString("binary");

    // Parsear PKCS#12
    const p12 = forge.asn1.fromDer(pfxData);
    const pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12, false, password);

    // Extrair certificado e chave privada
    let cert = "";
    let key = "";

    // Buscar todos os certificados (incluindo CA chain)
    const ca: string[] = [];
    const certBags = pkcs12.getBags({ bagType: forge.pki.oids.certBag });
    if (certBags[forge.pki.oids.certBag]) {
      const bags = certBags[forge.pki.oids.certBag];
      if (bags && bags.length > 0) {
        // Primeiro certificado é o certificado do cliente
        const certificate = bags[0].cert;
        if (certificate) {
          cert = forge.pki.certificateToPem(certificate);
        }
        
        // Demais certificados são da cadeia (CA)
        for (let i = 1; i < bags.length; i++) {
          const caCert = bags[i].cert;
          if (caCert) {
            ca.push(forge.pki.certificateToPem(caCert));
          }
        }
      }
    }

    // Buscar chave privada (pode estar em keyBag ou pkcs8ShroudedKeyBag)
    let keyBags = pkcs12.getBags({ bagType: forge.pki.oids.keyBag });
    const keyBagsList = keyBags[forge.pki.oids.keyBag];
    if (keyBagsList && keyBagsList.length > 0) {
      const privateKey = keyBagsList[0].key;
      if (privateKey) {
        key = forge.pki.privateKeyToPem(privateKey);
      }
    } else {
      // Tentar pkcs8ShroudedKeyBag (mais comum em certificados brasileiros)
      keyBags = pkcs12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const shroudedKeyBagsList = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (shroudedKeyBagsList && shroudedKeyBagsList.length > 0) {
        const privateKey = shroudedKeyBagsList[0].key;
        if (privateKey) {
          key = forge.pki.privateKeyToPem(privateKey);
        }
      }
    }

    if (!cert || !key) {
      throw new Error("Certificado ou chave privada nao encontrados no arquivo PFX");
    }

    console.log(`[SEFAZ] Certificado extraído com sucesso. CA chain: ${ca.length} certificados`);
    return { cert, key, ca };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao converter certificado PFX: ${errorMsg}`);
  }
}

/**
 * Valida se a chave de acesso tem o formato correto
 */
export function validateAccessKey(accessKey: string): boolean {
  // Chave de acesso deve ter exatamente 44 dígitos
  // Remove espaços em branco e quebras de linha
  const cleaned = accessKey.trim();
  return /^[0-9]{44}$/.test(cleaned);
}

/**
 * Extrai informações da chave de acesso
 */
export function parseAccessKey(accessKey: string) {
  const cleaned = accessKey.trim();
  if (!validateAccessKey(cleaned)) {
    throw new Error("Chave de acesso invalida");
  }

  return {
    uf: cleaned.substring(0, 2),
    year: `20${cleaned.substring(2, 4)}`,
    month: cleaned.substring(4, 6),
    cnpj: cleaned.substring(6, 20),
    model: cleaned.substring(20, 22),
    series: cleaned.substring(22, 25),
    number: cleaned.substring(25, 34),
    type: cleaned.substring(34, 35),
    emitter: cleaned.substring(35, 36),
    sequence: cleaned.substring(36, 43),
    digit: cleaned.substring(43, 44),
  };
}


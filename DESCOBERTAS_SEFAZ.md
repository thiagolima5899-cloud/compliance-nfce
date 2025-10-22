# Descobertas Importantes sobre SEFAZ

## Problema Identificado

O erro **HTTP 403 Forbidden** ocorre porque as URLs que estamos usando para SEFAZ-CE estão **INCORRETAS**.

## Estados com Webservices Próprios

Segundo o Portal da NF-e (https://www.nfe.fazenda.gov.br/portal/webServices.aspx), apenas os seguintes estados têm webservices próprios:

- AM (Amazonas)
- BA (Bahia)
- GO (Goiás)
- MG (Minas Gerais)
- MS (Mato Grosso do Sul)
- MT (Mato Grosso)
- PE (Pernambuco)
- PR (Paraná)
- RS (Rio Grande do Sul)
- SP (São Paulo)

## Ceará (CE) NÃO está na lista!

**O Ceará usa SVRS (Sefaz Virtual do Rio Grande do Sul)**

### Estados que usam SVRS

Segundo a documentação:
- **Para serviço de Consulta Cadastro**: AC, ES, RN, PB, SC
- **Para demais serviços relacionados com o sistema da NF-e**: AC, AL, AP, CE, DF, ES, PA, PB, PI, RJ, RN, RO, RR, SC, SE, TO

**CEARÁ (CE) está na lista de estados que usam SVRS!**

## URLs Corretas para SVRS

### Produção
- **NfeConsultaProtocolo**: `https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx`
- **NfeStatusServico**: `https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx`

### Homologação
- **NfeConsultaProtocolo**: `https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx`
- **NfeStatusServico**: `https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx`

## Correção Necessária

Precisamos mudar de:
```
https://nfce.sefaz.ce.gov.br/nfce/services/NFeConsultaProtocolo4
```

Para:
```
https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx
```

## Observações Importantes

1. **NFC-e vs NF-e**: As chaves que temos são de NFC-e (modelo 65), mas os webservices são os mesmos da NF-e
2. **SOAP 1.2**: Manter o uso de SOAP 1.2 com Content-Type: `application/soap+xml; charset=utf-8`
3. **mTLS**: O certificado digital continua sendo necessário para autenticação
4. **Namespace**: Manter o namespace `http://www.portalfiscal.inf.br/nfe`

## Próximos Passos

1. Atualizar as URLs no arquivo `sefaz.ts` para usar SVRS
2. Testar novamente com as URLs corretas
3. Verificar se o Content-Type precisa ser ajustado para SOAP 1.1 (`text/xml`) ao invés de SOAP 1.2

